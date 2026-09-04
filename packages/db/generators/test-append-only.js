#!/usr/bin/env node
/**
 * Append-only test — verifies no UPDATE/DELETE grants on transactional tables for app roles.
 * Reads tables.json and runs against a live test database.
 * Run: pnpm test:append-only
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function testAppendOnly() {
  const tablesPath = path.join(__dirname, '..', 'tables.json');
  if (!fs.existsSync(tablesPath)) {
    console.log('⚠️  No tables.json — skipping append-only test');
    process.exit(0);
  }

  const tables = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
  const transactional = tables.filter((t) => t.transactional);

  if (transactional.length === 0) {
    console.log('✅ No transactional tables to test');
    process.exit(0);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleetos' });
  await client.connect();

  const errors = [];

  for (const table of transactional) {
    const { name } = table;
    const fullName = `tenant.${name}`;

    // Check UPDATE/DELETE grants for app roles
    for (const role of ['app_owner', 'app_ops']) {
      const grants = await client.query(
        `SELECT privilege_type FROM information_schema.table_privileges
         WHERE grantee = $1 AND table_schema = 'tenant' AND table_name = $2
         AND privilege_type IN ('UPDATE', 'DELETE')`,
        [role, name],
      );

      if (grants.rows.length > 0) {
        const privs = grants.rows.map((r) => r.privilege_type).join(', ');
        errors.push(`${fullName}: ${role} has ${privs} grants (transactional tables must be append-only)`);
      }
    }
  }

  await client.end();

  if (errors.length > 0) {
    console.error('❌ Append-only test failed:\n');
    errors.forEach((e) => console.error(`  • ${e}`));
    process.exit(1);
  }

  console.log('✅ Append-only test passed');
}

testAppendOnly().catch((err) => {
  console.error('Append-only test error:', err);
  process.exit(1);
});
