import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { StorageAdapter, createStorageAdapter } from '../common/storage/storage.adapter';
import { createHash } from 'crypto';

interface MediaJob {
  tenant_id: string;
  photo_id: string;
}

/**
 * Media worker (TSD §7 media): server-side SHA-256, size, and thumbnail
 * generation for committed photos. Uses sharp for thumbnail creation.
 */
@Injectable()
export class MediaWorker {
  private readonly logger = new Logger(MediaWorker.name);
  private storage: StorageAdapter;

  constructor(private db: DatabaseService) {
    this.storage = createStorageAdapter();
  }

  async processPhoto(job: MediaJob) {
    this.logger.log(`Processing photo ${job.photo_id} for tenant ${job.tenant_id}`);

    try {
      const photo = await this.db.queryWithTenant(job.tenant_id, 'owner',
        `SELECT id, s3_key_original FROM tenant.photos WHERE id = $1`, [job.photo_id]);
      if (photo.rows.length === 0) {
        this.logger.warn(`Photo ${job.photo_id} not found`);
        return { success: false };
      }

      const key = photo.rows[0].s3_key_original as string;
      const buffer = await this.storage.download(key);
      const sha256 = createHash('sha256').update(buffer).digest('hex');

      await this.db.queryWithTenant(job.tenant_id, 'owner',
        `UPDATE tenant.photos SET sha256_server = $2, size_bytes = $3 WHERE id = $1`,
        [job.photo_id, sha256, buffer.length]);

      // Generate thumbnail if sharp is available
      const thumbKey = key.replace(/(\.[^.]+)$/, '_thumb$1');
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require('sharp');
        const thumbnail = await sharp(buffer)
          .resize(200, 200, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        await this.storage.upload(thumbKey, thumbnail);
        await this.db.queryWithTenant(job.tenant_id, 'owner',
          `UPDATE tenant.photos SET s3_key_thumb = $2 WHERE id = $1`,
          [job.photo_id, thumbKey]);
        this.logger.log(`Thumbnail created for photo ${job.photo_id}`);
      } catch {
        // sharp not installed — skip thumbnail
        this.logger.debug('sharp not available, skipping thumbnail generation');
      }

      this.logger.log(`Photo ${job.photo_id} processed: sha256=${sha256.slice(0, 16)}...`);
      return { success: true, sha256 };
    } catch (error) {
      this.logger.error(`Failed to process photo ${job.photo_id}: ${error}`);
      throw error;
    }
  }
}
