import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkSessionsRepository } from './work-sessions.repository';

@Injectable()
export class WorkSessionsService {
  constructor(private repo: WorkSessionsRepository) {}

  async findAll(tenantId: string, machineId?: string) {
    return this.repo.findAll(tenantId, machineId);
  }

  async findOne(tenantId: string, id: string) {
    const session = await this.repo.findById(tenantId, id);
    if (!session) throw new NotFoundException('Work session not found');
    return session;
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    // Validation: end >= start
    if (data.end_at && data.start_at && new Date(data.end_at as string) < new Date(data.start_at as string)) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validation: session <= 24h
    if (data.end_at && data.start_at) {
      const hours = (new Date(data.end_at as string).getTime() - new Date(data.start_at as string).getTime()) / (1000 * 60 * 60);
      if (hours > 24) {
        throw new BadRequestException('Session cannot exceed 24 hours');
      }
    }

    return this.repo.create(tenantId, data, clientUuid, userId);
  }

  async correct(tenantId: string, id: string, data: Record<string, unknown>, userId: string) {
    const result = await this.repo.correct(tenantId, id, data, userId);
    if (!result) throw new NotFoundException('Work session not found');
    return result;
  }

  async getDailyRollup(tenantId: string, machineId: string, date: string) {
    return this.repo.getDailyRollup(tenantId, machineId, date);
  }
}
