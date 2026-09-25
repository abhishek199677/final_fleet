#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sql = neon(DATABASE_URL);

async function clearData() {
  try {
    // Get tenant tables (only base tables, not views)
    const tenantResult = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'tenant' AND table_type = 'BASE TABLE'`;
    const tenantTables = tenantResult;

    // Get platform tables (only base tables)
    const platformResult = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'platform' AND table_type = 'BASE TABLE'`;
    const platformTables = platformResult;

    const allTables = [...tenantTables, ...platformTables];

    if (allTables.length === 0) {
      console.log('ℹ️  No tables found in tenant/platform schemas to clear');
      return;
    }

    // Build truncate statement with CASCADE
    const truncateList = allTables
      .map(t => `"${t.table_schema}"."${t.table_name}"`)
      .join(', ');
    await sql`TRUNCATE TABLE ${truncateList} CASCADE`;
    console.log(`🗑️  Cleared ${allTables.length} tables from tenant and platform schemas`);
  } catch (err) {
    console.error('❌ Failed to clear data:', err);
    throw err;
  }
}

async function seed() {
  console.log('🌱 Seeding database...');

  await clearData();

  console.log('✅ Seed completed successfully (no demo data inserted)');
  console.log('');
  console.log('Note: Demo tenant and users will be created on first login via auth service.');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });