import { Injectable } from '@nestjs/common';
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
}
