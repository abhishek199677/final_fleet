import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class OperatorsService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.operators ORDER BY name`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.operators WHERE id = $1`, [id]);
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.operators (tenant_id, name, phone, is_active, client_uuid)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, client_uuid) DO NOTHING RETURNING *`,
      [tenantId, data.name, data.phone ?? null, data.is_active !== false, clientUuid]);
    if (result.rows.length === 0) return this.findByClientUuid(tenantId, clientUuid);
    return result.rows[0];
  }

  async findByClientUuid(tenantId: string, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.operators WHERE client_uuid = $1`, [clientUuid]);
    return result.rows[0];
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.operators SET name = COALESCE($2, name), phone = COALESCE($3, phone),
       is_active = COALESCE($4, is_active)
       WHERE id = $1 RETURNING *`, [id, data.name, data.phone, data.is_active]);
    return result.rows[0];
  }
}
