import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// MinIO-compatible S3 client (works with AWS S3, MinIO, or any S3-compatible storage)
const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined, // Set for MinIO: http://localhost:9000
  forcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO
  credentials: process.env.S3_ACCESS_KEY ? {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  } : undefined,
});
const BUCKET = process.env.S3_BUCKET || 'fleetos';

@Injectable()
export class PhotosService {
  constructor(private db: DatabaseService) {}

  async presignUpload(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const key = `${tenantId}/${data.entity_type}/${data.entity_id}/${clientUuid}-${data.filename}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: data.content_type as string,
      Metadata: { tenant_id: tenantId, client_uuid: clientUuid },
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.photos (tenant_id, entity_type, entity_id, key, sha256, content_type, gps_lat, gps_lon, gps_accuracy_m, capture_source, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, data.entity_type, data.entity_id, key, null, data.content_type,
       data.gps_lat, data.gps_lon, data.gps_accuracy_m, data.capture_source, clientUuid]);
    return { upload_url: url, photo: result.rows[0] };
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

  async getSignedUrl(photoId: string, tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT key FROM tenant.photos WHERE id = $1`, [photoId]);
    if (result.rows.length === 0) throw new NotFoundException('Photo not found');
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: result.rows[0].key });
    return getSignedUrl(s3, command, { expiresIn: 300 });
  }
}
