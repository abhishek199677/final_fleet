import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { promises as fs } from 'fs';
import { join, extname } from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MISMATCH_PCT = Number(process.env.OCR_MISMATCH_PCT ?? 10);

export interface OcrResult {
  value: number;
  confidence: number;
  raw_text: string;
}

/**
 * OCR worker (WRK-03, TSD §7 ocr): reads meter photos referenced by work
 * sessions, stores the adapter result on photos.ocr_result, patches the
 * session start/end OCR values and flags ocr_mismatch beyond threshold.
 * Without GEMINI_API_KEY the worker logs and skips (never fabricates data).
 */
@Injectable()
export class OcrWorker {
  private readonly logger = new Logger(OcrWorker.name);

  constructor(private db: DatabaseService) {}

  async processMeterReading(tenantId: string, photoId: string): Promise<OcrResult | null> {
    this.logger.log(`Processing OCR for photo ${photoId}`);

    try {
      const photoResult = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT id, s3_key_original FROM tenant.photos WHERE id = $1`, [photoId]);
      if (photoResult.rows.length === 0) {
        this.logger.warn(`Photo ${photoId} not found`);
        return null;
      }
      const photo = photoResult.rows[0];
      const key = photo.s3_key_original as string;

      // Which session side references this photo?
      const ses = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT id, machine_id, start_meter, end_meter,
           CASE WHEN start_photo_key = $1 THEN 'start'
                WHEN end_photo_key = $1 THEN 'end' ELSE NULL END AS side
         FROM tenant.work_sessions
         WHERE is_current = true AND (start_photo_key = $1 OR end_photo_key = $1)
         ORDER BY start_at DESC LIMIT 1`,
        [key]);
      if (ses.rows.length === 0 || !ses.rows[0].side) {
        this.logger.log(`Photo ${photoId} is not referenced by any session — skipping OCR`);
        return null;
      }
      const session = ses.rows[0];
      const side = session.side as 'start' | 'end';

      if (!GEMINI_API_KEY) {
        this.logger.warn('GEMINI_API_KEY not configured — OCR skipped (set it to enable WRK-03)');
        return null;
      }

      const buffer = await fs.readFile(join(UPLOAD_DIR, key));
      const ext = extname(key).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const ocrResult = await this.callGeminiApi(buffer.toString('base64'), mimeType);
      if (!ocrResult) return null;

      await this.db.queryWithTenant(tenantId, 'owner',
        `UPDATE tenant.photos SET ocr_result = $2 WHERE id = $1`,
        [photoId, JSON.stringify({ reading: ocrResult.value, confidence: ocrResult.confidence, raw_text: ocrResult.raw_text, meter_side: side })]);

      const ocrCol = side === 'start' ? 'start_ocr_value' : 'end_ocr_value';
      await this.db.queryWithTenant(tenantId, 'owner',
        `UPDATE tenant.work_sessions SET ${ocrCol} = $2 WHERE id = $1`, [session.id, ocrResult.value]);

      const manualValue = Number(side === 'start' ? session.start_meter : session.end_meter);
      if (Number.isFinite(manualValue) && manualValue > 0 && Math.abs(ocrResult.value - manualValue) > (manualValue * MISMATCH_PCT) / 100) {
        await this.db.queryWithTenant(tenantId, 'owner',
          `UPDATE tenant.work_sessions SET ocr_mismatch = true WHERE id = $1`, [session.id]);
        await this.db.queryWithTenant(tenantId, 'owner',
          `INSERT INTO tenant.alerts (tenant_id, type, machine_id, severity, title, detail)
           VALUES ($1, 'ocr_mismatch', $2, 'warning', 'OCR mismatch needs review', $3)
           ON CONFLICT DO NOTHING`,
          [tenantId, session.machine_id, `Photo reads ${ocrResult.value}, manual entry ${manualValue} (${side} meter)`]);
        this.logger.warn(`OCR mismatch on session ${session.id}: photo=${ocrResult.value} manual=${manualValue}`);
      }

      this.logger.log(`OCR result: value=${ocrResult.value}, confidence=${ocrResult.confidence}`);
      return ocrResult;
    } catch (error) {
      this.logger.error(`OCR processing failed: ${error}`);
      return null;
    }
  }

  private async callGeminiApi(base64Image: string, mimeType: string): Promise<OcrResult | null> {
    const prompt = 'Read the meter/hour reading from this heavy-equipment dashboard. Return ONLY a JSON object with fields: value (number), confidence (0-1), raw_text (string). No other text.';
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Image } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`);
    }
    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const jsonMatch = data.candidates?.[0]?.content?.parts?.[0]?.text?.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as OcrResult;
    return null;
  }
}
