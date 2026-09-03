#!/usr/bin/env node
/**
 * Finance denial test — verifies app_ops and app_platform cannot access finance tables/views.
 * Reads tables.json and runs against a live test database.
 * Run: pnpm test:finance-denial
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const FINANCE_OBJECTS = [
  'rate_cards',
  'extra_charges',
  'billing_ledger',
  'client_money_events',
  'advance_consumptions',
  'machine_financials',
  'client_credit',
  'v_client_receivable',
  'v_unused_advances',
  'v_machine_contribution',
  'v_cash_expected',
  'v_tenant_kpis',
  'v_projection_inputs',
];

async function testFinanceDenial() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const errors = [];
  const roles = ['app_ops', 'app_platform'];

  for (const role of roles) {
    for (const obj of FINANCE_OBJECTS) {
      const isView = obj.startsWith('v_');
      const objType = isView ? 'VIEW' : 'TABLE';
      const fullName = `tenant.${obj}`;

      try {
        // Try to SELECT from the finance object as the restricted role
        await client.query(`SET LOCAL ROLE ${role}`);
        await client.query(`SELECT 1 FROM ${fullName} LIMIT 0`);
        errors.push(`${role}: can SELECT from ${objType} ${fullName} (should be denied)`);
      } catch (err) {
        // Permission denied (42501) is expected
        // Relation not found (42P01) means table doesn't exist yet — skip it
        if (err.code === '42P01') {
          // Table doesn't exist yet — will be tested when created
          continue;
        }
        if (err.code !== '42501') {
          errors.push(`${role}: unexpected error on ${fullName}: ${err.code} ${err.message}`);
        }
      } finally {
        try {
          await client.query('SET LOCAL ROLE postgres');
        } catch {
          // ignore
        }
      }
    }
  }

  await client.end();

  if (errors.length > 0) {
    console.error('❌ Finance denial test failed:\n');
    errors.forEach((e) => console.error(`  • ${e}`));
    process.exit(1);
  }

  console.log('✅ Finance denial test passed');
}

testFinanceDenial().catch((err) => {
  console.error('Finance denial test error:', err);
  process.exit(1);
});
