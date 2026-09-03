import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface BillingInput {
  deployment_id: string;
  work_session_id?: string;
  period_start: string;
  period_end: string;
}

export interface BillingResult {
  entries: {
    deployment_id: string;
    kind: string;
    label: string;
    amount_minor: number;
    currency: string;
    rate_card_id?: string;
  }[];
  total_minor: number;
}

@Injectable()
export class BillingEngine {
  private readonly logger = new Logger(BillingEngine.name);

  constructor(private db: DatabaseService) {}

  async calculateBilling(tenantId: string, input: BillingInput): Promise<BillingResult> {
    this.logger.log(`Calculating billing for deployment ${input.deployment_id}`);

    // Get deployment details
    const deployment = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT d.*, m.type AS machine_type, cl.currency
       FROM tenant.deployments d
       JOIN tenant.machines m ON m.id = d.machine_id
       JOIN tenant.clients cl ON cl.id = d.client_id
       WHERE d.id = $1`,
      [input.deployment_id]);

    if (deployment.rows.length === 0) {
      throw new Error('Deployment not found');
    }

    const dep = deployment.rows[0];

    // Find applicable rate card
    const rateCard = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.rate_cards
       WHERE client_id = $1
       AND machine_type = $2
       AND effective_from <= $3
       AND (effective_to IS NULL OR effective_to >= $3)
       ORDER BY effective_from DESC LIMIT 1`,
      [dep.client_id, dep.machine_type, input.period_end]);

    const entries: BillingResult['entries'] = [];
    let total_minor = 0;

    if (rateCard.rows.length > 0) {
      const rc = rateCard.rows[0];
      const hours = await this.getHoursWorked(tenantId, input.deployment_id, input.period_start, input.period_end);

      switch (rc.strategy) {
        case 'hourly': {
          const amount = Math.max(hours * rc.rate_minor, rc.min_charge_minor || 0);
          entries.push({
            deployment_id: input.deployment_id,
            kind: 'work',
            label: `Hourly billing: ${hours}h × $${rc.rate_minor / 100}`,
            amount_minor: amount,
            currency: dep.currency,
            rate_card_id: rc.id,
          });
          total_minor += amount;
          break;
        }
        case 'daily': {
          const days = Math.ceil(hours / 8);
          const amount = days * rc.rate_minor;
          entries.push({
            deployment_id: input.deployment_id,
            kind: 'work',
            label: `Daily billing: ${days} days × $${rc.rate_minor / 100}`,
            amount_minor: amount,
            currency: dep.currency,
            rate_card_id: rc.id,
          });
          total_minor += amount;
          break;
        }
        case 'monthly': {
          entries.push({
            deployment_id: input.deployment_id,
            kind: 'monthly_hire',
            label: `Monthly hire: $${rc.rate_minor / 100}`,
            amount_minor: rc.rate_minor,
            currency: dep.currency,
            rate_card_id: rc.id,
          });
          total_minor += rc.rate_minor;
          break;
        }
        case 'standby': {
          // Standby rate when machine is not working
          const standbyHours = await this.getStandbyHours(tenantId, input.deployment_id, input.period_start, input.period_end);
          if (standbyHours > 0 && rc.standby_rate_minor) {
            const amount = standbyHours * rc.standby_rate_minor;
            entries.push({
              deployment_id: input.deployment_id,
              kind: 'standby',
              label: `Standby: ${standbyHours}h × $${rc.standby_rate_minor / 100}`,
              amount_minor: amount,
              currency: dep.currency,
              rate_card_id: rc.id,
            });
            total_minor += amount;
          }
          break;
        }
      }

      // Check minimum top-up
      if (rc.min_charge_minor && total_minor < rc.min_charge_minor) {
        const topUp = rc.min_charge_minor - total_minor;
        entries.push({
          deployment_id: input.deployment_id,
          kind: 'minimum_topup',
          label: `Minimum top-up: $${topUp / 100}`,
          amount_minor: topUp,
          currency: dep.currency,
          rate_card_id: rc.id,
        });
        total_minor += topUp;
      }
    }

    // Add extra charges
    const extras = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.extra_charges
       WHERE deployment_id = $1
       AND created_at >= $2 AND created_at <= $3
       AND is_current = true`,
      [input.deployment_id, input.period_start, input.period_end]);

    for (const extra of extras.rows) {
      let amount = extra.amount_minor;
      if (extra.taxable && extra.tax_rate_bps) {
        amount += Math.round(extra.amount_minor * extra.tax_rate_bps / 10000);
      }
      entries.push({
        deployment_id: input.deployment_id,
        kind: 'extra_charge',
        label: extra.label,
        amount_minor: amount,
        currency: dep.currency,
      });
      total_minor += amount;
    }

    return { entries, total_minor };
  }

  async postBilling(tenantId: string, result: BillingResult, periodEnd: string): Promise<void> {
    this.logger.log(`Posting ${result.entries.length} billing entries`);

    for (const entry of result.entries) {
      await this.db.queryWithTenant(tenantId, 'owner',
        `INSERT INTO tenant.billing_ledger (tenant_id, deployment_id, entry_date, kind, label, amount_minor, currency, rate_card_id, client_uuid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, gen_random_uuid())`,
        [tenantId, entry.deployment_id, periodEnd, entry.kind, entry.label,
         entry.amount_minor, entry.currency, entry.rate_card_id]);
    }

    // Process advance consumptions if any
    await this.processAdvanceConsumptions(tenantId, result);
  }

  private async getHoursWorked(tenantId: string, deploymentId: string, start: string, end: string): Promise<number> {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_at, NOW()) - start_at)) / 3600), 0) AS hours
       FROM tenant.work_sessions
       WHERE deployment_id = $1
       AND start_at >= $2 AND start_at <= $3
       AND is_current = true`,
      [deploymentId, start, end]);
    return parseFloat(result.rows[0]?.hours || '0');
  }

  private async getStandbyHours(tenantId: string, deploymentId: string, start: string, end: string): Promise<number> {
    // Hours in period minus hours worked
    const totalHours = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
    const workedHours = await this.getHoursWorked(tenantId, deploymentId, start, end);
    return Math.max(0, totalHours - workedHours);
  }

  private async processAdvanceConsumptions(tenantId: string, result: BillingResult): Promise<void> {
    // Find unused advances for this client
    const advances = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT cme.id, cme.amount_minor,
        COALESCE((SELECT SUM(ac.base_minor) FROM tenant.advance_consumptions ac WHERE ac.advance_id = cme.id), 0) AS consumed
       FROM tenant.client_money_events cme
       WHERE cme.event_type = 'advance' AND cme.is_current = true
       AND cme.amount_minor > COALESCE((SELECT SUM(ac.base_minor) FROM tenant.advance_consumptions ac WHERE ac.advance_id = cme.id), 0)
       ORDER BY cme.event_date`);

    let remaining = result.total_minor;
    for (const advance of advances.rows) {
      if (remaining <= 0) break;
      const available = advance.amount_minor - advance.consumed;
      const toConsume = Math.min(available, remaining);

      await this.db.queryWithTenant(tenantId, 'owner',
        `INSERT INTO tenant.advance_consumptions (tenant_id, advance_id, deployment_id, base_minor, client_uuid)
         VALUES ($1, $2, $3, $4, gen_random_uuid())`,
        [tenantId, advance.id, result.entries[0]?.deployment_id, toConsume]);

      remaining -= toConsume;
    }
  }
}
