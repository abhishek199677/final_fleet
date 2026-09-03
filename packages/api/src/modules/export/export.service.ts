import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as XLSX from 'xlsx';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.EXPORT_BUCKET || 'fleetos-exports-dev';

export interface ExportOptions {
  type: 'machines' | 'billing' | 'expenses' | 'sessions' | 'receivables';
  client_id?: string;
  machine_id?: string;
  date_from?: string;
  date_to?: string;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private db: DatabaseService) {}

  async export(tenantId: string, options: ExportOptions): Promise<{ download_url: string; filename: string }> {
    let data: Record<string, unknown>[] = [];
    let sheetName = 'Export';

    switch (options.type) {
      case 'machines':
        data = await this.exportMachines(tenantId);
        sheetName = 'Machines';
        break;
      case 'billing':
        data = await this.exportBilling(tenantId, options);
        sheetName = 'Billing';
        break;
      case 'expenses':
        data = await this.exportExpenses(tenantId, options);
        sheetName = 'Expenses';
        break;
      case 'sessions':
        data = await this.exportSessions(tenantId, options);
        sheetName = 'Sessions';
        break;
      case 'receivables':
        data = await this.exportReceivables(tenantId);
        sheetName = 'Receivables';
        break;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Upload to S3
    const filename = `${options.type}-${new Date().toISOString().split('T')[0]}.xlsx`;
    const key = `${tenantId}/exports/${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));

    // Generate signed URL
    const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
    const download_url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    this.logger.log(`Exported ${data.length} rows to ${filename}`);
    return { download_url, filename };
  }

  private async exportMachines(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT code, type, make, model, year, vin_serial, current_meter, meter_unit_label, status_flag, maintenance_group
       FROM tenant.machines ORDER BY code`);
    return result.rows;
  }

  private async exportBilling(tenantId: string, options: ExportOptions) {
    let query = `SELECT bl.*, m.code AS machine_code, cl.name AS client_name
       FROM tenant.billing_ledger bl
       JOIN tenant.deployments d ON d.id = bl.deployment_id
       JOIN tenant.machines m ON m.id = d.machine_id
       JOIN tenant.clients cl ON cl.id = d.client_id
       WHERE 1=1`;
    const params: string[] = [];

    if (options.client_id) { params.push(options.client_id); query += ` AND cl.id = $${params.length}`; }
    if (options.date_from) { params.push(options.date_from); query += ` AND bl.entry_date >= $${params.length}`; }
    if (options.date_to) { params.push(options.date_to); query += ` AND bl.entry_date <= $${params.length}`; }

    query += ' ORDER BY bl.entry_date DESC';
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  private async exportExpenses(tenantId: string, options: ExportOptions) {
    let query = `SELECT e.date, ec.name AS category, e.description, e.currency, e.amount_minor, e.fx_rate, e.base_minor
       FROM tenant.expenses e
       LEFT JOIN tenant.expense_categories ec ON ec.id = e.category_id
       WHERE e.is_current = true`;
    const params: string[] = [];

    if (options.date_from) { params.push(options.date_from); query += ` AND e.date >= $${params.length}`; }
    if (options.date_to) { params.push(options.date_to); query += ` AND e.date <= $${params.length}`; }

    query += ' ORDER BY e.date DESC';
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  private async exportSessions(tenantId: string, options: ExportOptions) {
    let query = `SELECT ws.start_at, ws.end_at, m.code AS machine_code, op.name AS operator_name,
       ws.start_meter, ws.end_meter, ws.worked_hours, ws.notes
       FROM tenant.work_sessions ws
       JOIN tenant.machines m ON m.id = ws.machine_id
       JOIN tenant.operators op ON op.id = ws.operator_id
       WHERE ws.is_current = true`;
    const params: string[] = [];

    if (options.machine_id) { params.push(options.machine_id); query += ` AND ws.machine_id = $${params.length}`; }
    if (options.date_from) { params.push(options.date_from); query += ` AND ws.start_at >= $${params.length}`; }
    if (options.date_to) { params.push(options.date_to); query += ` AND ws.start_at <= $${params.length}`; }

    query += ' ORDER BY ws.start_at DESC';
    const result = await this.db.queryWithTenant(tenantId, 'owner', query, params);
    return result.rows;
  }

  private async exportReceivables(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_client_receivable ORDER BY client_name`);
    return result.rows;
  }
}
