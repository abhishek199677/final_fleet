import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

@Injectable()
export class PhotosService {
  constructor(private db: DatabaseService) {}

  async presignUpload(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const key = `${tenantId}/${data.entity_type}/${data.entity_id}/${clientUuid}-${data.filename}`;
    const filePath = join(UPLOAD_DIR, key);

    // Ensure directory exists
    await fs.mkdir(join(UPLOAD_DIR, tenantId, data.entity_type as string, data.entity_id as string), { recursive: true });

    // Store metadata in DB (file will be uploaded directly to this path)
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.photos (tenant_id, entity_type, entity_id, key, sha256, content_type, gps_lat, gps_lon, gps_accuracy_m, capture_source, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, data.entity_type, data.entity_id, key, null, data.content_type,
       data.gps_lat, data.gps_lon, data.gps_accuracy_m, data.capture_source, clientUuid]);

    // For local storage, return the path where client should upload
    return {
      upload_url: `/api/v1/photos/${result.rows[0].id}/upload`,
      photo: result.rows[0],
      key,
    };
  }

  async uploadFile(photoId: string, tenantId: string, file: Buffer, filename: string) {
    // Get photo metadata
    const photo = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.photos WHERE id = $1`, [photoId]);
    if (photo.rows.length === 0) throw new NotFoundException('Photo not found');

    const photoData = photo.rows[0];
    const filePath = join(UPLOAD_DIR, photoData.key);

    // Write file
    await fs.writeFile(filePath, file);

    // Calculate SHA-256
    const sha256 = createHash('sha256').update(file).digest('hex');

    // Update DB
    await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.photos SET sha256 = $2, file_size = $3, committed_at = NOW() WHERE id = $1`,
      [photoId, sha256, file.length]);

    return { success: true, sha256, size: file.length };
  }

  async commitUpload(tenantId: string, photoId: string, sha256: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.photos SET sha256 = $2, committed_at = NOW() WHERE id = $1 RETURNING *`,
      [photoId, sha256]);
    return result.rows[0];
  }

  async getPhotos(tenantId: string, entityType: string, entityId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.photos WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
      [entityType, entityId]);
    return result.rows;
  }

  async getPhotoFile(photoId: string, tenantId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT key, content_type FROM tenant.photos WHERE id = $1`, [photoId]);
    if (result.rows.length === 0) throw new NotFoundException('Photo not found');

    const photo = result.rows[0];
    const filePath = join(UPLOAD_DIR, photo.key);

    try {
      const buffer = await fs.readFile(filePath);
      return { buffer, contentType: photo.content_type || 'application/octet-stream' };
    } catch {
      throw new NotFoundException('Photo file not found');
    }
  }

  async deletePhoto(photoId: string, tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT key FROM tenant.photos WHERE id = $1`, [photoId]);
    if (result.rows.length === 0) throw new NotFoundException('Photo not found');

    const filePath = join(UPLOAD_DIR, result.rows[0].key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File might not exist, continue with DB delete
    }

    await this.db.queryWithTenant(tenantId, 'ops',
      `DELETE FROM tenant.photos WHERE id = $1`, [photoId]);
  }
}
