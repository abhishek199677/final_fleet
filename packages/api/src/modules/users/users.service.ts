import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { randomBytes, createHash } from 'crypto';

/**
 * `tenant.users_role_check` only permits `owner` and `ops`. Validating here
 * turns a typo'd role into a 400 instead of letting Postgres raise 23514 and
 * the filter hand back a bare 500.
 */
function assertRole(role: string): 'owner' | 'ops' {
  if (role !== 'owner' && role !== 'ops') {
    throw new BadRequestException('role must be one of owner, ops');
  }
  return role;
}

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
    assertRole(data.role);
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

  /**
   * Create a tenant user and mint a single-use invite token.
   *
   * An invite row in tenant.users is not enough to sign in — login reads
   * tenant.user_credentials — so the invitee must redeem this token to set
   * their own password. Only the SHA-256 digest is persisted.
   *
   * If `password` is supplied the owner sets it up-front instead, and the
   * invitee can log in immediately (the token is still returned as a fallback
   * so they can rotate it themselves).
   */
  async invite(tenantId: string, data: { email: string; name: string; role: string; password?: string }) {
    assertRole(data.role);
    const existing = await this.findByEmail(tenantId, data.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const inviteToken = randomBytes(32).toString('hex');
    const inviteTokenHash = createHash('sha256').update(inviteToken).digest('hex');

    const clientUuid = randomBytes(16).toString('hex');
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.users (tenant_id, cognito_sub, email, name, role, is_active, client_uuid, invite_token_hash, invite_expires_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7, NOW() + interval '7 days')
       RETURNING id, tenant_id, email, name, role, is_active, client_uuid, created_at`,
      [tenantId, randomBytes(16).toString('hex'), data.email, data.name, data.role, clientUuid, inviteTokenHash]);

    const user = result.rows[0];

    if (data.password) {
      await this.createCredentials(tenantId, user.id, data.email, data.password);
    }

    return { ...user, invite_token: inviteToken };
  }

  /**
   * Hash + persist a password for a tenant user. Mirrors the register() flow
   * (sha256(password + salt)) so login/refresh treat both identically.
   */
  private async createCredentials(tenantId: string, userId: string, email: string, password: string) {
    const salt = randomBytes(16).toString('hex');
    const passwordHash = createHash('sha256').update(password + salt).digest('hex');
    await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.user_credentials (user_id, tenant_id, email, password_hash, salt)
       VALUES ($1, $2, lower($3), $4, $5)`,
      [userId, tenantId, email, passwordHash, salt]);
  }

  async update(tenantId: string, id: string, data: { name?: string; role?: string; is_active?: boolean }) {
    if (data.role !== undefined) assertRole(data.role);
    if (data.name !== undefined && !String(data.name).trim()) {
      throw new BadRequestException('name cannot be empty');
    }
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

  async updateNotificationPrefs(tenantId: string, id: string, prefs: Record<string, boolean>) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `UPDATE tenant.users SET notification_preferences = $2 WHERE id = $1 RETURNING *`,
      [id, JSON.stringify(prefs)]);
    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }
    return result.rows[0];
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
