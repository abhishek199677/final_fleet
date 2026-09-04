import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface AuditFilters {
  userId?: string;
  table?: string;
  machineId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Owner audit list (SEC-04): filterable by user, table, date; machine via related rows. */
@Injectable()
export class AuditService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string, f: AuditFilters) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (f.userId) {
      params.push(f.userId);
      clauses.push(`a.user_id = $${params.length}`);
    }
    if (f.table) {
      params.push(f.table);
      clauses.push(`a.table_name = $${params.length}`);
    }
    if (f.from) {
      params.push(f.from);
      clauses.push(`a.created_at >= $${params.length}::date`);
    }
    if (f.to) {
      params.push(f.to);
      clauses.push(`a.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }
    if (f.machineId) {
      params.push(f.machineId);
      const mid = `$${params.length}`;
      clauses.push(`(a.record_id IN (SELECT id FROM tenant.work_sessions WHERE machine_id = ${mid})
        OR a.record_id IN (SELECT id FROM tenant.fuel_logs WHERE machine_id = ${mid})
        OR a.record_id IN (SELECT id FROM tenant.downtime_segments WHERE machine_id = ${mid})
        OR a.record_id IN (SELECT id FROM tenant.expenses WHERE machine_id = ${mid})
        OR a.record_id = ${mid})`);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.min(Math.max(Number(f.limit) || 100, 1), 500);
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM tenant.audit_log a
       LEFT JOIN tenant.users u ON u.id = a.user_id
       ${where} ORDER BY a.created_at DESC LIMIT ${limit}`);
    return result.rows;
  }
}
