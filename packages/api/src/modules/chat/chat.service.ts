import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  // Null when no API key is configured — the service then answers with the
  // local fallback responses below instead of failing.
  private readonly openai: OpenAI | null;

  constructor(private db: DatabaseService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured — chatbot will use fallback responses');
      this.openai = null;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateResponse(tenantId: string, message: string): Promise<{ response: string; suggestedActions?: string[] }> {
    try {
      // First, try to get contextual information about the tenant to provide better responses
      const context = await this.getTenantContext(tenantId);

      // If OpenAI is not configured, use fallback responses
      if (!this.openai) {
        return this.getFallbackResponse(message, context);
      }

      // Prepare the system message with context
      const systemMessage = `You are a helpful assistant for Fleet OS, a fleet management system.
      The user is asking about their fleet operations. Keep responses concise, helpful, and professional.
      Context about their current tenant: ${JSON.stringify(context)}`;

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I encountered an error processing your request.';

      // Extract suggested actions if any (simple heuristic)
      const suggestedActions = this.extractSuggestedActions(response);

      return { response, suggestedActions };
    } catch (error) {
      this.logger.error(`Error generating chatbot response: ${error}`);
      // Fallback to simple responses on error
      return this.getFallbackResponse(message, await this.getTenantContext(tenantId));
    }
  }

  private async getTenantContext(tenantId: string): Promise<any> {
    try {
      // Get basic tenant info and some stats for context
      const [tenantInfo, machineCount, sessionCount] = await Promise.all([
        this.db.queryWithTenant(tenantId, 'owner',
          `SELECT t.name, t.slug, t.status FROM platform.tenants t WHERE t.id = $1`, [tenantId]),
        this.db.queryWithTenant(tenantId, 'owner',
          `SELECT COUNT(*) as count FROM tenant.machines WHERE tenant_id = $1`, [tenantId]),
        this.db.queryWithTenant(tenantId, 'owner',
          `SELECT COUNT(*) as count FROM tenant.work_sessions WHERE tenant_id = $1 AND is_current = true`, [tenantId])
      ]);

      return {
        tenant: tenantInfo.rows[0] || {},
        machineCount: Number(machineCount.rows[0]?.count) || 0,
        activeSessions: Number(sessionCount.rows[0]?.count) || 0,
      };
    } catch (error) {
      this.logger.warn(`Could not fetch tenant context: ${error}`);
      return {};
    }
  }

  private getFallbackResponse(message: string, context: any): { response: string; suggestedActions?: string[] } {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return {
        response: 'I can help you with fleet management questions! You can ask me about:\n• Machine status and utilization\n• Maintenance schedules\n• Fuel consumption and costs\n• Billing and invoicing\n• Operator assignments\n• Reports and analytics\n\nWhat would you like to know about your fleet?',
        suggestedActions: ['Show machine status', 'View maintenance tasks', 'Check fuel reports']
      };
    }

    if (lowerMessage.includes('machine') || lowerMessage.includes('equipment')) {
      return {
        response: `You have ${context.machineCount || 0} machines in your fleet. Would you like to see their current status, utilization rates, or maintenance schedules?`,
        suggestedActions: ['View all machines', 'Check machine utilization', 'See maintenance calendar']
      };
    }

    if (lowerMessage.includes('fuel') || lowerMessage.includes('cost')) {
      return {
        response: 'I can help you analyze fuel consumption and costs. Would you like to see:\n• Fuel usage by machine\n• Cost per hour/mile\n• Fuel efficiency trends\n• Anomalies in fuel consumption?',
        suggestedActions: ['View fuel reports', 'Check fuel efficiency', 'See cost analysis']
      };
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('service')) {
      return {
        response: 'Maintenance is crucial for fleet longevity. I can help you with:\n• Upcoming maintenance schedules\n• Overdue maintenance tasks\n• Maintenance history and costs\n• Preventive maintenance recommendations',
        suggestedActions: ['View maintenance schedule', 'Check overdue tasks', 'See maintenance history']
      };
    }

    if (lowerMessage.includes('report') || lowerMessage.includes('analytics')) {
      return {
        response: 'I can generate various reports for your fleet:\n• Utilization reports\n• Cost analysis\n• Maintenance summaries\n• Operator performance\n• Fuel efficiency trends\n\nWhat type of report would you like to see?',
        suggestedActions: ['Utilization report', 'Cost analysis', 'Maintenance summary']
      };
    }

    // Default response
    return {
      response: 'Hello! I\'m your Fleet OS assistant. I can help you with questions about your fleet management, machines, maintenance, fuel usage, billing, and more. What would you like to know about your fleet today?',
      suggestedActions: ['Show fleet overview', 'Check machine status', 'View recent activity']
    };
  }

  private extractSuggestedActions(response: string): string[] {
    // Simple extraction of suggested actions from response
    const actions = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines that suggest actions (contain words like "view", "check", "see", etc.)
      if (trimmed.match(/(view|check|see|show|get)\s+/i)) {
        // Clean up the line to make it a nice button label
        const cleanLine = trimmed.replace(/^[\-\*\•]\s*/, '').replace(/[\.\:]\s*$/, '');
        if (cleanLine.length > 0 && cleanLine.length < 100) {
          actions.push(cleanLine);
        }
      }
    }

    // Limit to 3 suggested actions
    return actions.slice(0, 3);
  }
}