import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class SitesService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.sites ORDER BY name`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.sites WHERE id = $1`, [id]);
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
}
