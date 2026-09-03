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
      `INSERT INTO tenant.operators (tenant_id, name, phone, whatsapp, license_class, license_expiry, active, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, data.name, data.phone, data.whatsapp, data.license_class, data.license_expiry, data.active !== false, clientUuid]);
    return result.rows[0];
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.operators SET name = COALESCE($2, name), phone = COALESCE($3, phone), whatsapp = COALESCE($4, whatsapp),
       license_class = COALESCE($5, license_class), license_expiry = COALESCE($6, license_expiry), active = COALESCE($7, active)
       WHERE id = $1 RETURNING *`, [id, data.name, data.phone, data.whatsapp, data.license_class, data.license_expiry, data.active]);
    return result.rows[0];
  }
}
