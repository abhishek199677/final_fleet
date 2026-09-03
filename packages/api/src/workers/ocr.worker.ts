import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

      // Read image from local filesystem
      const filePath = join(UPLOAD_DIR, photo.key);
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString('base64');
      const mimeType = photo.key.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Call Gemini API for OCR
      const ocrResult = await this.callGeminiApi(base64, mimeType, photo.entity_type);

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

  private async callGeminiApi(base64Image: string, mimeType: string, entityType: string): Promise<OcrResult | null> {
    if (!GEMINI_API_KEY) {
      this.logger.warn('Gemini API key not configured, using mock');
      return this.mockOcrResult();
    }

    const prompt = entityType === 'work_session'
      ? 'Read the meter/hour reading from this equipment dashboard. Return ONLY a JSON object with fields: value (number), confidence (0-1), raw_text (string). No other text.'
      : 'Read any numerical values from this image. Return ONLY a JSON object with fields: value (number), confidence (0-1), raw_text (string). No other text.';

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
