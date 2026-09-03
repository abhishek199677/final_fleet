import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ExpensesService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT e.*, ec.name AS category_name FROM tenant.expenses e
       LEFT JOIN tenant.expense_categories ec ON ec.id = e.category_id
       WHERE e.is_current = true ORDER BY e.date DESC`);
    return result.rows;
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.expenses (tenant_id, date, category_id, description, currency, amount_minor, fx_rate, base_minor, cash_account_id, paid_by, allocation_type, site_id, machine_id, receipt_photo_key, note, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [tenantId, data.date, data.category_id, data.description, data.currency, data.amount_minor,
       data.fx_rate, data.base_minor, data.cash_account_id, data.paid_by, data.allocation_type,
       data.site_id, data.machine_id, data.receipt_photo_key, data.note, userId, clientUuid]);
    return result.rows[0];
  }

  async getCategories(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.expense_categories ORDER BY name`);
    return result.rows;
  }
}
