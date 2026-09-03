import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AlertsService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string, status?: string) {
    const query = status
      ? `SELECT a.*, m.code AS machine_code FROM tenant.alerts a
         LEFT JOIN tenant.machines m ON m.id = a.machine_id
         WHERE a.status = $1 ORDER BY a.created_at DESC`
      : `SELECT a.*, m.code AS machine_code FROM tenant.alerts a
         LEFT JOIN tenant.machines m ON m.id = a.machine_id
         ORDER BY a.created_at DESC`;
    const params = status ? [status] : [];
    const result = await this.db.queryWithTenant(tenantId, 'ops', query, params);
    return result.rows;
  }

  async acknowledge(tenantId: string, id: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.alerts SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW()
       WHERE id = $1 RETURNING *`, [id, userId]);
    return result.rows[0];
  }

  async getRules(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.alert_rules WHERE is_active = true ORDER BY rule_type`);
    return result.rows;
  }

  async createRule(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.alert_rules (tenant_id, rule_type, threshold, threshold_unit, notify_channels, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tenantId, data.rule_type, data.threshold, data.threshold_unit, data.notify_channels, clientUuid]);
    return result.rows[0];
  }
}
