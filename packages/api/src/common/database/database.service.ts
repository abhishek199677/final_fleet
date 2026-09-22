import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';
import { requestStore } from '../context/request-context';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pools: Map<string, Pool> = new Map();

  onModuleInit(): void {
    const connectionString = process.env.DATABASE_URL;
    const isLocal = !process.env.DB_HOST || process.env.DB_HOST === 'localhost';

    const config: PoolConfig = connectionString
      ? {
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: 10,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'fleetos',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          max: 10,
          ssl: !isLocal ? { rejectUnauthorized: false } : false,
        };

    // Create pools for each role
    this.pools.set('owner', new Pool({ ...config, application_name: 'app_owner' }));
    this.pools.set('ops', new Pool({ ...config, application_name: 'app_ops' }));
    this.pools.set('platform', new Pool({ ...config, application_name: 'app_platform' }));
  }

  async onModuleDestroy() {
    for (const pool of this.pools.values()) {
      await pool.end();
    }
  }

  private static assertUuid(v: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
      throw new Error('Invalid tenant_id');
    }
  }

  async query(role: 'owner' | 'ops' | 'platform', text: string, params?: unknown[]) {
    const pool = this.pools.get(role);
    if (!pool) throw new Error(`No pool for role: ${role}`);

    const client = await pool.connect();
    try {
      // SET LOCAL only applies inside a transaction block; without BEGIN it is
      // a no-op warning and FORCE RLS queries fail (TSD §2.2).
      await client.query('BEGIN');
      try {
        // Set the role and tenant context
        await client.query(`SET LOCAL ROLE ${role === 'owner' ? 'app_owner' : role === 'ops' ? 'app_ops' : 'app_platform'}`);

        if (role !== 'platform') {
          // For tenant roles, set the tenant_id
          // This will be overridden by the TenantContext middleware per request
          await client.query(`SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001'`);
        }

        const result = await client.query(text, params);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    } finally {
      client.release();
    }
  }

  async queryWithTenant(tenantId: string, role: 'owner' | 'ops', text: string, params?: unknown[]) {
    const pool = this.pools.get(role);
    if (!pool) throw new Error(`No pool for role: ${role}`);
    DatabaseService.assertUuid(tenantId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      try {
        await client.query(`SET LOCAL ROLE ${role === 'owner' ? 'app_owner' : 'app_ops'}`);
        await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
        // Stamp the acting user for fn_audit triggers (read lazily: the JWT
        // guard runs after the request context is created).
        const store = requestStore.getStore();
        const userId = (store?.user as Record<string, unknown> | undefined)?.id;
        // Register mints ids as raw 32-hex (no dashes) while seeded users are
        // canonical UUIDs; fn_audit casts to uuid, so normalize both shapes —
        // the hex-only check keeps SET LOCAL injection-safe.
        if (typeof userId === 'string') {
          const hex = userId.replace(/-/g, '');
          if (/^[0-9a-f]{32}$/i.test(hex)) {
            const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
            await client.query(`SET LOCAL app.user_id = '${uuid}'`);
          }
        }
        const result = await client.query(text, params);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    } finally {
      client.release();
    }
  }

  getPool(role: 'owner' | 'ops' | 'platform'): Pool {
    const pool = this.pools.get(role);
    if (!pool) throw new Error(`No pool for role: ${role}`);
    return pool;
  }
}
