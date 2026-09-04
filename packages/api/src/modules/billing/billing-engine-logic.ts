import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface BillingInput {
  deployment_id: string;
  work_session_id?: string;
  period_start: string;
  period_end: string;
}

interface LedgerEntry {
  deployment_id: string;
  work_session_id?: string;
  rate_card_id?: string;
  entry_date: string;
  kind: 'work' | 'minimum_topup' | 'standby' | 'monthly_hire' | 'extra_charge' | 'adjustment';
  units: number;
  currency: string;
  amount_minor: number;
}

export interface BillingResult {
  entries: LedgerEntry[];
  total_minor: number;
}

interface DayUnits {
  day: string;
  units: number;
  billableSessions: number;
}

/**
 * Billing engine v1 (TSD §5, BIL-01/02).
 * - Hourly: units × rate per day; minimum_topup entry for the min_units shortfall.
 * - Daily fixed: one work entry per day with ≥ 1 billable session.
 * - Monthly hire: prorated by days deployed in the period month.
 * - Standby: one standby entry per day with no billable session (if configured).
 * - Extra charges copied as extra_charge entries on their date.
 * - Same-currency v1: fx = 1, base_minor = amount_minor.
 */
@Injectable()
export class BillingEngine {
  private readonly logger = new Logger(BillingEngine.name);

  constructor(private db: DatabaseService) {}

  async calculateBilling(tenantId: string, input: BillingInput): Promise<BillingResult> {
    this.logger.log(`Calculating billing for deployment ${input.deployment_id}`);

    const depRes = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT d.*, s.client_id
       FROM tenant.deployments d
       JOIN tenant.sites s ON s.id = d.site_id
       WHERE d.id = $1`,
      [input.deployment_id]);
    if (depRes.rows.length === 0) throw new Error('Deployment not found');
    const dep = depRes.rows[0];

    // Latest rate card effective on period end (rate changes = new dated version).
    const rcRes = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.rate_cards
       WHERE deployment_id = $1 AND effective_from <= $2
       ORDER BY effective_from DESC LIMIT 1`,
      [input.deployment_id, input.period_end]);

    const entries: LedgerEntry[] = [];
    let total_minor = 0;
    const push = (e: LedgerEntry) => {
      e.amount_minor = Math.round(e.amount_minor);
      entries.push(e);
      total_minor += e.amount_minor;
    };

    if (rcRes.rows.length > 0) {
      const rc = rcRes.rows[0];
      const currency = rc.currency as string;
      const minUnits = Number(rc.min_units_per_day ?? 0);
      const days = await this.getDailyUnits(tenantId, input.deployment_id, input.period_start, input.period_end);

      if (rc.strategy === 'hourly') {
        for (const d of days) {
          if (d.billableSessions === 0 && d.units === 0) {
            if (rc.standby_rate_minor) {
              push({ deployment_id: input.deployment_id, rate_card_id: rc.id, entry_date: d.day, kind: 'standby', units: 1, currency, amount_minor: Number(rc.standby_rate_minor) });
            }
            continue;
          }
          const billable = Math.max(d.units, minUnits);
          push({ deployment_id: input.deployment_id, rate_card_id: rc.id, entry_date: d.day, kind: 'work', units: billable, currency, amount_minor: billable * Number(rc.rate_minor) });
          if (d.units < minUnits) {
            push({ deployment_id: input.deployment_id, rate_card_id: rc.id, entry_date: d.day, kind: 'minimum_topup', units: minUnits - d.units, currency, amount_minor: (minUnits - d.units) * Number(rc.rate_minor) });
          }
        }
      } else if (rc.strategy === 'daily') {
        for (const d of days) {
          if (d.billableSessions > 0) {
            push({ deployment_id: input.deployment_id, rate_card_id: rc.id, entry_date: d.day, kind: 'work', units: 1, currency, amount_minor: Number(rc.rate_minor) });
          } else if (rc.standby_rate_minor) {
            push({ deployment_id: input.deployment_id, rate_card_id: rc.id, entry_date: d.day, kind: 'standby', units: 1, currency, amount_minor: Number(rc.standby_rate_minor) });
          }
        }
      } else if (rc.strategy === 'monthly') {
        const start = new Date(input.period_start);
        const end = new Date(input.period_end);
        const monthEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        const daysInMonth = monthEnd.getDate();
        const depStart = new Date(dep.start_date);
        const depEnd = dep.end_date ? new Date(dep.end_date) : end;
        const overlapDays = Math.max(0, Math.round((Math.min(end.getTime(), depEnd.getTime()) - Math.max(start.getTime(), depStart.getTime())) / 86_400_000) + 1);
        const amount = (overlapDays / daysInMonth) * Number(rc.rate_minor);
        push({ deployment_id: input.deployment_id, rate_card_id: rc.id, entry_date: input.period_end, kind: 'monthly_hire', units: overlapDays, currency, amount_minor: amount });
      }
    }

    // Extra charges copied into the ledger on their date.
    const extras = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.extra_charges
       WHERE deployment_id = $1 AND date >= $2 AND date <= $3 AND is_current = true`,
      [input.deployment_id, input.period_start, input.period_end]);
    for (const extra of extras.rows) {
      push({
        deployment_id: input.deployment_id,
        entry_date: extra.date,
        kind: 'extra_charge',
        units: 1,
        currency: extra.currency,
        amount_minor: Number(extra.base_minor ?? extra.amount_minor),
      });
    }

    return { entries, total_minor };
  }

  /**
   * Idempotent posting (TSD §5): recomputation never mutates. The day's
   * computed work total is netted against what is already posted and the
   * difference lands as a single `adjustment` entry referencing the original.
   * Extra charges post once per (day, amount).
   */
  async postBilling(tenantId: string, result: BillingResult): Promise<void> {
    const byDay = new Map<string, { work: LedgerEntry[]; extras: LedgerEntry[] }>();
    for (const entry of result.entries) {
      if (!byDay.has(entry.entry_date)) byDay.set(entry.entry_date, { work: [], extras: [] });
      const bucket = byDay.get(entry.entry_date)!;
      if (entry.kind === 'extra_charge') bucket.extras.push(entry);
      else bucket.work.push(entry);
    }

    for (const [day, bucket] of byDay) {
      const deploymentId = bucket.work[0]?.deployment_id ?? bucket.extras[0]?.deployment_id;
      if (!deploymentId) continue;
      const existing = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT id, kind, amount_minor FROM tenant.billing_ledger
         WHERE deployment_id = $1 AND entry_date = $2 AND kind != 'adjustment'`,
        [deploymentId, day]);

      const postedWork = existing.rows
        .filter((r) => r.kind !== 'extra_charge')
        .reduce((a, r) => a + Number(r.amount_minor), 0);
      const computedWork = bucket.work.reduce((a, e) => a + e.amount_minor, 0);
      const delta = Math.round(computedWork - postedWork);
      const hasWork = existing.rows.some((r) => r.kind !== 'extra_charge');
      const firstId = existing.rows.find((r) => r.kind !== 'extra_charge')?.id ?? null;

      if (!hasWork) {
        // First run for this day: post the computed work entries directly.
        for (const entry of bucket.work) {
          const inserted = await this.db.queryWithTenant(tenantId, 'owner',
            `INSERT INTO tenant.billing_ledger (tenant_id, deployment_id, work_session_id, rate_card_id, entry_date, kind, units, currency, amount_minor, fx, base_minor)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$9) RETURNING id`,
            [tenantId, entry.deployment_id, entry.work_session_id ?? null, entry.rate_card_id ?? null,
             entry.entry_date, entry.kind, entry.units, entry.currency, entry.amount_minor]);
          if (entry.amount_minor > 0) await this.consumeAdvances(tenantId, entry.deployment_id, inserted.rows[0].id as string, entry.amount_minor);
        }
      } else if (delta !== 0 && bucket.work.length > 0) {
        // Recompute: net the difference as a single adjustment referencing the original.
        const ref = bucket.work[0];
        const inserted = await this.db.queryWithTenant(tenantId, 'owner',
          `INSERT INTO tenant.billing_ledger (tenant_id, deployment_id, rate_card_id, entry_date, kind, units, currency, amount_minor, fx, base_minor, adjusts_id)
           VALUES ($1,$2,$3,$4,'adjustment',1,$5,$6,1,$6,$7) RETURNING id`,
          [tenantId, deploymentId, ref.rate_card_id ?? null, day, ref.currency, delta, firstId]);
        if (delta > 0) await this.consumeAdvances(tenantId, deploymentId, inserted.rows[0].id as string, delta);
      }

      const postedExtras = new Set(
        existing.rows.filter((r) => r.kind === 'extra_charge').map((r) => Number(r.amount_minor)),
      );
      for (const entry of bucket.extras) {
        if (postedExtras.has(entry.amount_minor)) continue;
        await this.db.queryWithTenant(tenantId, 'owner',
          `INSERT INTO tenant.billing_ledger (tenant_id, deployment_id, entry_date, kind, units, currency, amount_minor, fx, base_minor)
           VALUES ($1,$2,$3,'extra_charge',1,$4,$5,1,$5)`,
          [tenantId, entry.deployment_id, entry.entry_date, entry.currency, entry.amount_minor]);
        postedExtras.add(entry.amount_minor);
      }
    }
    this.logger.log(`Posted billing for ${byDay.size} day(s)`);
  }

  /** Consume the deployment client's oldest unused advances first (BIL-05). */
  private async consumeAdvances(tenantId: string, deploymentId: string, ledgerId: string, amount: number): Promise<void> {
    let remaining = amount;
    const advances = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT cme.id, cme.amount_minor,
         COALESCE((SELECT SUM(ac.base_minor) FROM tenant.advance_consumptions ac WHERE ac.advance_id = cme.id), 0) AS consumed
       FROM tenant.client_money_events cme
       JOIN tenant.deployments d ON d.id = $1
       JOIN tenant.sites s ON s.id = d.site_id
       WHERE cme.client_id = s.client_id AND cme.event_type = 'advance' AND cme.is_current = true
       ORDER BY cme.event_date`,
      [deploymentId]);
    const today = new Date().toISOString().slice(0, 10);
    for (const advance of advances.rows) {
      if (remaining <= 0) break;
      const available = Number(advance.amount_minor) - Number(advance.consumed);
      const toConsume = Math.min(available, remaining);
      if (toConsume <= 0) continue;
      await this.db.queryWithTenant(tenantId, 'owner',
        `INSERT INTO tenant.advance_consumptions (advance_id, billing_ledger_id, base_minor, date)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [advance.id, ledgerId, Math.round(toConsume), today]);
      remaining -= toConsume;
    }
  }

  private async getDailyUnits(tenantId: string, deploymentId: string, start: string, end: string): Promise<DayUnits[]> {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT DATE(start_at) AS day,
         COALESCE(SUM(units_run), 0) AS units,
         COUNT(*) FILTER (WHERE billable = true) AS billable_sessions
       FROM tenant.work_sessions
       WHERE deployment_id = $1 AND start_at >= $2::date AND start_at < ($3::date + INTERVAL '1 day')
         AND is_current = true
       GROUP BY DATE(start_at) ORDER BY day`,
      [deploymentId, start, end]);
    // pg returns DATE columns as JS Dates — normalise keys to YYYY-MM-DD.
    const toDay = (v: unknown): string => new Date(v as string).toISOString().slice(0, 10);
    const byDay = new Map(result.rows.map((r) => [toDay(r.day), r]));
    const out: DayUnits[] = [];
    const cursor = new Date(`${start}T00:00:00Z`);
    const last = new Date(`${end}T00:00:00Z`);
    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      const row = byDay.get(key);
      out.push({ day: key, units: Number(row?.units ?? 0), billableSessions: Number(row?.billable_sessions ?? 0) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
  }
}
