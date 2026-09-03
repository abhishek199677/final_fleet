import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class FuelDowntimeService {
  constructor(private db: DatabaseService) {}

  async getFuelLogs(tenantId: string, machineId?: string) {
    const query = machineId
      ? `SELECT fl.*, m.code AS machine_code FROM tenant.fuel_logs fl
         JOIN tenant.machines m ON m.id = fl.machine_id
         WHERE fl.machine_id = $1 AND fl.is_current = true ORDER BY fl.fuel_date DESC`
      : `SELECT fl.*, m.code AS machine_code FROM tenant.fuel_logs fl
         JOIN tenant.machines m ON m.id = fl.machine_id
         WHERE fl.is_current = true ORDER BY fl.fuel_date DESC`;
    const params = machineId ? [machineId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'ops', query, params);
    return result.rows;
  }

  async createFuelLog(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.fuel_logs (tenant_id, machine_id, deployment_id, work_session_id, fuel_date, liters, currency, amount_minor, fx_rate, base_minor, vendor, receipt_photo_key, odometer, note, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [tenantId, data.machine_id, data.deployment_id, data.work_session_id, data.fuel_date,
       data.liters, data.currency, data.amount_minor, data.fx_rate, data.base_minor,
       data.vendor, data.receipt_photo_key, data.odometer, data.note, userId, clientUuid]);
    return result.rows[0];
  }

  async getDowntimeSegments(tenantId: string, machineId?: string) {
    const query = machineId
      ? `SELECT ds.*, m.code AS machine_code FROM tenant.downtime_segments ds
         JOIN tenant.machines m ON m.id = ds.machine_id
         WHERE ds.machine_id = $1 AND ds.is_current = true ORDER BY ds.started_at DESC`
      : `SELECT ds.*, m.code AS machine_code FROM tenant.downtime_segments ds
         JOIN tenant.machines m ON m.id = ds.machine_id
         WHERE ds.is_current = true ORDER BY ds.started_at DESC`;
    const params = machineId ? [machineId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'ops', query, params);
    return result.rows;
  }

  async createDowntimeSegment(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.downtime_segments (tenant_id, machine_id, deployment_id, started_at, ended_at, reason, work_session_id, note, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenantId, data.machine_id, data.deployment_id, data.started_at, data.ended_at,
       data.reason, data.work_session_id, data.note, userId, clientUuid]);
    return result.rows[0];
  }
}
