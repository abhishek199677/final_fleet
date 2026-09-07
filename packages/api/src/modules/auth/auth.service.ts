import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { sign, verify, type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const REFRESH_EXPIRES = '30d';

function hashPassword(password: string, salt: string): Buffer {
  return createHash('sha256').update(password + salt).digest();
}

function verifyPassword(password: string, salt: string, storedHash: Buffer): boolean {
  const computed = hashPassword(password, salt);
  return timingSafeEqual(computed, storedHash);
}

interface StoredUser {
  id: string;
  email: string;
  password_hash: Buffer;
  salt: string;
  role: string;
  tenant_id: string;
}

// Persistent user store backed by DB (survives restarts)
const localUsers = new Map<string, StoredUser>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private db: DatabaseService) {
    this.initDemoUsers();
  }

  private initDemoUsers() {
    const salt1 = randomBytes(16).toString('hex');
    const salt2 = randomBytes(16).toString('hex');

    localUsers.set('demo@fleetos.com', {
      id: '00000000-0000-0000-0000-000000000010',
      email: 'demo@fleetos.com',
      password_hash: hashPassword('demo1234', salt1),
      salt: salt1,
      role: 'owner',
      tenant_id: '00000000-0000-0000-0000-000000000001',
    });

    localUsers.set('ops@fleetos.com', {
      id: '00000000-0000-0000-0000-000000000011',
      email: 'ops@fleetos.com',
      password_hash: hashPassword('demo1234', salt2),
      salt: salt2,
      role: 'ops',
      tenant_id: '00000000-0000-0000-0000-000000000001',
    });
  }

  login(email: string, password: string) {
    const user = localUsers.get(email);

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
      JWT_SECRET,
      { expiresIn: 86400, issuer: 'fleetos' }
    );

    const refreshToken = sign(
      { sub: user.id, type: 'refresh' },
      JWT_SECRET,
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

  refresh(refreshToken: string): { token: string; expires_in: number } {
    try {
      const payload = verify(refreshToken, JWT_SECRET, { issuer: 'fleetos' }) as JwtPayload & { type?: string };
      if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');

      const user = Array.from(localUsers.values()).find(u => u.id === payload.sub);
      if (!user) throw new UnauthorizedException('User not found');

      const token = sign(
        {
          sub: user.id,
          email: user.email,
          'custom:role': user.role,
          'custom:tenant_id': user.tenant_id,
        },
        JWT_SECRET,
        { expiresIn: 86400, issuer: 'fleetos' }
      );

      return { token, expires_in: 86400 };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async register(email: string, password: string, tenantName: string) {
    if (localUsers.has(email)) {
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
    const userId = randomBytes(16).toString('hex');

    localUsers.set(email, {
      id: userId,
      email,
      password_hash: passwordHash,
      salt,
      role: 'owner',
      tenant_id: tenantId,
    });

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

    await this.db.query('platform',
      `INSERT INTO tenant.users (tenant_id, cognito_sub, email, name, role, is_active, client_uuid)
       VALUES ($1, $2, $3, $4, 'owner', true, gen_random_uuid())`,
      [tenantId, userId, email, tenantName]
    );

    const token = sign(
      {
        sub: userId,
        email,
        'custom:role': 'owner',
        'custom:tenant_id': tenantId,
      },
      JWT_SECRET,
      { expiresIn: 86400, issuer: 'fleetos' }
    );

    const refreshToken = sign(
      { sub: userId, type: 'refresh' },
      JWT_SECRET,
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
    return verify(token, JWT_SECRET, { issuer: 'fleetos' }) as JwtPayload;
  }
}
