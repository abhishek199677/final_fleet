import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(private repo: TenantsRepository) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    const tenant = await this.repo.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async create(data: { name: string; slug: string; country: string; base_currency: string; timezone?: string }) {
    return this.repo.create(data);
  }

  async suspend(id: string) {
    return this.repo.updateStatus(id, 'suspended');
  }

  async archive(id: string) {
    return this.repo.updateStatus(id, 'archived');
  }
}
