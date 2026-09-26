import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
   * Edit a ticket. Only its text and status are mutable — `user_id`,
   * `tenant_id` and `created_at` are not, so a ticket can be re-scoped or
   * closed but never re-attributed.
   */
  async updateTicket(tenantId: string, id: string, data: Record<string, unknown>) {
    const STATUSES = new Set(['open', 'pending', 'resolved', 'closed']);
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.subject !== undefined) {
      const subject = String(data.subject).trim();
      if (!subject) throw new BadRequestException('subject cannot be empty');
      values.push(subject);
      sets.push(`subject = $${values.length}`);
    }
    if (data.description !== undefined) {
      values.push(data.description === null ? null : String(data.description));
      sets.push(`description = $${values.length}`);
    }
    if (data.status !== undefined) {
      if (!STATUSES.has(String(data.status))) {
        throw new BadRequestException('status must be one of open, pending, resolved, closed');
      }
      values.push(String(data.status));
      sets.push(`status = $${values.length}`);
    }
    if (sets.length === 0) throw new BadRequestException('No fields to update');

    values.push(id, tenantId);
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE platform.support_tickets SET ${sets.join(', ')}
        WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
        RETURNING id, subject, description, status, created_at`,
      values);
    if (result.rows.length === 0) throw new NotFoundException('Support ticket not found');
    return result.rows[0];
  }

  /**
   * Remove a ticket.
   *
   * `platform.support_access_grants` is deliberately left alone: there is no FK
   * from grants to tickets, and the tenant role holds no privileges on that
   * platform table at all (migration 1725400000011 grants it to `app_platform`
   * only) — touching it here aborted the whole delete with 42501. Grants are
   * time-limited by `expires_at` whatever happens to their ticket.
   */
  async deleteTicket(tenantId: string, id: string) {
    const deleted = await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM platform.support_tickets WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]);
    if (deleted.rows.length === 0) throw new NotFoundException('Support ticket not found');
    return { deleted: true, id };
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
