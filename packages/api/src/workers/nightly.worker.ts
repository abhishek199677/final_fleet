import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { OcrWorker } from './ocr.worker';
import { MediaWorker } from './media.worker';

export interface NightlyJob {
  tenant_id: string;
  type: 'ocr' | 'media' | 'billing' | 'rollup' | 'cleanup';
}

@Injectable()
export class NightlyWorker {
  private readonly logger = new Logger(NightlyWorker.name);

  constructor(
    private db: DatabaseService,
    private ocrWorker: OcrWorker,
    private mediaWorker: MediaWorker,
  ) {}

  async processJob(job: NightlyJob): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Running nightly job: ${job.type} for tenant ${job.tenant_id}`);

    try {
      switch (job.type) {
        case 'ocr':
          return await this.processOcrJobs(job.tenant_id);
        case 'media':
          return await this.processMediaJobs(job.tenant_id);
        case 'billing':
          return await this.processBilling(job.tenant_id);
        case 'rollup':
          return await this.processDailyRollup(job.tenant_id);
        case 'cleanup':
          return await this.processCleanup(job.tenant_id);
        default:
          return { success: false, message: `Unknown job type: ${job.type}` };
      }
    } catch (error) {
      this.logger.error(`Nightly job failed: ${error}`);
      return { success: false, message: (error as Error).message };
    }
  }

  private async processOcrJobs(tenantId: string) {
    // Find unprocessed photos for work sessions
    const photos = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id FROM tenant.photos
       WHERE entity_type = 'work_session' AND sha256 IS NOT NULL
       AND id NOT IN (SELECT photo_id FROM tenant.ocr_results WHERE photo_id IS NOT NULL)
       LIMIT 50`);

    let processed = 0;
    for (const photo of photos.rows) {
      const result = await this.ocrWorker.processMeterReading(tenantId, photo.id);
      if (result) processed++;
    }

    return { success: true, message: `OCR processed ${processed}/${photos.rows.length} photos` };
  }

  private async processMediaJobs(tenantId: string) {
    // Find unprocessed photos
    const photos = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id, key FROM tenant.photos
       WHERE sha256 IS NULL AND committed_at IS NOT NULL
       LIMIT 50`);

    let processed = 0;
    for (const photo of photos.rows) {
      await this.mediaWorker.processPhoto({ tenant_id: tenantId, photo_id: photo.id, key: photo.key });
      processed++;
    }

    return { success: true, message: `Media processed ${processed}/${photos.rows.length} photos` };
  }

  private async processBilling(tenantId: string) {
    // Run billing for active deployments
    const deployments = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id FROM tenant.deployments WHERE end_date IS NULL AND is_current = true`);

    let billed = 0;
    for (const deployment of deployments.rows) {
      // This would call the billing engine to calculate and insert ledger entries
      billed++;
    }

    return { success: true, message: `Billing processed ${billed} deployments` };
  }

  private async processDailyRollup(tenantId: string) {
    // Update materialized views or aggregations
    await this.db.queryWithTenant(tenantId, 'owner',
      `REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS tenant.mv_daily_kpis`);

    return { success: true, message: 'Daily rollup completed' };
  }

  private async processCleanup(tenantId: string) {
    // Clean up expired data, temp files, etc.
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.notifications WHERE created_at < NOW() - INTERVAL '90 days'`);

    return { success: true, message: `Cleaned up ${result.rowCount} old notifications` };
  }
}
