import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class BillingEngineService {
  constructor(private db: DatabaseService) {}

  async getRateCards(tenantId: string, deploymentId?: string) {
    const query = deploymentId
      ? `SELECT rc.*, d.machine_id, m.code AS machine_code, s.name AS site_name, cl.name AS client_name
         FROM tenant.rate_cards rc
         JOIN tenant.deployments d ON d.id = rc.deployment_id
         JOIN tenant.machines m ON m.id = d.machine_id
         JOIN tenant.sites s ON s.id = d.site_id
         JOIN tenant.clients cl ON cl.id = s.client_id
         WHERE rc.deployment_id = $1 ORDER BY rc.effective_from DESC`
      : `SELECT rc.*, d.machine_id, m.code AS machine_code, s.name AS site_name, cl.name AS client_name
         FROM tenant.rate_cards rc
         JOIN tenant.deployments d ON d.id = rc.deployment_id
         JOIN tenant.machines m ON m.id = d.machine_id
         JOIN tenant.sites s ON s.id = d.site_id
         JOIN tenant.clients cl ON cl.id = s.client_id
         ORDER BY rc.effective_from DESC`;
    const params = deploymentId ? [deploymentId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  async createRateCard(tenantId: string, data: Record<string, unknown>, _clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.rate_cards (tenant_id, deployment_id, effective_from, strategy, rate_minor, currency, min_units_per_day, standby_rate_minor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, data.deployment_id, data.effective_from, data.strategy, data.rate_minor,
       data.currency || 'INR', data.min_units_per_day ?? 0, data.standby_rate_minor ?? null]);
    return result.rows[0];
  }

  async getExtraCharges(tenantId: string, deploymentId?: string) {
    const join = `JOIN tenant.deployments d ON d.id = ec.deployment_id
         JOIN tenant.sites s ON s.id = d.site_id
         JOIN tenant.clients cl ON cl.id = s.client_id`;
    const query = deploymentId
      ? `SELECT ec.*, cl.name AS client_name FROM tenant.extra_charges ec
         ${join}
         WHERE ec.deployment_id = $1 ORDER BY ec.date DESC`
      : `SELECT ec.*, cl.name AS client_name FROM tenant.extra_charges ec
         ${join}
         ORDER BY ec.date DESC`;
    const params = deploymentId ? [deploymentId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  async createExtraCharge(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.extra_charges (tenant_id, deployment_id, kind, date, currency, amount_minor, fx, base_minor, note, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, data.deployment_id, data.kind ?? 'other', data.date, data.currency || 'INR', data.amount_minor,
       data.fx ?? data.fx_rate ?? null, data.base_minor ?? null, data.note ?? null, userId, clientUuid]);
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
    const join = `JOIN tenant.client_money_events cme ON cme.id = ac.advance_id
         JOIN tenant.clients cl ON cl.id = cme.client_id`;
    const query = clientId
      ? `SELECT ac.*, cl.name AS client_name FROM tenant.advance_consumptions ac
         ${join}
         WHERE cme.client_id = $1 ORDER BY ac.date DESC`
      : `SELECT ac.*, cl.name AS client_name FROM tenant.advance_consumptions ac
         ${join}
         ORDER BY ac.date DESC`;
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
