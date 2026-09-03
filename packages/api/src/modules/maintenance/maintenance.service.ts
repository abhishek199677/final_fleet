import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class MaintenanceService {
  constructor(private db: DatabaseService) {}

  async getTasks(tenantId: string, machineId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.maintenance_tasks WHERE machine_id = $1 ORDER BY name`, [machineId]);
    return result.rows;
  }

  async getVisits(tenantId: string, machineId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT mv.*, ARRAY_AGG(mvt.task_id) AS task_ids
       FROM tenant.maintenance_visits mv
       LEFT JOIN tenant.maintenance_visit_tasks mvt ON mvt.visit_id = mv.id
       WHERE mv.machine_id = $1 AND mv.is_current = true
       GROUP BY mv.id ORDER BY mv.visit_date DESC`, [machineId]);
    return result.rows;
  }

  async createVisit(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.maintenance_visits (tenant_id, machine_id, visit_date, visit_type, mechanic, meter_at_visit, checklist, labour_cost_txn, labour_currency, labour_fx, labour_base, notes, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [tenantId, data.machine_id, data.visit_date, data.visit_type, data.mechanic, data.meter_at_visit,
       data.checklist, data.labour_cost_txn, data.labour_currency, data.labour_fx, data.labour_base,
       data.notes, userId, clientUuid]);
    return result.rows[0];
  }

  async getStatus(tenantId: string, machineId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.v_maintenance_status WHERE machine_id = $1`, [machineId]);
    return result.rows;
  }
}
