import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async findAll(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id, tenant_id, email, name, role, is_active, client_uuid, created_at
       FROM tenant.users ORDER BY name`);
    return result.rows;
  }

  async findById(tenantId: string, id: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id, tenant_id, email, name, role, is_active, client_uuid, created_at
       FROM tenant.users WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }
    return result.rows[0];
  }

  async findByEmail(tenantId: string, email: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT id, tenant_id, email, name, role, is_active, client_uuid, created_at
       FROM tenant.users WHERE email = $1`, [email]);
    return result.rows[0];
  }

  async create(tenantId: string, data: { email: string; name: string; role: string }, clientUuid: string) {
    const existing = await this.findByEmail(tenantId, data.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.users (tenant_id, cognito_sub, email, name, role, is_active, client_uuid)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT (tenant_id, client_uuid) DO NOTHING RETURNING *`,
      [tenantId, randomBytes(16).toString('hex'), data.email, data.name, data.role, clientUuid]);

    if (result.rows.length === 0) {
      return this.findById(tenantId, clientUuid);
    }
    return result.rows[0];
  }

  async invite(tenantId: string, data: { email: string; name: string; role: string }) {
    const existing = await this.findByEmail(tenantId, data.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const clientUuid = randomBytes(16).toString('hex');
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.users (tenant_id, cognito_sub, email, name, role, is_active, client_uuid)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING *`,
      [tenantId, randomBytes(16).toString('hex'), data.email, data.name, data.role, clientUuid]);

    return result.rows[0];
  }

  async update(tenantId: string, id: string, data: { name?: string; role?: string; is_active?: boolean }) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.users 
       SET name = COALESCE($2, name), 
           role = COALESCE($3, role),
           is_active = COALESCE($4, is_active)
       WHERE id = $1 
       RETURNING *`,
      [id, data.name, data.role, data.is_active]);

    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }
    return result.rows[0];
  }

  async deactivate(tenantId: string, id: string) {
    return this.update(tenantId, id, { is_active: false });
  }

  async reactivate(tenantId: string, id: string) {
    return this.update(tenantId, id, { is_active: true });
  }

  async getStats(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT 
         COUNT(*) FILTER (WHERE is_active = true) as active_count,
         COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
         COUNT(*) FILTER (WHERE role = 'owner') as owner_count,
         COUNT(*) FILTER (WHERE role = 'ops') as ops_count
       FROM tenant.users`);
    return result.rows[0];
  }
}
