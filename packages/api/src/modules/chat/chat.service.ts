import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import OpenAI from 'openai';

interface MachineFact {
  code: string;
  type: string;
  make: string | null;
  model: string | null;
  status: string | null;
}

/**
 * Numbers read live from the tenant database. A field left `undefined` means
 * "could not be read" — never "zero". Anything the bot states as a fact has to
 * come from here, so a failed query can never be reported as an empty fleet.
 */
interface TenantContext {
  tenantName?: string;
  machineCount?: number;
  machines?: MachineFact[];
  activeSessions?: number;
  clientCount?: number;
  operatorCount?: number;
  siteCount?: number;
  problems?: string[];
}

export interface ChatReply {
  response: string;
  suggestedActions?: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  // Null when no API key is configured — the service then answers with the
  // local fallback responses below instead of failing.
  private readonly openai: OpenAI | null;
  private warnedAboutCredits = false;

  constructor(private db: DatabaseService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured — chatbot will use fallback responses');
      this.openai = null;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateResponse(tenantId: string, message: string): Promise<ChatReply> {
    // Context collection never throws: each query fails independently.
    const context = await this.getTenantContext(tenantId);

    // 1. Counts and listings are facts, so answer them straight from the
    //    database. This keeps the bot truthful even when the LLM is down,
    //    out of credit, or tempted to round a number it does not know.
    const factAnswer = this.getFactAnswer(message, context);
    if (factAnswer) return factAnswer;

    // 2. Everything else goes to the model, with the same facts attached.
    if (!this.openai) {
      return this.getFallbackResponse(message, context);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.buildSystemMessage(context) },
          { role: 'user', content: message },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const response =
        completion.choices[0]?.message?.content ||
        'I apologize, but I encountered an error processing your request.';

      return { response, suggestedActions: this.extractSuggestedActions(response) };
    } catch (error) {
      this.logLlmError(error);
      return this.getFallbackResponse(message, context);
    }
  }

  /* ─── Facts ─────────────────────────────────────────────────────────── */

  /**
   * Every read runs on its own: `platform.tenants` is not granted to
   * app_owner, and a single rejected query inside Promise.all used to discard
   * the machine count that had already been fetched — which is how the bot
   * ended up reporting "0 machines" for a tenant that owns EXC-01.
   */
  private async getTenantContext(tenantId: string): Promise<TenantContext> {
    const ctx: TenantContext = {};
    const problems: string[] = [];

    const safe = async <T>(
      label: string,
      run: () => Promise<T>,
      assign: (value: T) => void,
    ): Promise<void> => {
      try {
        assign(await run());
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        problems.push(`${label}: ${detail}`);
        this.logger.warn(`Chat context — ${label} unavailable: ${detail}`);
      }
    };

    const count = async (table: 'machines' | 'clients' | 'operators' | 'sites'): Promise<number> => {
      const result = await this.db.queryWithTenant(
        tenantId,
        'owner',
        `SELECT COUNT(*)::int AS count FROM tenant.${table} WHERE tenant_id = $1`,
        [tenantId],
      );
      const row = result.rows[0] as { count?: number } | undefined;
      return Number(row?.count ?? 0);
    };

    await Promise.all([
      // platform.tenants is granted to app_platform only, so use that pool.
      safe(
        'tenantName',
        async () => {
          const result = await this.db.query(
            'platform',
            'SELECT name FROM platform.tenants WHERE id = $1',
            [tenantId],
          );
          const row = result.rows[0] as { name?: string } | undefined;
          return row?.name;
        },
        (value) => {
          ctx.tenantName = value;
        },
      ),
      safe('machineCount', () => count('machines'), (value) => {
        ctx.machineCount = value;
      }),
      safe(
        'machines',
        async () => {
          const result = await this.db.queryWithTenant(
            tenantId,
            'owner',
            `SELECT code, type, make, model, status_flag AS status
               FROM tenant.machines
              WHERE tenant_id = $1
              ORDER BY code
              LIMIT 50`,
            [tenantId],
          );
          return result.rows as MachineFact[];
        },
        (value) => {
          ctx.machines = value;
        },
      ),
      safe(
        'activeSessions',
        async () => {
          const result = await this.db.queryWithTenant(
            tenantId,
            'owner',
            `SELECT COUNT(*)::int AS count FROM tenant.work_sessions
              WHERE tenant_id = $1 AND is_current = true`,
            [tenantId],
          );
          const row = result.rows[0] as { count?: number } | undefined;
          return Number(row?.count ?? 0);
        },
        (value) => {
          ctx.activeSessions = value;
        },
      ),
      safe('clientCount', () => count('clients'), (value) => {
        ctx.clientCount = value;
      }),
      safe('operatorCount', () => count('operators'), (value) => {
        ctx.operatorCount = value;
      }),
      safe('siteCount', () => count('sites'), (value) => {
        ctx.siteCount = value;
      }),
    ]);

    if (problems.length > 0) ctx.problems = problems;
    return ctx;
  }

  private machineLabel(machine: MachineFact): string {
    const spec = [machine.make, machine.model].filter(Boolean).join(' ');
    const label = [spec, machine.type].filter(Boolean).join(' ');
    const status = machine.status ? ` (${machine.status})` : '';
    return `${label || 'Machine'}${status}`;
  }

  /**
   * Narrow, database-backed answers for the questions the bot used to get
   * wrong: how many machines exist, and which ones. Returns null when the
   * question needs real analysis, so it falls through to the model.
   */
  private getFactAnswer(message: string, context: TenantContext): ChatReply | null {
    const q = message.toLowerCase();

    // Questions needing analysis (fuel per site, overdue service, …) are not
    // answerable with a bare total — leave them to the model/fallback.
    if (
      /\b(maintenance|service|fuel|battery|breakdown|fault|broken|overdue|due|utili[sz]ation|revenue|cost|hire|rental)\b/.test(
        q,
      )
    ) {
      return null;
    }

    const asksCount = /\bhow many\b|\bnumber of\b|\bcount\b|\btotal\b|\bregistered\b/.test(q);
    const asksList = /\blist\b|\ball machines\b|\bwhat machines\b|\bwhich machines\b|\bview all\b|\bshow all\b/.test(q);
    if (!asksCount && !asksList) return null;

    const topics = [
      {
        pattern: /\b(machine|machines|equipment|excavator|excavators)\b/,
        name: 'machines',
        read: (c: TenantContext): number | undefined => c.machineCount,
        singular: 'machine',
        plural: 'machines',
        screen: 'Manage → Machines',
      },
      {
        pattern: /\b(operator|operators|driver|drivers)\b/,
        name: 'operators',
        read: (c: TenantContext): number | undefined => c.operatorCount,
        singular: 'operator',
        plural: 'operators',
        screen: 'Manage → Operators',
      },
      {
        pattern: /\b(site|sites|yard|yards)\b/,
        name: 'sites',
        read: (c: TenantContext): number | undefined => c.siteCount,
        singular: 'site',
        plural: 'sites',
        screen: 'Manage → Sites',
      },
      {
        pattern: /\b(client|clients|customer|customers)\b/,
        name: 'clients',
        read: (c: TenantContext): number | undefined => c.clientCount,
        singular: 'client',
        plural: 'clients',
        screen: 'Manage → Clients',
      },
    ];

    const matched = topics.filter((topic) => topic.pattern.test(q));
    // "How many machines are at this site" mentions two topics and needs a
    // filtered query we don't run — refuse to answer rather than guess.
    if (matched.length > 1) return null;
    if (matched.length === 0) {
      // "How big is my fleet" with no other noun counts machines.
      if (!/\bfleet\b/.test(q) || !asksCount) return null;
      matched.push(topics[0]);
    }
    const topic = matched[0];

    if (topic.name === 'machines') {
      return this.getMachineAnswer(asksList, context);
    }

    const total = topic.read(context);
    if (total === undefined) {
      return {
        response: `I couldn't read your ${topic.plural} from the database just now, so I won't guess a number. Please try again in a moment, or open ${topic.screen} in the sidebar.`,
        suggestedActions: ['Try again'],
      };
    }

    const noun = total === 1 ? topic.singular : topic.plural;
    return {
      response: `You have ${total} ${noun} registered in Fleet OS.\n\nOpen ${topic.screen} in the sidebar to see the full list.`,
      suggestedActions: [`View all ${topic.plural}`, 'Show fleet overview'],
    };
  }

  /** Count + roster of machines, straight from the database. */
  private getMachineAnswer(asksList: boolean, context: TenantContext): ChatReply {
    if (context.machineCount === undefined) {
      return {
        response:
          "I couldn't read your machine list from the database just now, so I won't guess a number. Please try again in a moment, or open Machines in the sidebar to see them yourself.",
        suggestedActions: ['Try again'],
      };
    }

    const total = context.machineCount;
    const machines = (context.machines ?? []).slice(0, 10);

    if (total === 0) {
      return {
        response:
          'You have no machines registered in Fleet OS yet. Add the first one from Machines → New Machine.',
        suggestedActions: ['Add your first machine', 'Invite an operator', 'Create a site'],
      };
    }

    const head =
      total === 1
        ? 'You have 1 machine registered in Fleet OS:'
        : `You have ${total} machines registered in Fleet OS:`;
    const lines = machines.map((m) => `• ${m.code} — ${this.machineLabel(m)}`);
    const overflow = total > machines.length ? `\n…and ${total - machines.length} more.` : '';
    const tail =
      asksList || total > machines.length
        ? '\n\nOpen Manage → Machines in the sidebar for the full list with status, utilization and maintenance.'
        : '\n\nWant its status, utilization or maintenance schedule?';

    return {
      response: [head, ...lines].join('\n') + overflow + tail,
      suggestedActions: [
        'View all machines',
        'Check machine utilization',
        'See maintenance calendar',
      ],
    };
  }

  private buildSystemMessage(context: TenantContext): string {
    return [
      "You are the Fleet OS assistant inside a fleet-management dashboard. Answer concisely, professionally and honestly.",
      'You are given FACTS read live from this tenant\'s database. Rules:',
      '- Only state numbers or names that appear in the FACTS. Never invent counts, machines, dates or statuses.',
      "- If the FACTS don't cover the question, say you don't have that data yet and point to the relevant screen in the app.",
      '- Machine counts must match the FACTS exactly (including "no machines yet" when the count is 0).',
      '',
      'FACTS:',
      this.factsSummary(context),
    ].join('\n');
  }

  private factsSummary(context: TenantContext): string {
    const orUnavailable = (value: number | undefined): string =>
      value === undefined ? 'unavailable (could not be read)' : String(value);

    const lines: string[] = [
      `Tenant: ${context.tenantName ?? 'unavailable'}`,
      `Machines registered: ${orUnavailable(context.machineCount)}`,
    ];

    if (context.machines && context.machines.length > 0) {
      lines.push('Machines:');
      for (const machine of context.machines.slice(0, 20)) {
        lines.push(`- ${machine.code}: ${this.machineLabel(machine)}`);
      }
    }

    lines.push(
      `Active work sessions: ${orUnavailable(context.activeSessions)}`,
      `Operators: ${orUnavailable(context.operatorCount)}`,
      `Sites: ${orUnavailable(context.siteCount)}`,
      `Clients: ${orUnavailable(context.clientCount)}`,
    );

    if (context.problems && context.problems.length > 0) {
      lines.push(`Unreadable right now: ${context.problems.join('; ')}`);
    }

    return lines.join('\n');
  }

  private logLlmError(error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    if (detail.includes('429') || /no credits remaining/i.test(detail)) {
      if (!this.warnedAboutCredits) {
        this.warnedAboutCredits = true;
        this.logger.error(
          `OpenAI has no credits left (${detail}). Falling back to database-backed answers until billing is topped up.`,
        );
      } else {
        this.logger.warn('OpenAI 429 — falling back to database-backed answers.');
      }
      return;
    }
    this.logger.error(`Error generating chatbot response: ${detail}`);
  }

  /* ─── Fallback (LLM unavailable) ────────────────────────────────────── */

  private getFallbackResponse(message: string, context: TenantContext): ChatReply {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return {
        response:
          'I can help you with fleet management questions! You can ask me about:\n• Machine status and utilization\n• Maintenance schedules\n• Fuel consumption and costs\n• Billing and invoicing\n• Operator assignments\n• Reports and analytics\n\nWhat would you like to know about your fleet?',
        suggestedActions: ['Show machine status', 'View maintenance tasks', 'Check fuel reports'],
      };
    }

    if (lowerMessage.includes('machine') || lowerMessage.includes('equipment')) {
      // Delegates to the same database-backed wording as getFactAnswer.
      const described = this.describeFleet(context);
      if (described) return described;
    }

    if (lowerMessage.includes('fuel') || lowerMessage.includes('cost')) {
      return {
        response:
          'I can help you analyze fuel consumption and costs. Would you like to see:\n• Fuel usage by machine\n• Cost per hour/mile\n• Fuel efficiency trends\n• Anomalies in fuel consumption?',
        suggestedActions: ['View fuel reports', 'Check fuel efficiency', 'See cost analysis'],
      };
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('service')) {
      return {
        response:
          'Maintenance is crucial for fleet longevity. I can help you with:\n• Upcoming maintenance schedules\n• Overdue maintenance tasks\n• Maintenance history and costs\n• Preventive maintenance recommendations',
        suggestedActions: ['View maintenance schedule', 'Check overdue tasks', 'See maintenance history'],
      };
    }

    if (lowerMessage.includes('report') || lowerMessage.includes('analytics')) {
      return {
        response:
          'I can generate various reports for your fleet:\n• Utilization reports\n• Cost analysis\n• Maintenance summaries\n• Operator performance\n• Fuel efficiency trends\n\nWhat type of report would you like to see?',
        suggestedActions: ['Utilization report', 'Cost analysis', 'Maintenance summary'],
      };
    }

    return {
      response:
        "Hello! I'm your Fleet OS assistant. I can help you with questions about your fleet management, machines, maintenance, fuel usage, billing, and more. What would you like to know about your fleet today?",
      suggestedActions: ['Show fleet overview', 'Check machine status', 'View recent activity'],
    };
  }

  /** Short fleet description used by the fallback path; null if unreadable. */
  private describeFleet(context: TenantContext): ChatReply | null {
    if (context.machineCount === undefined) {
      return {
        response:
          "I couldn't read your machine list from the database just now, so I won't guess. Please try again in a moment, or open Machines in the sidebar.",
        suggestedActions: ['Try again'],
      };
    }

    if (context.machineCount === 0) {
      return {
        response:
          'You have no machines registered in Fleet OS yet. Add the first one from Machines → New Machine.',
        suggestedActions: ['Add your first machine'],
      };
    }

    const machines = (context.machines ?? []).slice(0, 10);
    const lines = machines.map((m) => `• ${m.code} — ${this.machineLabel(m)}`);
    const total = context.machineCount;
    const plural = total === 1 ? 'machine' : 'machines';
    const overflow = total > machines.length ? `\n…and ${total - machines.length} more.` : '';

    return {
      response:
        `You have ${total} ${plural} registered in Fleet OS:\n` +
        lines.join('\n') +
        overflow +
        '\n\nWhat would you like to know about them — status, utilization or maintenance?',
      suggestedActions: ['View all machines', 'Check machine utilization', 'See maintenance calendar'],
    };
  }

  private extractSuggestedActions(response: string): string[] {
    const actions: string[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines that suggest actions (contain words like "view", "check", "see", etc.)
      if (trimmed.match(/(view|check|see|show|get)\s+/i)) {
        const cleanLine = trimmed.replace(/^[-*•]\s*/, '').replace(/[.:]\s*$/, '');
        if (cleanLine.length > 0 && cleanLine.length < 100) {
          actions.push(cleanLine);
        }
      }
    }

    // Limit to 3 suggested actions
    return actions.slice(0, 3);
  }
}
