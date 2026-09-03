import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { createHash, randomBytes } from 'crypto';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES = '24h';

// Simple in-memory user store for local dev (no Cognito needed)
const localUsers = new Map<string, { id: string; email: string; password_hash: string; salt: string; role: string; tenant_id: string }>();

@Injectable()
export class AuthService {
  constructor(private db: DatabaseService) {
    // Initialize with demo users
    this.initDemoUsers();
  }

  private initDemoUsers() {
    const salt1 = randomBytes(16).toString('hex');
    const salt2 = randomBytes(16).toString('hex');

    localUsers.set('demo@fleetos.com', {
      id: '00000000-0000-0000-0000-000000000010',
      email: 'demo@fleetos.com',
      password_hash: createHash('sha256').update('demo1234' + salt1).digest('hex'),
      salt: salt1,
      role: 'owner',
      tenant_id: '00000000-0000-0000-0000-000000000001',
    });

    localUsers.set('ops@fleetos.com', {
      id: '00000000-0000-0000-0000-000000000011',
      email: 'ops@fleetos.com',
      password_hash: createHash('sha256').update('demo1234' + salt2).digest('hex'),
      salt: salt2,
      role: 'ops',
      tenant_id: '00000000-0000-0000-0000-000000000001',
    });
  }

  async login(email: string, password: string) {
    const user = localUsers.get(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordHash = createHash('sha256').update(password + user.salt).digest('hex');
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
    if (localUsers.has(email)) {
      throw new ConflictException('User already exists');
    }

    // Create tenant in DB
    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const tenantResult = await this.db.query('platform',
      `INSERT INTO platform.tenants (name, slug, country, base_currency, status)
       VALUES ($1, $2, 'US', 'USD', 'active') RETURNING id`,
      [tenantName, slug]
    );
    const tenantId = tenantResult.rows[0].id;

    // Create user
    const salt = randomBytes(16).toString('hex');
    const passwordHash = createHash('sha256').update(password + salt).digest('hex');
    const userId = randomBytes(16).toString('hex');

    localUsers.set(email, {
      id: userId,
      email,
      password_hash: passwordHash,
      salt,
      role: 'owner',
      tenant_id: tenantId,
    });

    // Create tenant settings
    await this.db.query('platform',
      `INSERT INTO platform.tenant_settings (tenant_id, working_days_per_month, working_units_per_day, evidence_policy, fx_defaults)
       VALUES ($1, 26, 8, '{}', '{}')`,
      [tenantId]
    );

    // Create entitlements
    await this.db.query('platform',
      `INSERT INTO platform.entitlements (tenant_id, plan, machine_limit, user_limit)
       VALUES ($1, 'pilot', 50, 20)`,
      [tenantId]
    );

    // Create user in DB
    await this.db.query('platform',
      `INSERT INTO tenant.users (tenant_id, cognito_sub, email, name, role, is_active, client_uuid)
       VALUES ($1, $2, $3, $4, 'owner', true, gen_random_uuid())`,
      [tenantId, userId, email, tenantName]
    );

    // Generate JWT
    const token = sign(
      {
        sub: userId,
        email,
        'custom:role': 'owner',
        'custom:tenant_id': tenantId,
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
}
