import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class SitesService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT s.*, c.name AS client_name
       FROM tenant.sites s
       LEFT JOIN tenant.clients c ON c.id = s.client_id
       ORDER BY s.name`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT s.*, c.name AS client_name
       FROM tenant.sites s
       LEFT JOIN tenant.clients c ON c.id = s.client_id
       WHERE s.id = $1`, [id]);
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.sites (tenant_id, name, client_id, location, lat, lng, start_date, end_date, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tenantId, data.name, data.client_id, data.location ?? null, data.lat ?? null, data.lng ?? null,
       data.start_date ?? null, data.end_date ?? null, clientUuid]);
    return result.rows[0];
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Site not found');
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.sites SET
        name = COALESCE($2, name), client_id = COALESCE($3, client_id),
        location = COALESCE($4, location), start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date)
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, data.client_id ?? null, data.location ?? null, data.start_date ?? null, data.end_date ?? null]);
    return result.rows[0];
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Site not found');
    await this.db.queryWithTenant(tenantId, 'ops',
      `DELETE FROM tenant.sites WHERE id = $1`, [id]);
    return { deleted: true };
  }
}
