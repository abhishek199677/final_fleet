#!/usr/bin/env node
/**
 * Seed script — creates test tenant, users, machines, clients, and sample data
 * Run: pnpm db:seed
 */

const path = require('path');
const fs = require('fs');

// Load .env from repo root (packages/db/.env not expected)
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const { Client } = require('pg');

// DATABASE_URL wins (Neon or any URL-style target); DB_* vars are the local
// fallback. SSL follows the URL's sslmode (Neon requires it, local/CI don't).
const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_URL.includes('sslmode=disable') ||
        !process.env.DATABASE_URL.includes('sslmode=')
          ? false
          : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'fleetos',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
    };

async function seed() {
  const client = new Client(config);
  await client.connect();

  try {
    console.log('🌱 Seeding database...');

    // Clear all existing data from tenant and platform schemas
    await clearData(client);

    // Ensure app roles have proper DML permissions
    await ensureGrants(client);

    console.log('✅ Seed completed successfully (no demo data inserted)');
    console.log('');
    console.log('Note: Demo tenant and users will be created on first login via auth service.');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Truncate all tables in tenant and platform schemas.
 */
async function clearData(client) {
  try {
    // Get tenant tables (only base tables, not views)
    const tenantResult = await client.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'tenant' AND table_type = 'BASE TABLE'"
    );
    const tenantTables = tenantResult.rows;

    // Get platform tables (only base tables)
    const platformResult = await client.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'platform' AND table_type = 'BASE TABLE'"
    );
    const platformTables = platformResult.rows;

    const allTables = [...tenantTables, ...platformTables];

    if (allTables.length === 0) {
      console.log('ℹ️  No tables found in tenant/platform schemas to clear');
      return;
    }

    // Build truncate statement with CASCADE
    const truncateList = allTables
      .map(t => `"${t.table_schema}"."${t.table_name}"`)
      .join(', ');
    await client.query(`TRUNCATE TABLE ${truncateList} CASCADE`);
    console.log(`🗑️  Cleared ${allTables.length} tables from tenant and platform schemas`);
  } catch (err) {
    console.error('❌ Failed to clear data:', err);
    throw err;
  }
}

/**
 * Ensure app roles have proper DML permissions on tenant schema
 */
async function ensureGrants(client) {
  await client.query(`
    GRANT USAGE ON SCHEMA tenant TO app_owner, app_ops;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tenant TO app_owner;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tenant TO app_ops;
    ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_owner;
    ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_ops;
  `);
  console.log('✅ DML grants ensured for app_owner and app_ops');
}

seed();