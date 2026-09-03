import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { createHash, randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES = '24h';

@Injectable()
export class AuthService {
  constructor(private db: DatabaseService) {}

  async login(email: string, password: string) {
    // Find user
    const result = await this.db.query('platform',
      `SELECT u.*, t.slug AS tenant_slug FROM platform.users u
       JOIN platform.tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const passwordHash = this.hashPassword(password, user.password_salt);
    if (passwordHash !== user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const token = sign(
      {
        sub: user.id,
        email: user.email,
        'custom:role': user.role,
        'custom:tenant_id': user.tenant_id,
        'custom:tenant_slug': user.tenant_slug,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    };
  }

  async register(email: string, password: string, tenantName: string) {
    // Check if user exists
    const existing = await this.db.query('platform',
      `SELECT id FROM platform.users WHERE email = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('User already exists');
    }

    // Create tenant
    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const tenantResult = await this.db.query('platform',
      `INSERT INTO platform.tenants (name, slug, base_currency, status)
       VALUES ($1, $2, 'USD', 'active') RETURNING id`,
      [tenantName, slug]
    );
    const tenantId = tenantResult.rows[0].id;

    // Create user with hashed password
    const salt = randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const userResult = await this.db.query('platform',
      `INSERT INTO platform.users (tenant_id, email, password_hash, password_salt, role, is_active)
       VALUES ($1, $2, $3, $4, 'owner', true) RETURNING id`,
      [tenantId, email, passwordHash, salt]
    );
    const userId = userResult.rows[0].id;

    // Create default settings
    await this.db.query('platform',
      `INSERT INTO platform.tenant_settings (tenant_id, working_days_per_month, working_units_per_day, evidence_policy, fx_defaults)
       VALUES ($1, 26, 8, '{}', '{}')`,
      [tenantId]
    );

    // Generate JWT
    const token = sign(
      {
        sub: userId,
        email,
        'custom:role': 'owner',
        'custom:tenant_id': tenantId,
        'custom:tenant_slug': slug,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return {
      token,
      user: {
        id: userId,
        email,
        role: 'owner',
        tenant_id: tenantId,
      },
    };
  }

  private hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(password + salt).digest('hex');
  }
}
