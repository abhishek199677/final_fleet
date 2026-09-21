import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class SitesService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT s.*, c.name AS client_name
       FROM tenant.sites s
       LEFT JOIN tenant.clients c ON c.id = s.client_id
       ORDER BY s.name`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT s.*, c.name AS client_name
       FROM tenant.sites s
       LEFT JOIN tenant.clients c ON c.id = s.client_id
       WHERE s.id = $1`, [id]);
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `INSERT INTO tenant.sites (tenant_id, name, client_id, location, lat, lng, start_date, end_date, client_uuid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tenantId, data.name, data.client_id, data.location ?? null, data.lat ?? null, data.lng ?? null,
       data.start_date ?? null, data.end_date ?? null, clientUuid]);
    return result.rows[0];
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Site not found');
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.sites SET
        name = COALESCE($2, name), client_id = COALESCE($3, client_id),
        location = COALESCE($4, location), start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date)
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, data.client_id ?? null, data.location ?? null, data.start_date ?? null, data.end_date ?? null]);
    return result.rows[0];
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Site not found');

    // Delete related records in the correct order to respect foreign key constraints.

    // 1. Delete advance_consumptions (references billing_ledger)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.advance_consumptions
       WHERE billing_ledger_id IN (
         SELECT bl.id FROM tenant.billing_ledger bl
         JOIN tenant.deployments d ON d.id = bl.deployment_id
         WHERE d.site_id = $1
       )`, [id]);

    // 2. Delete billing_ledger (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.billing_ledger
       WHERE deployment_id IN (SELECT id FROM tenant.deployments WHERE site_id = $1)`, [id]);

    // 3. Delete extra_charges (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.extra_charges
       WHERE deployment_id IN (SELECT id FROM tenant.deployments WHERE site_id = $1)`, [id]);

    // 4. Delete rate_cards (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.rate_cards
       WHERE deployment_id IN (SELECT id FROM tenant.deployments WHERE site_id = $1)`, [id]);

    // 5. Delete work_sessions (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.work_sessions
       WHERE deployment_id IN (SELECT id FROM tenant.deployments WHERE site_id = $1)`, [id]);

    // 6. Delete deployments (references sites)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.deployments WHERE site_id = $1`, [id]);

    // 7. Delete client_money_events referencing this site
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.client_money_events WHERE site_id = $1`, [id]);

    // 8. Delete expenses referencing this site
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.expenses WHERE site_id = $1`, [id]);

    // 9. Finally, delete the site itself
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.sites WHERE id = $1`, [id]);

    return { deleted: true };
  }
}
