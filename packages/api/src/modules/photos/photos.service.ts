import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { StorageAdapter, createStorageAdapter } from '../../common/storage/storage.adapter';
import { extname } from 'path';

/**
 * Photo evidence (TSD §3.2, §7 media). Columns follow the schema:
 * s3_key_original (+thumb), sha256_server/device, size_bytes,
 * taken_at_device, received_at, lat/lng/gps_accuracy_m, capture_source,
 * uploaded_by, ocr_result. Photos are immutable (SEC-03) — no delete.
 */
@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private storage: StorageAdapter;

  constructor(private db: DatabaseService) {
    this.storage = createStorageAdapter();
  }

  async presignUpload(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const filename = String(data.filename ?? 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `tenants/${tenantId}/${clientUuid}-${filename}`;
    const contentType = String(data.content_type ?? 'image/jpeg');

    const uploadUrl = await this.storage.presignUpload(key, contentType);

    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.photos (tenant_id, s3_key_original, sha256_device, size_bytes, taken_at_device, lat, lng, gps_accuracy_m, capture_source, uploaded_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, key, data.sha256_device ?? null, data.size_bytes ?? null,
       data.taken_at_device ?? null, data.lat ?? null, data.lng ?? null,
       data.gps_accuracy_m ?? null, data.capture_source ?? 'web', userId, clientUuid]);
    return {
      upload_url: uploadUrl,
      photo: result.rows[0],
      key,
    };
  }

  async uploadFile(photoId: string, tenantId: string, file: Buffer, _filename: string) {
    const photo = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT * FROM tenant.photos WHERE id = $1`, [photoId]);
    if (photo.rows.length === 0) throw new NotFoundException('Photo not found');

    const key = photo.rows[0].s3_key_original as string;
    const { sha256, size } = await this.storage.upload(key, file);

    await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.photos SET sha256_server = $2, size_bytes = $3 WHERE id = $1`,
      [photoId, sha256, size]);
    return { success: true, sha256, size };
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
      const buffer = await this.storage.download(key);
      const ext = extname(key).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { buffer, contentType };
    } catch {
      throw new NotFoundException('Photo file not found');
    }
  }

  async getThumbFile(photoId: string, tenantId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT s3_key_thumb FROM tenant.photos WHERE id = $1`, [photoId]);
    if (result.rows.length === 0 || !result.rows[0].s3_key_thumb) return null;
    const key = result.rows[0].s3_key_thumb as string;
    try {
      const buffer = await this.storage.download(key);
      return { buffer, contentType: 'image/jpeg' };
    } catch {
      return null;
    }
  }
}
