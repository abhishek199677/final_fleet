import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { patchRecord, deleteRecord, mapDbError } from '../../common/records/record-tools';

@Injectable()
export class AlertsService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string, status?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (status === 'unread' || status === 'active') clauses.push(`a.is_resolved = false`);
    else if (status === 'resolved' || status === 'acknowledged') clauses.push(`a.is_resolved = true`);
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `SELECT a.*, m.code AS machine_code FROM tenant.alerts a
         LEFT JOIN tenant.machines m ON m.id = a.machine_id
         ${where} ORDER BY a.created_at DESC`;
    const result = await this.db.queryWithTenant(tenantId, 'ops', query, params);
    return result.rows;
  }

  async acknowledge(tenantId: string, id: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.alerts SET is_resolved = true, resolved_by = $2, resolved_at = NOW()
       WHERE id = $1 RETURNING *`, [id, userId]);
    return result.rows[0];
  }

  async getRules(tenantId: string) {
    // Returns every rule, active or not: this is the configuration list, and a
    // rule paused with `is_active = false` still has to be reachable to turn
    // back on. The alert engine reads its own copy from `tenant.alert_rules`.
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.alert_rules ORDER BY rule_type`);
    return result.rows;
  }

  async createRule(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    // `notify_channels` is NOT NULL and the caller (settings form, API client)
    // has no reason to always repeat the default — absent means "in-app only",
    // exactly like the column default. Passing it through as NULL made a plain
    // create a 500.
    const channels = Array.isArray(data.notify_channels) && data.notify_channels.length
      ? data.notify_channels
      : ['in_app'];
    try {
      const result = await this.db.queryWithTenant(tenantId, 'owner',
        `INSERT INTO tenant.alert_rules (tenant_id, rule_type, threshold, threshold_unit, notify_channels, client_uuid)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [tenantId, data.rule_type, data.threshold, data.threshold_unit, channels, clientUuid]);
      return result.rows[0];
    } catch (e) {
      // One rule per (tenant, rule_type) — a duplicate used to reach the filter
      // as a raw 23505 and come back as a 500.
      mapDbError(e, 'alert_rules');
    }
  }

  // ── edit / delete ────────────────────────────────────────────────────────
  // Alert rules are configuration, not evidence: they can be tuned in place or
  // removed outright. `is_active = false` hides a rule without losing it.

  async updateRule(tenantId: string, id: string, data: Record<string, unknown>) {
    return patchRecord(this.db, tenantId, 'alert_rules', id, data);
  }

  async deleteRule(tenantId: string, id: string) {
    return deleteRecord(this.db, tenantId, 'alert_rules', id);
  }
}
