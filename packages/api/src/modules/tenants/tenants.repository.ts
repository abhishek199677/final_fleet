import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class TenantsRepository {
  constructor(private db: DatabaseService) {}

  async findAll() {
    const result = await this.db.query(
      'platform',
      `SELECT t.*, e.plan, e.machine_limit, e.user_limit
       FROM platform.tenants t
       LEFT JOIN platform.entitlements e ON e.tenant_id = t.id
       ORDER BY t.created_at DESC`,
    );
    return result.rows;
  }

  async findById(id: string) {
    const result = await this.db.query(
      'platform',
      `SELECT t.*, e.plan, e.machine_limit, e.user_limit, e.features, e.usage,
              ts.evidence_policy, ts.cut_off_time, ts.working_units_per_day
       FROM platform.tenants t
       LEFT JOIN platform.entitlements e ON e.tenant_id = t.id
       LEFT JOIN platform.tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async create(data: { name: string; slug: string; country: string; base_currency: string; timezone?: string }) {
    const result = await this.db.query(
      'platform',
      `INSERT INTO platform.tenants (name, slug, country, base_currency, timezone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.slug, data.country, data.base_currency, data.timezone || 'UTC'],
    );
    return result.rows[0];
  }

  async updateStatus(id: string, status: string) {
    const result = await this.db.query(
      'platform',
      `UPDATE platform.tenants SET status = $2 WHERE id = $1 RETURNING *`,
      [id, status],
    );
    return result.rows[0];
  }
}
