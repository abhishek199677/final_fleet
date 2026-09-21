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
      [tenantId, data.name, data.contact ?? null, data.phone ?? null, data.whatsapp ?? null, data.address ?? null, data.currency || 'INR', data.payment_terms_days || 30, clientUuid]);
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

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Client not found');
    const result = await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.clients SET
        name = COALESCE($2, name), contact = COALESCE($3, contact),
        phone = COALESCE($4, phone), whatsapp = COALESCE($5, whatsapp),
        address = COALESCE($6, address), currency = COALESCE($7, currency),
        payment_terms_days = COALESCE($8, payment_terms_days)
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, data.contact ?? null, data.phone ?? null, data.whatsapp ?? null, data.address ?? null, data.currency ?? null, data.payment_terms_days ?? null]);
    return result.rows[0];
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Client not found');

    // Delete related records in the correct order to respect foreign key constraints.
    // Chain: clients → sites → deployments → work_sessions, billing_ledger, rate_cards, extra_charges

    // 1. Delete advance_consumptions for this client's billing
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.advance_consumptions
       WHERE billing_ledger_id IN (
         SELECT bl.id FROM tenant.billing_ledger bl
         JOIN tenant.deployments d ON d.id = bl.deployment_id
         JOIN tenant.sites s ON s.id = d.site_id
         WHERE s.client_id = $1
       )`, [id]);

    // 2. Delete billing_ledger for this client's deployments
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.billing_ledger
       WHERE deployment_id IN (
         SELECT d.id FROM tenant.deployments d
         JOIN tenant.sites s ON s.id = d.site_id
         WHERE s.client_id = $1
       )`, [id]);

    // 3. Delete extra_charges for this client's deployments
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.extra_charges
       WHERE deployment_id IN (
         SELECT d.id FROM tenant.deployments d
         JOIN tenant.sites s ON s.id = d.site_id
         WHERE s.client_id = $1
       )`, [id]);

    // 4. Delete rate_cards for this client's deployments
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.rate_cards
       WHERE deployment_id IN (
         SELECT d.id FROM tenant.deployments d
         JOIN tenant.sites s ON s.id = d.site_id
         WHERE s.client_id = $1
       )`, [id]);

    // 5. Delete work_sessions for this client's deployments
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.work_sessions
       WHERE deployment_id IN (
         SELECT d.id FROM tenant.deployments d
         JOIN tenant.sites s ON s.id = d.site_id
         WHERE s.client_id = $1
       )`, [id]);

    // 6. Delete deployments for this client's sites
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.deployments
       WHERE site_id IN (SELECT id FROM tenant.sites WHERE client_id = $1)`, [id]);

    // 7. Delete client_money_events for this client
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.client_money_events WHERE client_id = $1`, [id]);

    // 8. Delete client_credit for this client
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.client_credit WHERE client_id = $1`, [id]);

    // 9. Delete sites for this client
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.sites WHERE client_id = $1`, [id]);

    // 10. Finally, delete the client itself
    await this.repo['db'].queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.clients WHERE id = $1`, [id]);

    return { deleted: true };
  }
}
