import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.EVIDENCE_BUCKET || 'fleetos-evidence-dev';
const OCR_API_URL = process.env.OCR_API_URL || 'https://api.openai.com/v1/chat/completions';
const OCR_API_KEY = process.env.OCR_API_KEY;

export interface OcrResult {
  value: number;
  confidence: number;
  raw_text: string;
}

@Injectable()
export class OcrWorker {
  private readonly logger = new Logger(OcrWorker.name);

  constructor(private db: DatabaseService) {}

  async processMeterReading(tenantId: string, photoId: string): Promise<OcrResult | null> {
    this.logger.log(`Processing OCR for photo ${photoId}`);

    try {
      // Get photo details
      const photoResult = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT key, entity_type, entity_id FROM tenant.photos WHERE id = $1`, [photoId]);
      if (photoResult.rows.length === 0) {
        this.logger.warn(`Photo ${photoId} not found`);
        return null;
      }

      const photo = photoResult.rows[0];

      // Download image from S3
      const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: photo.key }));
      const body = response.Body;
      if (!body) throw new Error('Empty response body');
      const imageBytes = await body.transformToByteArray();
      const base64 = Buffer.from(imageBytes).toString('base64');

      // Call vision API for OCR
      const ocrResult = await this.callVisionApi(base64, photo.entity_type);

      if (ocrResult && ocrResult.confidence > 0.7) {
        // Update work session with OCR value
        if (photo.entity_type === 'work_session') {
          await this.db.queryWithTenant(tenantId, 'owner',
            `UPDATE tenant.work_sessions SET ocr_meter_value = $2, ocr_confidence = $3 WHERE id = $1`,
            [photo.entity_id, ocrResult.value, ocrResult.confidence]);

          // Check for mismatch with manual entry
          const session = await this.db.queryWithTenant(tenantId, 'owner',
            `SELECT start_meter, end_meter FROM tenant.work_sessions WHERE id = $1`, [photo.entity_id]);
          if (session.rows.length > 0) {
            const s = session.rows[0];
            const manualValue = s.end_meter || s.start_meter;
            if (manualValue && Math.abs(ocrResult.value - manualValue) > manualValue * 0.1) {
              this.logger.warn(`OCR mismatch: OCR=${ocrResult.value}, Manual=${manualValue}`);
              // Create alert for mismatch
              await this.db.queryWithTenant(tenantId, 'owner',
                `INSERT INTO tenant.alerts (tenant_id, machine_id, alert_type, message, severity, client_uuid)
                 SELECT $1, ws.machine_id, 'ocr_mismatch', $3, 'warning', gen_random_uuid()
                 FROM tenant.work_sessions ws WHERE ws.id = $2`,
                [tenantId, photo.entity_id, `OCR mismatch: detected ${ocrResult.value}, manual entry ${manualValue}`]);
            }
          }
        }
      }

      this.logger.log(`OCR result: value=${ocrResult?.value}, confidence=${ocrResult?.confidence}`);
      return ocrResult;
    } catch (error) {
      this.logger.error(`OCR processing failed: ${error}`);
      return null;
    }
  }

  private async callVisionApi(base64Image: string, entityType: string): Promise<OcrResult | null> {
    if (!OCR_API_KEY) {
      this.logger.warn('OCR API key not configured, using mock');
      return this.mockOcrResult();
    }

    const prompt = entityType === 'work_session'
      ? 'Read the meter/hour reading from this equipment dashboard. Return JSON with fields: value (number), confidence (0-1), raw_text (string).'
      : 'Read any numerical values from this image. Return JSON with fields: value (number), confidence (0-1), raw_text (string).';

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OCR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;

    // Parse JSON from response
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as OcrResult;
    }

    return null;
  }

  private mockOcrResult(): OcrResult {
    // Mock for testing without API key
    return {
      value: Math.floor(Math.random() * 10000) + 1000,
      confidence: 0.85 + Math.random() * 0.15,
      raw_text: 'MOCK_OCR_VALUE',
    };
  }
}
