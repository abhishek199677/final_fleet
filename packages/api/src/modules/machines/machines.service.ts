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
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.maintenance_tasks WHERE machine_id = $1`, [id]);
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.machines WHERE id = $1`, [id]);
    return { deleted: true };
  }
}
