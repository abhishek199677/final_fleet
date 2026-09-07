import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface StorageAdapter {
  presignUpload(key: string, contentType: string): Promise<string>;
  upload(key: string, buffer: Buffer): Promise<{ sha256: string; size: number }>;
  download(key: string): Promise<Buffer>;
  getPublicUrl(key: string): string;
}

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  async presignUpload(key: string, _contentType: string): Promise<string> {
    const dir = join(this.uploadDir, key.substring(0, key.lastIndexOf('/')));
    await fs.mkdir(dir, { recursive: true });
    return `/api/v1/photos/${key}/upload`;
  }

  async upload(key: string, buffer: Buffer): Promise<{ sha256: string; size: number }> {
    const filePath = join(this.uploadDir, key);
    const dir = join(this.uploadDir, key.substring(0, key.lastIndexOf('/')));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    this.logger.log(`Uploaded ${key} (${buffer.length} bytes)`);
    return { sha256, size: buffer.length };
  }

  async download(key: string): Promise<Buffer> {
    return fs.readFile(join(this.uploadDir, key));
  }

  getPublicUrl(key: string): string {
    return `/api/v1/photos/${key}`;
  }
}

@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'fleetos-evidence-dev';
    this.region = process.env.AWS_REGION || 'ap-south-1';
  }

  private getS3Client() {
    // Lazy load AWS SDK to avoid issues when not configured
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

    const client = new S3Client({ region: this.region });
    return { client, PutObjectCommand, GetObjectCommand, getSignedUrl };
  }

  presignUpload(key: string, contentType: string): Promise<string> {
    const { client, PutObjectCommand, getSignedUrl } = this.getS3Client();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(client, command, { expiresIn: 3600 });
  }

  async upload(key: string, buffer: Buffer): Promise<{ sha256: string; size: number }> {
    const { client, PutObjectCommand } = this.getS3Client();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
    });
    await client.send(command);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    this.logger.log(`Uploaded to S3: ${key} (${buffer.length} bytes)`);
    return { sha256, size: buffer.length };
  }

  async download(key: string): Promise<Buffer> {
    const { client, GetObjectCommand } = this.getS3Client();
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const response = await client.send(command);
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

export function createStorageAdapter(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER || 'local';
  if (driver === 's3') {
    return new S3StorageAdapter();
  }
  return new LocalStorageAdapter();
}
