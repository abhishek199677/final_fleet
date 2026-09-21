import { Injectable, NotFoundException } from '@nestjs/common';
import { MachinesRepository } from './machines.repository';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class MachinesService {
  constructor(
    private repo: MachinesRepository,
    private db: DatabaseService,
  ) {}

  async findAll(tenantId: string) {
    return this.repo.findAll(tenantId);
  }

  async findOne(tenantId: string, id: string) {
    const machine = await this.repo.findById(tenantId, id);
    if (!machine) throw new NotFoundException('Machine not found');
    return machine;
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const machine = await this.repo.create(tenantId, data, clientUuid);
    // Default service template on creation (MNT-01): General service every
    // 250 hours with a 20-hour warning. Never fails the machine create.
    try {
      const meter = Number(machine.current_meter ?? 0);
      await this.db.queryWithTenant(tenantId, 'ops',
        `INSERT INTO tenant.maintenance_tasks (tenant_id, machine_id, name, trigger, interval_value, warning_value, next_due_value, client_uuid)
         VALUES ($1,$2,'General service','meter',250,20,$3,gen_random_uuid())
         ON CONFLICT DO NOTHING`,
        [tenantId, machine.id, meter + 250]);
    } catch {
      /* template is best-effort */
    }
    return machine;
  }

  async updateMeter(tenantId: string, id: string, meter: number) {
    return this.repo.updateMeter(tenantId, id, meter);
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Machine not found');
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.machines SET
        code = COALESCE($2, code), type = COALESCE($3, type),
        make = COALESCE($4, make), model = COALESCE($5, model),
        year = COALESCE($6, year), chassis_no = COALESCE($7, chassis_no),
        primary_meter_type = COALESCE($8, primary_meter_type),
        meter_unit_label = COALESCE($9, meter_unit_label),
        status_flag = COALESCE($10, status_flag)
       WHERE id = $1 RETURNING *`,
      [id, data.code ?? null, data.type ?? null, data.make ?? null, data.model ?? null,
       data.year ?? null, data.chassis_no ?? null, data.primary_meter_type ?? null,
       data.meter_unit_label ?? null, data.status_flag ?? null]);
    return result.rows[0];
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Machine not found');

    // Delete related records in the correct order to respect foreign key constraints.
    // Order matters: child tables must be deleted before parent tables.

    // 1. Delete maintenance_parts (references maintenance_visits)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.maintenance_parts
       WHERE visit_id IN (SELECT id FROM tenant.maintenance_visits WHERE machine_id = $1)`, [id]);

    // 2. Delete maintenance_visit_tasks (references maintenance_visits and maintenance_tasks)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.maintenance_visit_tasks
       WHERE visit_id IN (SELECT id FROM tenant.maintenance_visits WHERE machine_id = $1)
          OR task_id IN (SELECT id FROM tenant.maintenance_tasks WHERE machine_id = $1)`, [id]);

    // 3. Delete maintenance_visits (references machines)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.maintenance_visits WHERE machine_id = $1`, [id]);

    // 4. Delete maintenance_tasks (references machines)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.maintenance_tasks WHERE machine_id = $1`, [id]);

    // 5. Delete billing_ledger (references work_sessions)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.billing_ledger
       WHERE work_session_id IN (SELECT id FROM tenant.work_sessions WHERE machine_id = $1)`, [id]);

    // 6. Delete work_sessions (references machines)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.work_sessions WHERE machine_id = $1`, [id]);

    // 7. Delete fuel_logs (references machines)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.fuel_logs WHERE machine_id = $1`, [id]);

    // 8. Delete downtime_segments (references machines)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.downtime_segments WHERE machine_id = $1`, [id]);

    // 9. Delete rate_cards, extra_charges, advance_consumptions (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.advance_consumptions
       WHERE billing_ledger_id IN (SELECT id FROM tenant.billing_ledger
       WHERE deployment_id IN (SELECT id FROM tenant.deployments WHERE machine_id = $1))`, [id]);
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.rate_cards
       WHERE deployment_id IN (SELECT id FROM tenant.deployments WHERE machine_id = $1)`, [id]);
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.extra_charges
       WHERE deployment_id IN (SELECT id FROM tenant.deployments WHERE machine_id = $1)`, [id]);

    // 10. Delete deployments (references machines)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.deployments WHERE machine_id = $1`, [id]);

    // 11. Delete machine_financials (references machines)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.machine_financials WHERE machine_id = $1`, [id]);

    // 12. Delete expenses referencing this machine
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.expenses WHERE machine_id = $1`, [id]);

    // 13. Finally, delete the machine itself
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.machines WHERE id = $1`, [id]);

    return { deleted: true };
  }
}
