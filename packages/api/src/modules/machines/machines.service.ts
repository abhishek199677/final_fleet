import { Injectable, NotFoundException } from '@nestjs/common';
import { MachinesRepository } from './machines.repository';

@Injectable()
export class MachinesService {
  constructor(private repo: MachinesRepository) {}

  async findAll(tenantId: string) {
    return this.repo.findAll(tenantId);
  }

  async findOne(tenantId: string, id: string) {
    const machine = await this.repo.findById(tenantId, id);
    if (!machine) throw new NotFoundException('Machine not found');
    return machine;
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    return this.repo.create(tenantId, data, clientUuid);
  }

  async updateMeter(tenantId: string, id: string, meter: number) {
    return this.repo.updateMeter(tenantId, id, meter);
  }
}
