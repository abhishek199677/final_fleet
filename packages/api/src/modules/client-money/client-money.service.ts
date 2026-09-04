import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { assertEvidence } from '../../common/policy/evidence-policy';

@Injectable()
export class ClientMoneyService {
  constructor(private db: DatabaseService) {}

  async getEvents(tenantId: string, clientId?: string, role?: string, userId?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (clientId) {
      params.push(clientId);
      clauses.push(`cme.client_id = $${params.length}`);
    }
    // Ops users see only their own entries; owners see all. Balances stay
    // hidden behind the finance views, which app_ops cannot access (TSD §2.2).
    if (role === 'ops' && userId) {
      params.push(userId);
      clauses.push(`cme.created_by = $${params.length}`);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT cme.*, cl.name AS client_name FROM tenant.client_money_events cme
       JOIN tenant.clients cl ON cl.id = cme.client_id
       ${where} ORDER BY cme.event_date DESC`, params);
    return result.rows;
  }

  async createEvent(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    await assertEvidence(this.db, tenantId, 'slip', {
      hasPhoto: !!data.slip_photo_key,
      amountMinor: Number(data.amount_minor ?? 0),
    });
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.client_money_events (tenant_id, client_id, site_id, event_type, currency, amount_minor, fx_rate, base_minor, mode, reference, slip_photo_key, event_date, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [tenantId, data.client_id, data.site_id ?? null, data.event_type, data.currency || 'INR',
       data.amount_minor, data.fx_rate ?? null, data.base_minor ?? null, data.mode ?? null,
       data.reference ?? null, data.slip_photo_key ?? null, data.event_date, userId, clientUuid]);
    return result.rows[0];
  }

  async getReceivables(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_client_receivable ORDER BY client_name`);
    return result.rows;
  }

  async getUnusedAdvances(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_unused_advances WHERE remaining_minor > 0 ORDER BY event_date`);
    return result.rows;
  }
}
