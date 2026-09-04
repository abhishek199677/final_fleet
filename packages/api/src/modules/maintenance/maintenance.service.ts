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
    const visit = result.rows[0];

    // Ticked tasks: link + advance next-due (MNT-04 — meter never resets).
    const taskIds: string[] = Array.isArray(data.task_ids) ? data.task_ids as string[] : [];
    for (const taskId of taskIds) {
      await this.db.queryWithTenant(tenantId, 'ops',
        `INSERT INTO tenant.maintenance_visit_tasks (visit_id, task_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [visit.id, taskId]);
      const t = await this.db.queryWithTenant(tenantId, 'ops',
        `SELECT trigger, interval_value FROM tenant.maintenance_tasks WHERE id = $1`, [taskId]);
      const task = t.rows[0];
      if (!task) continue;
      const meter = Number(data.meter_at_visit ?? NaN);
      if (task.trigger === 'meter' && Number.isFinite(meter)) {
        await this.db.queryWithTenant(tenantId, 'ops',
          `UPDATE tenant.maintenance_tasks SET last_done_value = $1, last_done_date = $2::date,
            next_due_value = $1 + interval_value WHERE id = $3`,
          [meter, data.visit_date, taskId]);
      } else if (task.trigger === 'calendar') {
        await this.db.queryWithTenant(tenantId, 'ops',
          `UPDATE tenant.maintenance_tasks SET last_done_date = $1::date,
            next_due_date = ($1::date + (interval_value || ' days')::interval)::date WHERE id = $2`,
          [data.visit_date, taskId]);
      }
    }

    // Parts and consumables on the visit (MNT-03).
    const parts: Record<string, unknown>[] = Array.isArray(data.parts) ? data.parts as Record<string, unknown>[] : [];
    for (const p of parts) {
      await this.db.queryWithTenant(tenantId, 'ops',
        `INSERT INTO tenant.maintenance_parts (visit_id, item, qty, unit_cost_txn, currency, fx, base, is_consumable, meter_at_change)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [visit.id, p.item, p.qty ?? 1, p.unit_cost_txn ?? 0, p.currency || 'INR', p.fx ?? null,
         p.base ?? null, p.is_consumable ?? true, data.meter_at_visit ?? null]);
    }
    return visit;
  }

  async createTask(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.maintenance_tasks (tenant_id, machine_id, name, trigger, interval_value, warning_value, last_done_value, last_done_date, next_due_value, next_due_date, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, data.machine_id, data.name, data.trigger, data.interval_value, data.warning_value ?? null,
       data.last_done_value ?? null, data.last_done_date ?? null, data.next_due_value ?? null,
       data.next_due_date ?? null, clientUuid]);
    return result.rows[0];
  }

  async getStatus(tenantId: string, machineId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.v_maintenance_status WHERE machine_id = $1`, [machineId]);
    return result.rows;
  }
}
