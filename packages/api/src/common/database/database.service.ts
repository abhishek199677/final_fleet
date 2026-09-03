import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pools: Map<string, Pool> = new Map();

  async onModuleInit() {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'fleetos',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
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

  async query(role: 'owner' | 'ops' | 'platform', text: string, params?: unknown[]) {
    const pool = this.pools.get(role);
    if (!pool) throw new Error(`No pool for role: ${role}`);

    const client = await pool.connect();
    try {
      // Set the role and tenant context
      await client.query(`SET LOCAL ROLE ${role === 'owner' ? 'app_owner' : role === 'ops' ? 'app_ops' : 'app_platform'}`);

      if (role !== 'platform') {
        // For tenant roles, set the tenant_id
        // This will be overridden by the TenantContext middleware per request
        await client.query(`SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001'`);
      }

      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  async queryWithTenant(tenantId: string, role: 'owner' | 'ops', text: string, params?: unknown[]) {
    const pool = this.pools.get(role);
    if (!pool) throw new Error(`No pool for role: ${role}`);

    const client = await pool.connect();
    try {
      await client.query(`SET LOCAL ROLE ${role === 'owner' ? 'app_owner' : 'app_ops'}`);
      await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
      return await client.query(text, params);
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
