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

  async checkStoppedLongAlerts(tenantId: string): Promise<void> {
    try {
      // BRD ALT-02: machines reported stopped > N hours (configurable, default 8h)
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT m.id, m.code, ds.started_at, ds.reason_code
         FROM tenant.downtime_segments ds
         JOIN tenant.machines m ON m.id = ds.machine_id
         WHERE ds.ended_at IS NULL
         AND ds.started_at < now() - interval '8 hours'`);

      for (const row of result.rows) {
        const hours = Math.round((Date.now() - new Date(row.started_at).getTime()) / (1000 * 60 * 60));
        await this.createAlert(
          tenantId,
          'log_pending',
          'warning',
          `Machine stopped > ${hours}h: ${row.code}`,
          `Machine ${row.code} has been stopped for ${hours} hours (reason: ${(row.reason_code || 'unknown').replace(/_/g, ' ')}).`,
          row.id,
          'machine'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check stopped-long alerts: ${error}`);
    }
  }

  async checkDuplicateExpenseAlerts(tenantId: string): Promise<void> {
    try {
      // BRD ALT-02, EXP-03: same month, category, base ±1%, similar description
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT e1.id, e1.date, e1.description, e1.amount_minor, e1.base_minor,
                ec.name AS category_name, m.code AS machine_code
         FROM tenant.expenses e1
         JOIN tenant.expense_categories ec ON ec.id = e1.category_id
         LEFT JOIN tenant.machines m ON m.id = e1.machine_id
         WHERE e1.is_current = true
         AND e1.created_at >= now() - interval '30 days'
         AND EXISTS (
           SELECT 1 FROM tenant.expenses e2
           WHERE e2.id != e1.id AND e2.is_current = true
           AND e2.tenant_id = e1.tenant_id
           AND e2.category_id = e1.category_id
           AND date_trunc('month', e2.date) = date_trunc('month', e1.date)
           AND ABS(e2.base_minor - e1.base_minor) <= GREATEST(e1.base_minor * 0.01, 1)
           AND e2.supersedes_id IS NULL
         )
         AND e1.supersedes_id IS NULL`);

      for (const row of result.rows) {
        await this.createAlert(
          tenantId,
          'duplicate_expense',
          'warning',
          `Possible duplicate expense: ${row.category_name}`,
          `Expense of ${row.amount_minor} on ${row.date} (${row.category_name}) may be a duplicate. ${row.description || ''}`,
          row.id,
          'expense'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check duplicate expense alerts: ${error}`);
    }
  }

  async checkConcentrationAlerts(tenantId: string): Promise<void> {
    try {
      // BRD ALT-02, INS-04: category above configurable share (default 35%)
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `WITH totals AS (
           SELECT SUM(base_minor) as total
           FROM tenant.expenses WHERE is_current = true
           AND date_trunc('month', date) = date_trunc('month', current_date)
         ),
         by_category AS (
           SELECT ec.name AS category_name, SUM(e.base_minor) as cat_total
           FROM tenant.expenses e
           JOIN tenant.expense_categories ec ON ec.id = e.category_id
           WHERE e.is_current = true
           AND date_trunc('month', e.date) = date_trunc('month', current_date)
           GROUP BY ec.name
         )
         SELECT bc.category_name, bc.cat_total, t.total,
                ROUND(bc.cat_total * 100.0 / NULLIF(t.total, 0), 1) as pct
         FROM by_category bc, totals t
         WHERE t.total > 0 AND bc.cat_total * 100.0 / t.total > 35`);

      for (const row of result.rows) {
        await this.createAlert(
          tenantId,
          'concentration',
          'warning',
          `Expense concentration: ${row.category_name}`,
          `${row.category_name} accounts for ${row.pct}% of total expenses this month (${row.cat_total} of ${row.total} minor units).`,
          undefined,
          'expense'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check concentration alerts: ${error}`);
    }
  }

  async checkEntryEditedAlerts(tenantId: string): Promise<void> {
    try {
      // BRD ALT-02, SEC-02: entries corrected in the last hour
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `SELECT al.id, al.table_name, al.record_id, al.created_at,
                u.name AS user_name
         FROM tenant.audit_log al
         LEFT JOIN tenant.users u ON u.id = al.user_id
         WHERE al.operation = 'insert'
         AND al.table_name IN ('work_sessions', 'expenses', 'fuel_logs', 'cash_counts')
         AND al.created_at >= now() - interval '1 hour'
         AND al.new_data ? 'supersedes_id'
         AND (al.new_data->>'supersedes_id') IS NOT NULL`);

      for (const row of result.rows) {
        await this.createAlert(
          tenantId,
          'log_pending',
          'info',
          `Entry edited: ${row.table_name}`,
          `${row.user_name || 'User'} corrected a ${row.table_name.replace(/_/g, ' ')} entry.`,
          row.record_id,
          'machine'
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check entry-edited alerts: ${error}`);
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
      this.checkStoppedLongAlerts(tenantId),
      this.checkDuplicateExpenseAlerts(tenantId),
      this.checkConcentrationAlerts(tenantId),
      this.checkEntryEditedAlerts(tenantId),
    ]);
    this.logger.log(`Alert checks completed for tenant ${tenantId}`);
  }
}
