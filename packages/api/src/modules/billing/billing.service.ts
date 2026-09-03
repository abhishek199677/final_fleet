import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class BillingService {
  constructor(private db: DatabaseService) {}

  async getReceivables(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_client_receivable ORDER BY client_name`);
    return result.rows;
  }

  async getUnusedAdvances(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_unused_advances WHERE remaining_minor > 0 ORDER BY event_date`);
    return result.rows;
  }

  async getMachineContribution(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_machine_contribution ORDER BY billed_minor DESC`);
    return result.rows;
  }

  async getKPIs(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_tenant_kpis WHERE tenant_id = $1`, [tenantId]);
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
}
