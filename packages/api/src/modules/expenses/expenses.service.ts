import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { assertEvidence } from '../../common/policy/evidence-policy';
import { correctRecord, voidRecord, patchRecord, deleteRecord } from '../../common/records/record-tools';

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

  /**
   * Correction = new version row (append-only; is_current maintained by
   * trigger). Delegates to the shared helper so every money table edits the
   * same way and unknown/empty fields come back as 400 instead of a 500.
   */
  async correct(tenantId: string, id: string, data: Record<string, unknown>, userId: string) {
    return correctRecord(this.db, tenantId, 'expenses', id, data, userId);
  }

  /** Void = retire the current version so it leaves live totals, with the reason stamped on it. */
  async voidExpense(tenantId: string, id: string, reason: string) {
    return voidRecord(this.db, tenantId, 'expenses', id, reason);
  }

  async createCategory(tenantId: string, name: string) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Category name is required');
    if (trimmed.length > 80) throw new BadRequestException('Category name must be 80 characters or fewer');
    const clash = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT 1 FROM tenant.expense_categories WHERE lower(name) = lower($1)`, [trimmed]);
    if (clash.rows.length > 0) throw new ConflictException('A category with that name already exists');
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.expense_categories (tenant_id, name) VALUES ($1, $2) RETURNING *`,
      [tenantId, trimmed]);
    return result.rows[0];
  }

  async updateCategory(tenantId: string, id: string, data: Record<string, unknown>) {
    return patchRecord(this.db, tenantId, 'expense_categories', id, data);
  }

  async deleteCategory(tenantId: string, id: string) {
    return deleteRecord(this.db, tenantId, 'expense_categories', id);
  }
}
