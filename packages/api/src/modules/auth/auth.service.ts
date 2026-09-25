import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { sign, verify, type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}
const REFRESH_EXPIRES = '30d';

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const computed = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
}

interface StoredUser {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: string;
  tenant_id: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private db: DatabaseService) {
    // No demo users initialization
  }

  /**
   * Read stored credentials from tenant.user_credentials (shared by every
   * serverless instance).
   * Uses a raw pool query (no SET LOCAL ROLE) because this runs before any
   * tenant context exists; the DATABASE_URL owner role reads the table
   * directly. `by` is always one of the two literals below, never user input.
   */
  private async findStoredUser(by: 'email' | 'id', value: string): Promise<StoredUser | null> {
    const where = by === 'email' ? 'lower(uc.email) = lower($1)' : 'uc.user_id = $1';
    const res = await this.db.getPool('platform').query(
      `SELECT uc.user_id AS id, uc.email, uc.password_hash, uc.salt, uc.tenant_id, u.role
         FROM tenant.user_credentials uc
         JOIN tenant.users u ON u.id = uc.user_id AND u.tenant_id = uc.tenant_id
        WHERE ${where}
        LIMIT 1`,
      [value],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      password_hash: String(row.password_hash),
      salt: String(row.salt),
      role: String(row.role),
      tenant_id: String(row.tenant_id),
    };
  }

  async login(email: string, password: string) {
    // Always check stored credentials in the DB
    const user = await this.findStoredUser('email', email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!verifyPassword(password, user.salt, user.password_hash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = sign(
      {
        sub: user.id,
        email: user.email,
        'custom:role': user.role,
        'custom:tenant_id': user.tenant_id,
      },
      JWT_SECRET!,
      { expiresIn: 86400, issuer: 'fleetos' }
    );

    const refreshToken = sign(
      { sub: user.id, type: 'refresh' },
      JWT_SECRET!,
      { expiresIn: REFRESH_EXPIRES, issuer: 'fleetos' }
    );

    return Promise.resolve({
      token,
      refresh_token: refreshToken,
      expires_in: 86400,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    });
  }

  async refresh(refreshToken: string): Promise<{ token: string; expires_in: number }> {
    try {
      const payload = verify(refreshToken, JWT_SECRET!, { issuer: 'fleetos' }) as JwtPayload & { type?: string };
      if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');

      let user = null;
      if (payload.sub) {
        user = await this.findStoredUser('id', String(payload.sub));
      }
      if (!user) throw new UnauthorizedException('User not found');

      const token = sign(
        {
          sub: user.id,
          email: user.email,
          'custom:role': user.role,
          'custom:tenant_id': user.tenant_id,
        },
        JWT_SECRET!,
        { expiresIn: 86400, issuer: 'fleetos' }
      );

      return { token, expires_in: 86400 };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async register(email: string, password: string, tenantName: string) {
    // Check if user already exists in the DB
    const existingUser = await this.findStoredUser('email', email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const tenantResult = await this.db.query('platform',
      `INSERT INTO platform.tenants (name, slug, country, base_currency, status)
       VALUES ($1, $2, 'IN', 'INR', 'active') RETURNING id`,
      [tenantName, slug]
    );
    const tenantId = tenantResult.rows[0].id;

    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userId = randomUUID();

    await this.db.query('platform',
      `INSERT INTO platform.tenant_settings (tenant_id, working_days_per_month, working_units_per_day, evidence_policy, fx_defaults)
       VALUES ($1, 26, 8, '{}', '{}')`,
      [tenantId]
    );

    await this.db.query('platform',
      `INSERT INTO platform.entitlements (tenant_id, plan, machine_limit, user_limit)
       VALUES ($1, 'pilot', 50, 20)`,
      [tenantId]
    );

    // Tenant-schema writes must use the owner role (app_platform has no
    // grants on the tenant schema and RLS would block it).
    // `id` must be the same userId used below for user_credentials — it has a
    // gen_random_uuid() default otherwise, which breaks the FK.
    await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.users (id, tenant_id, cognito_sub, email, name, role, is_active, client_uuid)
       VALUES ($1, $2, $3, $4, $5, 'owner', true, gen_random_uuid())`,
      [userId, tenantId, userId, email, tenantName]
    );

    // Persist credentials to the DB so login/refresh work on ANY serverless
    // instance.
    await this.db.getPool('platform').query(
      `INSERT INTO tenant.user_credentials (user_id, tenant_id, email, password_hash, salt)
       VALUES ($1, $2, lower($3), $4, $5)`,
      [userId, tenantId, email, passwordHash, salt],
    );

    // Seed reference data so a brand-new tenant can use every feature
    // immediately: expense categories (expense form needs these) and a
    // default cash account (cash/expense flows need one).
    const defaultCategories = ['Fuel', 'Maintenance', 'Parts', 'Labour', 'Transport', 'Permits', 'Insurance', 'Other'];
    for (const cat of defaultCategories) {
      await this.db.queryWithTenant(tenantId, 'owner',
        `INSERT INTO tenant.expense_categories (tenant_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [tenantId, cat]
      );
    }
    await this.db.queryWithTenant(tenantId, 'owner',
      `INSERT INTO tenant.cash_accounts (tenant_id, name, type, currency, is_default)
       VALUES ($1, 'Main Cash', 'site_cash', 'INR', true) ON CONFLICT DO NOTHING`,
      [tenantId]
    );

    const token = sign(
      {
        sub: userId,
        email,
        'custom:role': 'owner',
        'custom:tenant_id': tenantId,
      },
      JWT_SECRET!,
      { expiresIn: 86400, issuer: 'fleetos' }
    );

    const refreshToken = sign(
      { sub: userId, type: 'refresh' },
      JWT_SECRET!,
      { expiresIn: REFRESH_EXPIRES, issuer: 'fleetos' }
    );

    return {
      token,
      refresh_token: refreshToken,
      expires_in: 86400,
      user: {
        id: userId,
        email,
        role: 'owner',
        tenant_id: tenantId,
      },
    };
  }

  verifyToken(token: string): JwtPayload {
    return verify(token, JWT_SECRET!, { issuer: 'fleetos' }) as JwtPayload;
  }
}