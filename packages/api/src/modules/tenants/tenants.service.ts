import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { entitlementExceeded } from '../../common/domain/hardening.js';
import { TenantsRepository } from './tenants.repository';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class TenantsService {
  constructor(
    private repo: TenantsRepository,
    private db: DatabaseService
  ) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    const tenant = await this.repo.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async create(data: { name: string; slug: string; country: string; base_currency: string; timezone?: string }) {
    return this.repo.create(data);
  }

  async suspend(id: string) {
    return this.repo.updateStatus(id, 'suspended');
  }

  async archive(id: string) {
    return this.repo.updateStatus(id, 'archived');
  }

  async getSettings(tenantId: string) {
    const result = await this.db.query('platform',
      `SELECT evidence_policy, fx_defaults, cut_off_time, working_units_per_day, working_days_per_month
       FROM platform.tenant_settings WHERE tenant_id = $1`, [tenantId]);
    if (result.rows.length === 0) throw new NotFoundException('Tenant settings not found');
    return result.rows[0];
  }

  async updateSettings(tenantId: string, updates: {
    evidence_policy?: Record<string, string>;
    fx_defaults?: Record<string, unknown>;
    cut_off_time?: string;
    working_units_per_day?: number;
    working_days_per_month?: number;
  }) {
    const result = await this.db.query('platform',
      `UPDATE platform.tenant_settings 
       SET evidence_policy = COALESCE($2, evidence_policy),
           fx_defaults = COALESCE($3, fx_defaults),
           cut_off_time = COALESCE($4, cut_off_time),
           working_units_per_day = COALESCE($5, working_units_per_day),
           working_days_per_month = COALESCE($6, working_days_per_month)
       WHERE tenant_id = $1 
       RETURNING *`,
      [tenantId, updates.evidence_policy, updates.fx_defaults, 
       updates.cut_off_time, updates.working_units_per_day, updates.working_days_per_month]);
    if (result.rows.length === 0) throw new NotFoundException('Tenant settings not found');
    return result.rows[0];
  }

  /** Hard entitlement enforcement (TEN-02 hardening; pilot used warnings). */
  assertWithinLimit(used: number, limit: number | null | undefined): void {
    if (entitlementExceeded(used, limit)) {
      throw new ForbiddenException({ code: 'ENTITLEMENT_LIMIT', message: 'Entitlement limit reached' });
    }
  }

  async closePeriod(tenantId: string, period: string, userId: string, note?: string) {
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new ForbiddenException({ code: 'INVALID_PERIOD', message: 'Period must be YYYY-MM format' });
    }

    // Check not already closed
    const existing = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id FROM tenant.period_closes WHERE period = $1`, [period]);
    if (existing.rows.length > 0) {
      throw new ForbiddenException({ code: 'PERIOD_CLOSED', message: 'Period already closed' });
    }

    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.period_closes (tenant_id, period, closed_by, note, client_uuid)
       VALUES ($1, $2, $3, $4, gen_random_uuid()) RETURNING *`,
      [tenantId, period, userId, note || null]);
    return result.rows[0];
  }

  async listPeriodCloses(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT pc.*, u.name AS closed_by_name
       FROM tenant.period_closes pc
       LEFT JOIN tenant.users u ON u.id = pc.closed_by
       ORDER BY pc.period DESC`);
    return result.rows;
  }
}
