import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkSessionsRepository } from './work-sessions.repository';
import { BillingEngine } from '../billing/billing-engine-logic';
import { DatabaseService } from '../../common/database/database.service';
import { assertEvidence } from '../../common/policy/evidence-policy';

@Injectable()
export class WorkSessionsService {
  private readonly logger = new Logger(WorkSessionsService.name);

  constructor(
    private repo: WorkSessionsRepository,
    private billing: BillingEngine,
    private db: DatabaseService,
  ) {}

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

    // Evidence policy: manual readings need a photo when the tenant requires it.
    const startManual = data.start_evidence !== 'photo' || !data.start_photo_key;
    const endManual = !data.end_at || data.end_evidence !== 'photo' || !data.end_photo_key;
    await assertEvidence(this.db, tenantId, 'meter', { hasPhoto: !startManual && !endManual });

    const created = await this.repo.create(tenantId, data, clientUuid, userId);
    // Billing runs for the session's day (TSD §5, §7). Never fails the write.
    void this.runBillingForSession(tenantId, created).catch((e) => this.logger.warn(`billing hook failed: ${(e as Error).message}`));
    return created;
  }

  async correct(tenantId: string, id: string, data: Record<string, unknown>, userId: string) {
    const result = await this.repo.correct(tenantId, id, data, userId);
    if (!result) throw new NotFoundException('Work session not found');
    void this.runBillingForSession(tenantId, result).catch((e) => this.logger.warn(`billing hook failed: ${(e as Error).message}`));
    return result;
  }

  async endSession(tenantId: string, id: string, data: {
    end_meter: number;
    end_at?: string;
    end_photo_key?: string;
    end_evidence?: string;
    notes?: string;
  }, userId: string) {
    // Get the current session
    const session = await this.repo.findById(tenantId, id);
    if (!session) throw new NotFoundException('Work session not found');

    // Validation: end >= start
    const endAt = data.end_at || new Date().toISOString();
    if (new Date(endAt) < new Date(session.start_at as string)) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validation: session <= 24h
    const hours = (new Date(endAt).getTime() - new Date(session.start_at as string).getTime()) / (1000 * 60 * 60);
    if (hours > 24) {
      throw new BadRequestException('Session cannot exceed 24 hours');
    }

    // Validation: end_meter >= start_meter
    if (data.end_meter < (session.start_meter as number)) {
      throw new BadRequestException('End meter must be greater than or equal to start meter');
    }

    // Correct the session with end data
    const result = await this.repo.correct(tenantId, id, {
      end_at: endAt,
      end_meter: data.end_meter,
      units_run: data.end_meter - (session.start_meter as number),
      end_photo_key: data.end_photo_key || null,
      end_evidence: data.end_evidence || 'manual',
      notes: data.notes || session.notes,
      billable: true,
    }, userId);

    if (!result) throw new NotFoundException('Failed to end session');

    // Run billing for the session's day
    void this.runBillingForSession(tenantId, result).catch((e) => this.logger.warn(`billing hook failed: ${(e as Error).message}`));

    return result;
  }

  private async runBillingForSession(tenantId: string, session: Record<string, unknown>): Promise<void> {
    const deploymentId = session.deployment_id as string | undefined;
    const startAt = session.start_at as string | undefined;
    if (!deploymentId || !startAt) return;
    const day = new Date(startAt).toISOString().slice(0, 10);
    const result = await this.billing.calculateBilling(tenantId, {
      deployment_id: deploymentId,
      work_session_id: session.id as string,
      period_start: day,
      period_end: day,
    });
    await this.billing.postBilling(tenantId, result);
  }

  async getDailyRollup(tenantId: string, machineId: string, date: string) {
    return this.repo.getDailyRollup(tenantId, machineId, date);
  }
}
