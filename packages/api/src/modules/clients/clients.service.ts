import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ClientsRepository {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT c.*, cc.credit_limit_minor, cc.required_advance_minor
       FROM tenant.clients c
       LEFT JOIN tenant.client_credit cc ON cc.client_id = c.id
       ORDER BY c.name`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT c.*, cc.credit_limit_minor, cc.required_advance_minor
       FROM tenant.clients c
       LEFT JOIN tenant.client_credit cc ON cc.client_id = c.id
       WHERE c.id = $1`, [id]);
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.clients (tenant_id, name, contact, phone, whatsapp, address, currency, payment_terms_days, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (tenant_id, client_uuid) DO NOTHING RETURNING *`,
      [tenantId, data.name, data.contact, data.phone, data.whatsapp, data.address, data.currency, data.payment_terms_days || 30, clientUuid]);
    if (result.rows.length === 0) return this.findById(tenantId, clientUuid);
    return result.rows[0];
  }
}

@Injectable()
export class ClientsService {
  constructor(private repo: ClientsRepository) {}
  async findAll(tenantId: string) { return this.repo.findAll(tenantId); }
  async findOne(tenantId: string, id: string) {
    const client = await this.repo.findById(tenantId, id);
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }
  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    return this.repo.create(tenantId, data, clientUuid);
  }
}
