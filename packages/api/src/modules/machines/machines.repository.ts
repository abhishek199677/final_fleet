import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class MachinesRepository {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.machines ORDER BY code`,
    );
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.machines WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.machines (tenant_id, code, type, make, model, year, chassis_no,
        primary_meter_type, meter_unit_label, status_flag, attributes, client_uuid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (tenant_id, client_uuid) DO NOTHING
       RETURNING *`,
      [
        tenantId, data.code, data.type, data.make, data.model, data.year,
        data.chassis_no, data.primary_meter_type, data.meter_unit_label,
        data.status_flag || 'active', data.attributes || '{}', clientUuid,
      ],
    );
    if (result.rows.length === 0) {
      return this.findById(tenantId, clientUuid);
    }
    return result.rows[0];
  }

  async updateMeter(tenantId: string, id: string, meter: number) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.machines SET current_meter = $2 WHERE id = $1 RETURNING *`,
      [id, meter],
    );
    return result.rows[0];
  }
}
