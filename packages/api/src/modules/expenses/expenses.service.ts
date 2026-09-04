import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { assertEvidence } from '../../common/policy/evidence-policy';

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
    const duplicateOf = await this.findDuplicate(tenantId, data);
    await assertEvidence(this.db, tenantId, 'expense', {
      hasPhoto: !!data.receipt_photo_key,
      amountMinor: Number(data.amount_minor ?? 0),
    });
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.expenses (tenant_id, date, category_id, description, currency, amount_minor, fx_rate, base_minor, cash_account_id, paid_by, allocation_type, site_id, machine_id, receipt_photo_key, duplicate_of_id, needs_verification, note, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [tenantId, data.date, data.category_id, data.description, data.currency, data.amount_minor,
       data.fx_rate, data.base_minor, data.cash_account_id, data.paid_by, data.allocation_type,
       data.site_id, data.machine_id, data.receipt_photo_key, duplicateOf, duplicateOf !== null,
       data.note, userId, clientUuid]);
    if (duplicateOf) {
      await this.raiseAlert(tenantId, result.rows[0].id as string, data);
    }
    return result.rows[0];
  }

  /**
   * Duplicate suspect (EXP-03): same month + category + amount ±1% +
   * similar description. Write succeeds; flags + owner alert.
   */
  private async findDuplicate(tenantId: string, data: Record<string, unknown>): Promise<string | null> {
    if (!data.date || !data.category_id || data.amount_minor === undefined) return null;
    const amount = Number(data.amount_minor);
    const norm = String(data.description ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const candidates = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT id, description, amount_minor FROM tenant.expenses
       WHERE is_current = true AND category_id = $1
         AND DATE_TRUNC('month', date::date) = DATE_TRUNC('month', $2::date)
         AND amount_minor BETWEEN $3 AND $4`,
      [data.category_id, data.date, Math.floor(amount * 0.99), Math.ceil(amount * 1.01)]);
    for (const c of candidates.rows) {
      const other = String(c.description ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (other.length >= 8 && norm.length >= 8 && (other.includes(norm) || norm.includes(other))) {
        return c.id as string;
      }
    }
    return null;
  }

  private async raiseAlert(tenantId: string, expenseId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.db.queryWithTenant(tenantId, 'ops',
        `INSERT INTO tenant.alerts (tenant_id, type, expense_id, severity, title, detail)
         VALUES ($1,'duplicate_expense',$2,'warning','Possible duplicate expense',$3)
         ON CONFLICT DO NOTHING`,
        [tenantId, expenseId, `Same month, category and amount as an earlier entry: ${String(data.description ?? '')}`]);
    } catch {
      /* alerting never fails the write */
    }
  }

  async getCategories(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.expense_categories ORDER BY name`);
    return result.rows;
  }

  /** Correction = new version row (append-only; is_current maintained by trigger). */
  async correct(tenantId: string, id: string, data: Record<string, unknown>, userId: string) {
    const original = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.expenses WHERE id = $1 AND is_current = true`, [id]);
    if (original.rows.length === 0) return null;
    const o = original.rows[0];
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.expenses (tenant_id, date, category_id, description, currency, amount_minor, fx_rate, base_minor, cash_account_id, paid_by, allocation_type, site_id, machine_id, receipt_photo_key, note, created_by, client_uuid, supersedes_id, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [tenantId, data.date || o.date, data.category_id || o.category_id, data.description || o.description,
       data.currency || o.currency, data.amount_minor ?? o.amount_minor, data.fx_rate ?? o.fx_rate,
       data.base_minor ?? o.base_minor, data.cash_account_id || o.cash_account_id, data.paid_by || o.paid_by,
       data.allocation_type || o.allocation_type, data.site_id || o.site_id, data.machine_id || o.machine_id,
       data.receipt_photo_key ?? o.receipt_photo_key,
       data.note !== undefined ? `${o.note ? `${o.note} | ` : ''}${data.note}` : o.note,
       userId, data.client_uuid, id, Number(o.version) + 1]);
    return result.rows[0];
  }
}
