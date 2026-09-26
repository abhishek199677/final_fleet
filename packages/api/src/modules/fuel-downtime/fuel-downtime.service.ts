import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { assertEvidence } from '../../common/policy/evidence-policy';
import { correctRecord, voidRecord } from '../../common/records/record-tools';

@Injectable()
export class FuelDowntimeService {
  constructor(private db: DatabaseService) {}

  async getFuelLogs(tenantId: string, machineId?: string) {
    const query = machineId
      ? `SELECT fl.*, m.code AS machine_code FROM tenant.fuel_logs fl
         JOIN tenant.machines m ON m.id = fl.machine_id
         WHERE fl.machine_id = $1 AND fl.is_current = true ORDER BY fl.created_at DESC`
      : `SELECT fl.*, m.code AS machine_code FROM tenant.fuel_logs fl
         JOIN tenant.machines m ON m.id = fl.machine_id
         WHERE fl.is_current = true ORDER BY fl.created_at DESC`;
    const params = machineId ? [machineId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'ops', query, params);
    return result.rows;
  }

  async createFuelLog(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    await assertEvidence(this.db, tenantId, 'diesel', {
      hasPhoto: !!data.receipt_photo_key,
      amountMinor: Number(data.cost_minor ?? data.amount_minor ?? 0),
    });
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.fuel_logs (tenant_id, machine_id, work_session_id, litres, cost_minor, currency, fx_rate, base_minor, receipt_photo_key, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, data.machine_id, data.work_session_id ?? null, data.litres ?? data.liters,
       data.cost_minor ?? data.amount_minor, data.currency || 'INR', data.fx_rate ?? null,
       data.base_minor ?? null, data.receipt_photo_key ?? null, userId, clientUuid]);
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
      `INSERT INTO tenant.downtime_segments (tenant_id, machine_id, work_session_id, started_at, ended_at, reason_code, note, photo_key, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenantId, data.machine_id, data.work_session_id ?? null, data.started_at, data.ended_at ?? null,
       data.reason_code ?? data.reason ?? 'other', data.note ?? null, data.photo_key ?? null, userId, clientUuid]);
    return result.rows[0];
  }

  // ── edit / void ──────────────────────────────────────────────────────────
  // Both tables are append-only: editing writes a new version, voiding retires
  // the current one. Neither destroys a row, so audit_log keeps the history.

  async correctFuelLog(tenantId: string, id: string, data: Record<string, unknown>, userId: string) {
    return correctRecord(this.db, tenantId, 'fuel_logs', id, data, userId);
  }

  async voidFuelLog(tenantId: string, id: string, reason: string) {
    return voidRecord(this.db, tenantId, 'fuel_logs', id, reason);
  }

  async correctDowntime(tenantId: string, id: string, data: Record<string, unknown>, userId: string) {
    return correctRecord(this.db, tenantId, 'downtime_segments', id, data, userId);
  }

  async voidDowntime(tenantId: string, id: string, reason: string) {
    return voidRecord(this.db, tenantId, 'downtime_segments', id, reason);
  }
}
