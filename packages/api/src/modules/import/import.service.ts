import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface ImportResult {
  total: number;
  imported: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private db: DatabaseService) {}

  async importMachines(tenantId: string, csvData: string): Promise<ImportResult> {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['code', 'type', 'make', 'model'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) throw new BadRequestException(`Missing required columns: ${missing.join(', ')}`);

    const result: ImportResult = { total: 0, imported: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      result.total++;
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });

      try {
        if (!row.code || !row.type) throw new Error('code and type are required');

        await this.db.queryWithTenant(tenantId, 'owner',
          `INSERT INTO tenant.machines (tenant_id, code, type, make, model, year, vin_serial, primary_meter_type, meter_unit_label, status_flag, client_uuid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (tenant_id, code) DO NOTHING`,
          [tenantId, row.code, row.type, row.make || null, row.model || null, row.year || null,
           row.vin_serial || null, row.primary_meter_type || 'odometer', row.meter_unit_label || 'hours',
           row.status_flag || 'available', row.client_uuid || crypto.randomUUID()]);
        result.imported++;
      } catch (error) {
        result.errors.push({ row: i + 1, message: (error as Error).message });
      }
    }

    this.logger.log(`Import machines: ${result.imported}/${result.total} succeeded`);
    return result;
  }

  async importExpenses(tenantId: string, csvData: string): Promise<ImportResult> {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const result: ImportResult = { total: 0, imported: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      result.total++;
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });

      try {
        if (!row.date || !row.category || !row.amount) throw new Error('date, category, and amount are required');

        // Look up category
        const catResult = await this.db.queryWithTenant(tenantId, 'ops',
          `SELECT id FROM tenant.expense_categories WHERE name ILIKE $1`, [row.category]);
        const categoryId = catResult.rows[0]?.id;
        if (!categoryId) throw new Error(`Category "${row.category}" not found`);

        await this.db.queryWithTenant(tenantId, 'ops',
          `INSERT INTO tenant.expenses (tenant_id, date, category_id, description, currency, amount_minor, created_by, client_uuid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [tenantId, row.date, categoryId, row.description || null, row.currency || 'USD',
           Math.round(parseFloat(row.amount) * 100), row.created_by || 'system', row.client_uuid || crypto.randomUUID()]);
        result.imported++;
      } catch (error) {
        result.errors.push({ row: i + 1, message: (error as Error).message });
      }
    }

    this.logger.log(`Import expenses: ${result.imported}/${result.total} succeeded`);
    return result;
  }

  async importClients(tenantId: string, csvData: string): Promise<ImportResult> {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const result: ImportResult = { total: 0, imported: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      result.total++;
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });

      try {
        if (!row.name) throw new Error('name is required');

        await this.db.queryWithTenant(tenantId, 'owner',
          `INSERT INTO tenant.clients (tenant_id, name, contact, phone, whatsapp, address, currency, payment_terms_days, client_uuid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (tenant_id, client_uuid) DO NOTHING`,
          [tenantId, row.name, row.contact || null, row.phone || null, row.whatsapp || null,
           row.address || null, row.currency || 'USD', parseInt(row.payment_terms_days || '30'),
           row.client_uuid || crypto.randomUUID()]);
        result.imported++;
      } catch (error) {
        result.errors.push({ row: i + 1, message: (error as Error).message });
      }
    }

    this.logger.log(`Import clients: ${result.imported}/${result.total} succeeded`);
    return result;
  }
}
