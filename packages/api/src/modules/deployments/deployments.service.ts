import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

const WITH_NAMES = `d.*, m.code AS machine_code, s.name AS site_name, cl.name AS client_name
  FROM tenant.deployments d
  JOIN tenant.machines m ON m.id = d.machine_id
  JOIN tenant.sites s ON s.id = d.site_id
  JOIN tenant.clients cl ON cl.id = s.client_id`;

@Injectable()
export class DeploymentsService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ${WITH_NAMES} WHERE d.status != 'ended' ORDER BY d.start_date DESC`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ${WITH_NAMES} WHERE d.id = $1`, [id]);
    return result.rows[0];
  }

  async create(tenantId: string, data: Record<string, unknown>, clientUuid: string) {
    // A machine can only have one active deployment. Check first so the user
    // gets a clear 409 message instead of a raw unique-violation 500.
    const existing = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT d.id, m.code AS machine_code, s.name AS site_name
       FROM tenant.deployments d
       JOIN tenant.machines m ON m.id = d.machine_id
       JOIN tenant.sites s ON s.id = d.site_id
       WHERE d.machine_id = $1 AND d.status = 'active' LIMIT 1`,
      [data.machine_id]);
    if (existing.rows.length > 0) {
      const row = existing.rows[0] as { machine_code: string; site_name: string };
      throw new ConflictException(
        `Machine ${row.machine_code} is already deployed at ${row.site_name}. End or release that deployment first.`,
      );
    }
    try {
      const result = await this.db.queryWithTenant(tenantId, 'ops',
        `INSERT INTO tenant.deployments (tenant_id, machine_id, site_id, start_date, end_date, client_uuid)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [tenantId, data.machine_id, data.site_id, data.start_date, data.end_date ?? null, clientUuid]);
      return result.rows[0];
    } catch (err: unknown) {
      // Race-condition safety net: two concurrent creates for the same machine.
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictException(
          'This machine was just deployed by someone else. Refresh and try a different machine.',
        );
      }
      throw err;
    }
  }

  async findActiveForMachine(tenantId: string, machineId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `SELECT ${WITH_NAMES} WHERE d.machine_id = $1 AND d.status = 'active' ORDER BY d.start_date DESC LIMIT 1`, [machineId]);
    return result.rows[0];
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const result = await this.db.queryWithTenant(tenantId, 'ops',
      `UPDATE tenant.deployments SET
        start_date = COALESCE($2, start_date), end_date = COALESCE($3, end_date),
        status = COALESCE($4, status)
       WHERE id = $1 RETURNING *`,
      [id, data.start_date ?? null, data.end_date ?? null, data.status ?? null]);
    if (result.rows.length === 0) throw new NotFoundException('Deployment not found');
    return result.rows[0];
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Deployment not found');

    // Delete related records in the correct order to respect foreign key constraints.

    // 1. Delete advance_consumptions (references billing_ledger)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.advance_consumptions
       WHERE billing_ledger_id IN (SELECT id FROM tenant.billing_ledger WHERE deployment_id = $1)`, [id]);

    // 2. Delete billing_ledger (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.billing_ledger WHERE deployment_id = $1`, [id]);

    // 3. Delete extra_charges (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.extra_charges WHERE deployment_id = $1`, [id]);

    // 4. Delete rate_cards (references deployments)
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.rate_cards WHERE deployment_id = $1`, [id]);

    // 5. Delete work_sessions referencing this deployment
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.work_sessions WHERE deployment_id = $1`, [id]);

    // 6. Finally, delete the deployment itself
    await this.db.queryWithTenant(tenantId, 'owner',
      `DELETE FROM tenant.deployments WHERE id = $1`, [id]);

    return { deleted: true };
  }

  async hold(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.deployments SET status = 'on_hold_payment' WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) throw new NotFoundException('Deployment not found');
    return result.rows[0];
  }

  async release(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.deployments SET status = 'active' WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) throw new NotFoundException('Deployment not found');
    return result.rows[0];
  }
}
