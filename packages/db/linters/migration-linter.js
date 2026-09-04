#!/usr/bin/env node
/**
 * Migration linter — checks every tenant table for:
 * 1. tenant_id uuid not null
 * 2. ENABLE ROW LEVEL SECURITY
 * 3. FORCE ROW LEVEL SECURITY
 * 4. Policy on current_setting('app.tenant_id')::uuid
 * 5. No finance tables granted to app_ops or app_platform
 *
 * Reads tables.json and inspects the live database.
 * Run: pnpm db:lint
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const FINANCE_TABLES = [
  'rate_cards',
  'extra_charges',
  'billing_ledger',
  'client_money_events',
  'advance_consumptions',
  'machine_financials',
  'client_credit',
  'cash_expected',
  'v_client_receivable',
  'v_unused_advances',
  'v_machine_contribution',
  'v_tenant_kpis',
  'v_projection_inputs',
];

const FINANCE_VIEWS = [
  'v_client_receivable',
  'v_unused_advances',
  'v_machine_contribution',
  'v_cash_expected',
  'v_tenant_kpis',
  'v_projection_inputs',
];

async function lint() {
  const tablesPath = path.join(__dirname, '..', 'tables.json');
  if (!fs.existsSync(tablesPath)) {
    console.log('⚠️  No tables.json found — skipping migration lint (first run)');
    process.exit(0);
  }

  const tables = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
  if (tables.length === 0) {
    console.log('✅ tables.json is empty — nothing to lint yet');
    process.exit(0);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const errors = [];

  for (const table of tables) {
    const { name, kind } = table;
    const fullName = `tenant.${name}`;

    // 1. Check tenant_id column exists and is not null
    const colRes = await client.query(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'tenant' AND table_name = $1 AND column_name = 'tenant_id'`,
      [name],
    );

    if (colRes.rows.length === 0) {
      errors.push(`${fullName}: missing tenant_id column`);
    } else if (colRes.rows[0].is_nullable === 'YES') {
      errors.push(`${fullName}: tenant_id must be NOT NULL`);
    }

    // 2. Check RLS is enabled
    const rlsRes = await client.query(
      `SELECT relname, relrowsecurity, relforcerowsecurity
       FROM pg_class
       WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'tenant')`,
      [name],
    );

    if (rlsRes.rows.length === 0) {
      errors.push(`${fullName}: table not found in tenant schema`);
    } else {
      if (!rlsRes.rows[0].relrowsecurity) {
        errors.push(`${fullName}: missing ENABLE ROW LEVEL SECURITY`);
      }
      if (!rlsRes.rows[0].relforcerowsecurity) {
        errors.push(`${fullName}: missing FORCE ROW LEVEL SECURITY`);
      }
    }

    // 3. Check RLS policy exists
    const policyRes = await client.query(
      `SELECT policyname FROM pg_policies
       WHERE schemaname = 'tenant' AND tablename = $1
       AND qual LIKE '%current_setting(%app.tenant_id%)%'`,
      [name],
    );

    if (policyRes.rows.length === 0) {
      errors.push(`${fullName}: missing RLS policy on current_setting('app.tenant_id')::uuid`);
    }

    // 4. Check no finance grants to app_ops or app_platform.
    // Documented exception (TSD §6, BIL-04, S22): app_ops may INSERT/SELECT
    // client_money_events (receipts/advances with evidence, own entries only
    // via service filter). Balances stay protected — all finance VIEWS
    // remain fully revoked for app_ops (check 5 below).
    const OPS_WRITABLE_FINANCE = { client_money_events: ['INSERT', 'SELECT'] };
    if (kind === 'finance') {
      for (const role of ['app_ops', 'app_platform']) {
        const grantRes = await client.query(
          `SELECT privilege_type FROM information_schema.table_privileges
           WHERE grantee = $1 AND table_schema = 'tenant' AND table_name = $2`,
          [role, name],
        );
        const allowed = role === 'app_ops' ? (OPS_WRITABLE_FINANCE[name] || []) : [];
        const denied = grantRes.rows
          .map((r) => r.privilege_type)
          .filter((p) => !allowed.includes(p));

        if (denied.length > 0) {
          errors.push(`${fullName}: FINANCE table has grants to ${role}: ${denied.join(', ')}`);
        }
      }
    }
  }

  // 5. Check views are not granted to app_ops
  for (const view of FINANCE_VIEWS) {
    for (const role of ['app_ops', 'app_platform']) {
      const grantRes = await client.query(
        `SELECT privilege_type FROM information_schema.table_privileges
         WHERE grantee = $1 AND table_schema = 'tenant' AND table_name = $2`,
        [role, view],
      );

      if (grantRes.rows.length > 0) {
        const privs = grantRes.rows.map((r) => r.privilege_type).join(', ');
        errors.push(`tenant.${view}: FINANCE view has grants to ${role}: ${privs}`);
      }
    }
  }

  await client.end();

  if (errors.length > 0) {
    console.error('❌ Migration lint failed:\n');
    errors.forEach((e) => console.error(`  • ${e}`));
    process.exit(1);
  }

  console.log('✅ Migration lint passed');
}

lint().catch((err) => {
  console.error('Migration linter error:', err);
  process.exit(1);
});
