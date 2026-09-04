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
}
