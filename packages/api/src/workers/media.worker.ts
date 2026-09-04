import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

interface MediaJob {
  tenant_id: string;
  photo_id: string;
}

/**
 * Media worker (TSD §7 media): server-side SHA-256 + size for committed
 * photos. Thumbnails/EXIF stay TODO until the S3 + sharp pipeline lands.
 */
@Injectable()
export class MediaWorker {
  private readonly logger = new Logger(MediaWorker.name);

  constructor(private db: DatabaseService) {}

  async processPhoto(job: MediaJob) {
    this.logger.log(`Processing photo ${job.photo_id} for tenant ${job.tenant_id}`);

    try {
      const photo = await this.db.queryWithTenant(job.tenant_id, 'owner',
        `SELECT s3_key_original FROM tenant.photos WHERE id = $1`, [job.photo_id]);
      if (photo.rows.length === 0) {
        this.logger.warn(`Photo ${job.photo_id} not found`);
        return { success: false };
      }
      const buffer = await fs.readFile(join(UPLOAD_DIR, photo.rows[0].s3_key_original as string));
      const sha256 = createHash('sha256').update(buffer).digest('hex');

      await this.db.queryWithTenant(job.tenant_id, 'owner',
        `UPDATE tenant.photos SET sha256_server = $2, size_bytes = $3 WHERE id = $1`,
        [job.photo_id, sha256, buffer.length]);

      this.logger.log(`Photo ${job.photo_id} processed: sha256=${sha256.slice(0, 16)}...`);
      return { success: true, sha256 };
    } catch (error) {
      this.logger.error(`Failed to process photo ${job.photo_id}: ${error}`);
      throw error;
    }
  }
}
