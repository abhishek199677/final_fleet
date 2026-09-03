import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class BillingEngineService {
  constructor(private db: DatabaseService) {}

  async getRateCards(tenantId: string, clientId?: string) {
    const query = clientId
      ? `SELECT rc.*, cl.name AS client_name FROM tenant.rate_cards rc
         JOIN tenant.clients cl ON cl.id = rc.client_id
         WHERE rc.client_id = $1 ORDER BY rc.effective_from DESC`
      : `SELECT rc.*, cl.name AS client_name FROM tenant.rate_cards rc
         JOIN tenant.clients cl ON cl.id = rc.client_id
         ORDER BY rc.effective_from DESC`;
    const params = clientId ? [clientId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  async createRateCard(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.rate_cards (tenant_id, client_id, machine_type, strategy, rate_minor, currency, min_hours, min_charge_minor, standby_rate_minor, effective_from, effective_to, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [tenantId, data.client_id, data.machine_type, data.strategy, data.rate_minor,
       data.currency, data.min_hours, data.min_charge_minor, data.standby_rate_minor,
       data.effective_from, data.effective_to, clientUuid]);
    return result.rows[0];
  }

  async getExtraCharges(tenantId: string, deploymentId?: string) {
    const query = deploymentId
      ? `SELECT ec.*, cl.name AS client_name FROM tenant.extra_charges ec
         JOIN tenant.deployments d ON d.id = ec.deployment_id
         JOIN tenant.clients cl ON cl.id = d.client_id
         WHERE ec.deployment_id = $1 ORDER BY ec.created_at DESC`
      : `SELECT ec.*, cl.name AS client_name FROM tenant.extra_charges ec
         JOIN tenant.deployments d ON d.id = ec.deployment_id
         JOIN tenant.clients cl ON cl.id = d.client_id
         ORDER BY ec.created_at DESC`;
    const params = deploymentId ? [deploymentId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  async createExtraCharge(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.extra_charges (tenant_id, deployment_id, label, currency, amount_minor, fx_rate, base_minor, taxable, tax_rate_bps, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenantId, data.deployment_id, data.label, data.currency, data.amount_minor,
       data.fx_rate, data.base_minor, data.taxable, data.tax_rate_bps, clientUuid]);
    return result.rows[0];
  }

  async getLedger(tenantId: string, deploymentId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT bl.*, rc.strategy, rc.rate_minor
       FROM tenant.billing_ledger bl
       LEFT JOIN tenant.rate_cards rc ON rc.id = bl.rate_card_id
       WHERE bl.deployment_id = $1 ORDER BY bl.entry_date DESC`, [deploymentId]);
    return result.rows;
  }

  async getAdvanceConsumptions(tenantId: string, clientId?: string) {
    const query = clientId
      ? `SELECT ac.*, cl.name AS client_name FROM tenant.advance_consumptions ac
         JOIN tenant.clients cl ON cl.id = ac.client_id
         WHERE ac.client_id = $1 ORDER BY ac.consumed_at DESC`
      : `SELECT ac.*, cl.name AS client_name FROM tenant.advance_consumptions ac
         JOIN tenant.clients cl ON cl.id = ac.client_id
         ORDER BY ac.consumed_at DESC`;
    const params = clientId ? [clientId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  async getKPIs(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_tenant_kpis WHERE tenant_id = $1`, [tenantId]);
    return result.rows[0];
  }

  async getMachineContribution(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_machine_contribution ORDER BY billed_minor DESC`);
    return result.rows;
  }
}
