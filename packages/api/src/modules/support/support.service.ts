import { ForbiddenException, Injectable } from '@nestjs/common';
import { supportGrantValid } from '../../common/domain/hardening.js';
import { DatabaseService } from '../../common/database/database.service';

/** In-app support tickets (ADM-04). Tenant users file; owners read their own. */
@Injectable()
export class SupportService {
  constructor(private db: DatabaseService) {}

  async create(tenantId: string, userId: string, data: Record<string, unknown>) {
    const pool = 'owner';
    const result = await this.db.queryWithTenant(tenantId, pool,
      `INSERT INTO platform.support_tickets (tenant_id, user_id, subject, description, screenshot_key)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, subject, status, created_at`,
      [tenantId, userId, data.subject, data.description ?? null, data.screenshot_key ?? null]);
    return result.rows[0];
  }

  async findMine(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id, subject, description, status, created_at
       FROM platform.support_tickets WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [tenantId]);
    return result.rows;
  }

  /**
   * Audited support access (ADM-06 hardening-lite): owner-approved, read-only,
   * time-limited, reason + ticket mandatory, finance masked unless authorised.
   */
  async requestAccess(tenantId: string, data: { ticket_id: string; reason: string; hours?: number; scope?: string }) {
    if (!data.ticket_id || !data.reason) {
      throw new ForbiddenException({ code: 'SUPPORT_DENIED', message: 'ticket_id and reason are required' });
    }
    const hours = Math.min(Math.max(Number(data.hours ?? 4), 1), 72);
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO platform.support_access_grants (tenant_id, ticket_id, reason, expires_at, scope)
       VALUES ($1,$2,$3,NOW() + ($4 || ' hours')::interval,$5)
       RETURNING id, tenant_id, ticket_id, reason, expires_at, scope`,
      [tenantId, data.ticket_id, data.reason, String(hours), data.scope ?? 'support_read']);
    return result.rows[0];
  }

  isGrantUsable(g: { ticketId?: string | null; reason?: string | null; expiresAt: string; revokedAt?: string | null; approved: boolean; now?: string }): boolean {
    return supportGrantValid(g);
  }
}
