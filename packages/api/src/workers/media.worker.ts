import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

interface MediaJob {
  tenant_id: string;
  photo_id: string;
  key: string;
}

@Injectable()
export class MediaWorker {
  private readonly logger = new Logger(MediaWorker.name);

  constructor(private db: DatabaseService) {}

  async processPhoto(job: MediaJob) {
    this.logger.log(`Processing photo ${job.photo_id} for tenant ${job.tenant_id}`);

    try {
      const filePath = join(UPLOAD_DIR, job.key);
      const buffer = await fs.readFile(filePath);
      const sha256 = createHash('sha256').update(buffer).digest('hex');

      // Update photo with SHA-256 and metadata
      await this.db.queryWithTenant(job.tenant_id, 'owner',
        `UPDATE tenant.photos SET sha256 = $2, file_size = $3, committed_at = COALESCE(committed_at, NOW())
         WHERE id = $1`,
        [job.photo_id, sha256, buffer.length]);

      // TODO: Extract EXIF data, generate thumbnail, validate GPS accuracy
      // This would use sharp or similar library in production

      this.logger.log(`Photo ${job.photo_id} processed: sha256=${sha256.slice(0, 16)}...`);
      return { success: true, sha256 };
    } catch (error) {
      this.logger.error(`Failed to process photo ${job.photo_id}: ${error}`);
      throw error;
    }
  }

  async enforceEvidencePolicy(tenantId: string, entityType: string, entityId: string): Promise<boolean> {
    // Check if evidence is required for this entity type
    const settings = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT setting_value FROM tenant.tenant_settings
       WHERE setting_key = 'evidence_policy' AND tenant_id = $1`, [tenantId]);

    const policy = settings.rows[0]?.setting_value as Record<string, unknown> || {};
    const required = policy[entityType] as boolean;

    if (!required) return true;

    // Check if photo exists
    const photos = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT id FROM tenant.photos WHERE entity_type = $1 AND entity_id = $2 AND sha256 IS NOT NULL`,
      [entityType, entityId]);

    return photos.rows.length > 0;
  }
}
