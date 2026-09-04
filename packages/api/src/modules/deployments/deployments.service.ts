import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

const WITH_NAMES = `d.*, m.code AS machine_code, s.name AS site_name, cl.name AS client_name
  FROM tenant.deployments d
  JOIN tenant.machines m ON m.id = d.machine_id
  JOIN tenant.sites s ON s.id = d.site_id
  JOIN tenant.clients cl ON cl.id = s.client_id`;

@Injectable()
export class DeploymentsService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ${WITH_NAMES} WHERE d.status != 'ended' ORDER BY d.start_date DESC`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ${WITH_NAMES} WHERE d.id = $1`, [id]);
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.deployments (tenant_id, machine_id, site_id, start_date, end_date, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tenantId, data.machine_id, data.site_id, data.start_date, data.end_date ?? null, clientUuid]);
    return result.rows[0];
  }

  async findActiveForMachine(tenantId: string, machineId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ${WITH_NAMES} WHERE d.machine_id = $1 AND d.status = 'active' ORDER BY d.start_date DESC LIMIT 1`, [machineId]);
    return result.rows[0];
  }

  async hold(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.deployments SET status = 'on_hold_payment' WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) throw new NotFoundException('Deployment not found');
    return result.rows[0];
  }

  async release(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.deployments SET status = 'active' WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) throw new NotFoundException('Deployment not found');
    return result.rows[0];
  }
}
