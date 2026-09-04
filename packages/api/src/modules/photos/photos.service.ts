import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { createHash } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

/**
 * Photo evidence (TSD §3.2, §7 media). Columns follow the schema:
 * s3_key_original (+thumb), sha256_server/device, size_bytes,
 * taken_at_device, received_at, lat/lng/gps_accuracy_m, capture_source,
 * uploaded_by, ocr_result. Photos are immutable (SEC-03) — no delete.
 */
@Injectable()
export class PhotosService {
  constructor(private db: DatabaseService) {}

  async presignUpload(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const filename = String(data.filename ?? 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `tenants/${tenantId}/${clientUuid}-${filename}`;
    await fs.mkdir(join(UPLOAD_DIR, `tenants/${tenantId}`), { recursive: true });

    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.photos (tenant_id, s3_key_original, sha256_device, size_bytes, taken_at_device, lat, lng, gps_accuracy_m, capture_source, uploaded_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, key, data.sha256_device ?? null, data.size_bytes ?? null,
       data.taken_at_device ?? null, data.lat ?? null, data.lng ?? null,
       data.gps_accuracy_m ?? null, data.capture_source ?? 'web', userId, clientUuid]);
    return {
      upload_url: `/api/v1/photos/${result.rows[0].id}/upload`,
      photo: result.rows[0],
      key,
    };
  }

  async uploadFile(photoId: string, tenantId: string, file: Buffer, _filename: string) {
    const photo = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.photos WHERE id = $1`, [photoId]);
    if (photo.rows.length === 0) throw new NotFoundException('Photo not found');

    const filePath = join(UPLOAD_DIR, photo.rows[0].s3_key_original as string);
    await fs.mkdir(join(UPLOAD_DIR, `tenants/${tenantId}`), { recursive: true });
    await fs.writeFile(filePath, file);

    const sha256 = createHash('sha256').update(file).digest('hex');
    await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.photos SET sha256_server = $2, size_bytes = $3 WHERE id = $1`,
      [photoId, sha256, file.length]);
    return { success: true, sha256, size: file.length };
  }

  async commitUpload(tenantId: string, photoId: string, sha256Device?: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.photos
       SET sha256_device = COALESCE($2, sha256_device)
       WHERE id = $1 RETURNING *`,
      [photoId, sha256Device ?? null]);
    if (result.rows.length === 0) throw new NotFoundException('Photo not found');
    return result.rows[0];
  }

  /**
   * Photos for a work session (via its meter photo keys) or recent tenant
   * photos when no entity filter is given.
   */
  async getPhotos(tenantId: string, entityType?: string, entityId?: string) {
    if (entityType === 'work_session' && entityId) {
      const result = await this.db.queryWithTenant(tenantId, 'ops',
        `SELECT p.* FROM tenant.photos p
         JOIN tenant.work_sessions ws ON ws.is_current = true
           AND (ws.start_photo_key = p.s3_key_original OR ws.end_photo_key = p.s3_key_original)
         WHERE ws.id = $1 ORDER BY p.received_at DESC`, [entityId]);
      return result.rows;
    }
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.photos ORDER BY received_at DESC LIMIT 50`);
    return result.rows;
  }

  async getPhotoFile(photoId: string, tenantId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT s3_key_original FROM tenant.photos WHERE id = $1`, [photoId]);
    if (result.rows.length === 0) throw new NotFoundException('Photo not found');
    const key = result.rows[0].s3_key_original as string;
    try {
      const buffer = await fs.readFile(join(UPLOAD_DIR, key));
      const ext = extname(key).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { buffer, contentType };
    } catch {
      throw new NotFoundException('Photo file not found');
    }
  }
}
