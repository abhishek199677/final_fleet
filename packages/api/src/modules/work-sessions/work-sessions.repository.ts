import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class WorkSessionsRepository {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string, machineId?: string) {
    let query = `SELECT ws.*, m.code AS machine_code, o.name AS operator_name
      FROM tenant.work_sessions ws
      LEFT JOIN tenant.machines m ON m.id = ws.machine_id
      LEFT JOIN tenant.operators o ON o.id = ws.operator_id
      WHERE ws.is_current = true`;
    const params: unknown[] = [];
    if (machineId) {
      params.push(machineId);
      query += ` AND ws.machine_id = $${params.length}`;
    }
    query += ` ORDER BY ws.start_at DESC`;
    const result = await this.db.queryWithTenant(tenantId, 'ops', query, params);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ws.*, m.code AS machine_code, o.name AS operator_name
       FROM tenant.work_sessions ws
       LEFT JOIN tenant.machines m ON m.id = ws.machine_id
       LEFT JOIN tenant.operators o ON o.id = ws.operator_id
       WHERE ws.id = $1`,
      [id],
    );
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.work_sessions (
        tenant_id, machine_id, deployment_id, operator_id, helper_id,
        start_at, end_at, start_meter, end_meter, units_run,
        start_photo_key, end_photo_key, start_evidence, end_evidence,
        activity, billable, override_reason, notes, created_by, client_uuid
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT (tenant_id, client_uuid) DO NOTHING
      RETURNING *`,
      [
        tenantId, data.machine_id, data.deployment_id, data.operator_id, data.helper_id,
        data.start_at, data.end_at, data.start_meter, data.end_meter, data.units_run,
        data.start_photo_key, data.end_photo_key, data.start_evidence, data.end_evidence,
        data.activity, data.billable !== false, data.override_reason, data.notes, userId, clientUuid,
      ],
    );
    if (result.rows.length === 0) {
      return this.findById(tenantId, clientUuid);
    }
    return result.rows[0];
  }

  async correct(tenantId: string, id: string, data: Record<string, unknown>, userId: string) {
    // Get the original
    const original = await this.findById(tenantId, id);
    if (!original) return null;

    // Insert correction as new version
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.work_sessions (
        tenant_id, machine_id, deployment_id, operator_id, helper_id,
        start_at, end_at, start_meter, end_meter, units_run,
        start_photo_key, end_photo_key, start_evidence, end_evidence,
        activity, billable, override_reason, notes, created_by, client_uuid,
        supersedes_id, version
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        tenantId, data.machine_id || original.machine_id, data.deployment_id || original.deployment_id,
        data.operator_id || original.operator_id, data.helper_id || original.helper_id,
        data.start_at || original.start_at, data.end_at || original.end_at,
        data.start_meter || original.start_meter, data.end_meter || original.end_meter,
        data.units_run || original.units_run,
        data.start_photo_key || original.start_photo_key, data.end_photo_key || original.end_photo_key,
        data.start_evidence || original.start_evidence, data.end_evidence || original.end_evidence,
        data.activity || original.activity, data.billable !== undefined ? data.billable : original.billable,
        data.override_reason || original.override_reason, data.notes || original.notes,
        userId, data.client_uuid || original.client_uuid,
        id, (original.version || 1) + 1,
      ],
    );
    return result.rows[0];
  }

  async getDailyRollup(tenantId: string, machineId: string, date: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.v_machine_daily_ops
       WHERE machine_id = $1 AND work_date = $2`,
      [machineId, date],
    );
    return result.rows[0];
  }
}
