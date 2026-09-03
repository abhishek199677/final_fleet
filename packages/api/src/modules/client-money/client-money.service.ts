import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ClientMoneyService {
  constructor(private db: DatabaseService) {}

  async getEvents(tenantId: string, clientId?: string) {
    const query = clientId
      ? `SELECT cme.*, cl.name AS client_name FROM tenant.client_money_events cme
         JOIN tenant.clients cl ON cl.id = cme.client_id
         WHERE cme.client_id = $1 ORDER BY cme.event_date DESC`
      : `SELECT cme.*, cl.name AS client_name FROM tenant.client_money_events cme
         JOIN tenant.clients cl ON cl.id = cme.client_id
         ORDER BY cme.event_date DESC`;
    const params = clientId ? [clientId] : [];
    const result = await this.db.queryWithTenant(tenantId, 'ops', query, params);
    return result.rows;
  }

  async createEvent(tenantId: string, data: Record<string, unknown>, clientUuid: string, userId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.client_money_events (tenant_id, client_id, event_type, event_date, currency, amount_minor, fx_rate, base_minor, exchange_currency, exchange_amount_minor, exchange_fx_rate, exchange_base_minor, deployment_id, work_session_id, reference, note, evidence_policy, created_by, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [tenantId, data.client_id, data.event_type, data.event_date, data.currency,
       data.amount_minor, data.fx_rate, data.base_minor, data.exchange_currency,
       data.exchange_amount_minor, data.exchange_fx_rate, data.exchange_base_minor,
       data.deployment_id, data.work_session_id, data.reference, data.note,
       data.evidence_policy, userId, clientUuid]);
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
