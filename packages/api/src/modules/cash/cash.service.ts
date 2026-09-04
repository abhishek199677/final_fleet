import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class CashService {
  constructor(private db: DatabaseService) {}

  async getAccounts(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.cash_accounts ORDER BY name`);
    return result.rows;
  }

  /** Expected balance, last count and variance per account (CSH-04, owner only). */
  async getExpected(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_cash_expected ORDER BY account_name`);
    return result.rows;
  }

  async getTransfers(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ct.*, fa.name AS from_name, ta.name AS to_name
       FROM tenant.cash_transfers ct
       LEFT JOIN tenant.cash_accounts fa ON fa.id = ct.from_account_id
       LEFT JOIN tenant.cash_accounts ta ON ta.id = ct.to_account_id
       ORDER BY ct.transfer_date DESC`);
    return result.rows;
  }

  async createTransfer(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.cash_transfers (tenant_id, from_account_id, to_account_id, currency, amount_minor, fx_rate, base_minor, reference, photo_key, transfer_date, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [tenantId, data.from_account_id, data.to_account_id, data.currency, data.amount_minor,
       data.fx_rate, data.base_minor, data.reference, data.photo_key, data.transfer_date, userId, clientUuid]);
    return result.rows[0];
  }

  async getCounts(tenantId: string, accountId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.cash_counts WHERE cash_account_id = $1 ORDER BY count_date DESC`, [accountId]);
    return result.rows;
  }

  async createCount(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.cash_counts (tenant_id, cash_account_id, count_date, counted, photo_key, note, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, data.cash_account_id, data.count_date, JSON.stringify(data.counted),
       data.photo_key, data.note, userId, clientUuid]);
    return result.rows[0];
  }
}
