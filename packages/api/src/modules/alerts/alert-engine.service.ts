import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export type AlertType =
  | 'maintenance_warning'
  | 'maintenance_overdue'
  | 'payment_due'
  | 'payment_overdue'
  | 'log_pending'
  | 'diesel_anomaly'
  | 'cash_variance'
  | 'duplicate_expense'
  | 'concentration'
  | 'ocr_mismatch'
  | 'auto_hold';

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(private db: DatabaseService) {}

  async createAlert(
    tenantId: string,
    type: AlertType,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    detail: string,
    entityId?: string,
    entityType?: 'machine' | 'client' | 'expense'
  ): Promise<void> {
    try {
      const machineId = entityType === 'machine' ? entityId : null;
      const clientId = entityType === 'client' ? entityId : null;
      const expenseId = entityType === 'expense' ? entityId : null;

      await this.db.queryWithTenant(tenantId, 'owner',
        `INSERT INTO tenant.alerts (tenant_id, type, machine_id, client_id, expense_id, severity, title, detail)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [tenantId, type, machineId, clientId, expenseId, severity, title, detail]);

      this.logger.log(`Alert created: ${type} for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to create alert: ${error}`);
    }
  }

  async checkMaintenanceAlerts(tenantId: string): Promise<void> {
    try {
      // Get machines with maintenance due soon
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT m.id, m.code, mt.task_name, mt.next_due_hours, mt.warning_hours,
                COALESCE(current_meter.reading, 0) as current_hours
         FROM tenant.machines m
         JOIN tenant.maintenance_tasks mt ON mt.machine_id = m.id
         LEFT JOIN LATERAL (
           SELECT reading FROM tenant.work_sessions ws
           WHERE ws.machine_id = m.id AND ws.is_current = true
           ORDER BY ws.end_time DESC LIMIT 1
         ) current_meter ON true
         WHERE mt.is_active = true
         AND mt.next_due_hours IS NOT NULL
         AND mt.next_due_hours - COALESCE(current_meter.reading, 0) <= mt.warning_hours`);

      for (const row of result.rows) {
        const hoursLeft = row.next_due_hours - row.current_hours;
        const severity = hoursLeft <= 0 ? 'critical' : 'warning';
        const title = hoursLeft <= 0
          ? `Maintenance overdue: ${row.task_name}`
          : `Maintenance due soon: ${row.task_name}`;
        const detail = `Machine ${row.code} needs ${row.task_name}. ${Math.abs(Math.round(hoursLeft))} hours ${hoursLeft <= 0 ? 'overdue' : 'remaining'}.`;

        await this.createAlert(tenantId, 'maintenance_warning', severity, title, detail, row.id, 'machine');
      }
    } catch (error) {
      this.logger.error(`Failed to check maintenance alerts: ${error}`);
    }
  }

  async checkLogPendingAlerts(tenantId: string): Promise<void> {
    try {
      // Get machines with no session today
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT m.id, m.code
         FROM tenant.machines m
         WHERE m.status != 'retired'
         AND NOT EXISTS (
           SELECT 1 FROM tenant.work_sessions ws
           WHERE ws.machine_id = m.id
           AND ws.start_time >= current_date
         )`);

      for (const row of result.rows) {
        await this.createAlert(
          tenantId,
          'log_pending',
          'warning',
          `No work logged today: ${row.code}`,
          `Machine ${row.code} has no work session logged for today.`,
          row.id,
          'machine'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check log pending alerts: ${error}`);
    }
  }

  async checkPaymentDueAlerts(tenantId: string): Promise<void> {
    try {
      // Get overdue invoices
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT c.id, c.name, v.due_date, v.amount_minor, v.currency
         FROM tenant.clients c
         JOIN LATERAL (
           SELECT due_date, amount_minor, currency
           FROM tenant.billing_ledger bl
           WHERE bl.client_id = c.id AND bl.kind = 'invoice' AND bl.due_date IS NOT NULL
           AND bl.due_date <= current_date
           ORDER BY bl.due_date ASC LIMIT 1
         ) v ON true
         WHERE NOT EXISTS (
           SELECT 1 FROM tenant.client_money_events cme
           WHERE cme.client_id = c.id AND cme.kind = 'receipt'
           AND cme.created_at >= v.due_date
         )`);

      for (const row of result.rows) {
        const daysOverdue = Math.floor((Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24));
        const severity = daysOverdue > 30 ? 'critical' : 'warning';
        await this.createAlert(
          tenantId,
          'payment_overdue',
          severity,
          `Payment overdue: ${row.name}`,
          `Client ${row.name} has an overdue payment of ${row.amount_minor} ${row.currency} (${daysOverdue} days overdue).`,
          row.id,
          'client'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check payment due alerts: ${error}`);
    }
  }

  async checkDieselAnomalyAlerts(tenantId: string): Promise<void> {
    try {
      // Check for unusually high diesel consumption
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT m.id, m.code, SUM(fl.litres) as total_litres, COUNT(DISTINCT fl.id) as fill_count
         FROM tenant.fuel_logs fl
         JOIN tenant.machines m ON m.id = fl.machine_id
         WHERE fl.created_at >= current_date - interval '7 days'
         GROUP BY m.id, m.code
         HAVING SUM(fl.litres) > 500`);

      for (const row of result.rows) {
        await this.createAlert(
          tenantId,
          'diesel_anomaly',
          'warning',
          `High diesel consumption: ${row.code}`,
          `Machine ${row.code} consumed ${Math.round(row.total_litres)} litres in the last 7 days across ${row.fill_count} fills.`,
          row.id,
          'machine'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check diesel anomaly alerts: ${error}`);
    }
  }

  async checkCashVarianceAlerts(tenantId: string): Promise<void> {
    try {
      // Check for large cash variances
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT ca.id, ca.name, 
                COALESCE(ce.expected_minor, 0) as expected,
                COALESCE(cc.counted_minor, 0) as counted,
                ABS(COALESCE(ce.expected_minor, 0) - COALESCE(cc.counted_minor, 0)) as variance
         FROM tenant.cash_accounts ca
         LEFT JOIN LATERAL (
           SELECT expected_minor FROM tenant.cash_expected_by_account v
           WHERE v.account_id = ca.id LIMIT 1
         ) ce ON true
         LEFT JOIN LATERAL (
           SELECT counted_minor FROM tenant.cash_counts cc
           WHERE cc.account_id = ca.id
           ORDER BY cc.count_date DESC LIMIT 1
         ) cc ON true
         WHERE ABS(COALESCE(ce.expected_minor, 0) - COALESCE(cc.counted_minor, 0)) > 10000`);

      for (const row of result.rows) {
        const variance = Math.abs(row.expected - row.counted);
        await this.createAlert(
          tenantId,
          'cash_variance',
          'warning',
          `Cash variance detected: ${row.name}`,
          `Cash account ${row.name} has a variance of ${variance} minor units (expected: ${row.expected}, counted: ${row.counted}).`,
          row.id,
          'client'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check cash variance alerts: ${error}`);
    }
  }

  async runAllChecks(tenantId: string): Promise<void> {
    this.logger.log(`Running alert checks for tenant ${tenantId}`);
    await Promise.allSettled([
      this.checkMaintenanceAlerts(tenantId),
      this.checkLogPendingAlerts(tenantId),
      this.checkPaymentDueAlerts(tenantId),
      this.checkDieselAnomalyAlerts(tenantId),
      this.checkCashVarianceAlerts(tenantId),
    ]);
    this.logger.log(`Alert checks completed for tenant ${tenantId}`);
  }
}
