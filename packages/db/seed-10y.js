#!/usr/bin/env node
/**
 * 10-YEAR historical seed for Fleet OS (2016 → present).
 *
 * Generates ~10 years of realistic, internally-consistent data for the demo
 * tenant so MNC buyers can verify dashboards, reports, billing and audit
 * over a long horizon:
 *   - work_sessions (non-overlapping per machine, meter-chained)
 *   - fuel_logs, downtime_segments, expenses, maintenance_visits
 *   - client_money_events (receipts/advances), billing_ledger
 *   - cash_transfers, cash_counts
 *
 * Idempotent: tagged with source='seed-10y'. Re-running deletes prior
 * 10y rows first, then re-seeds. Master data (machines/sites/clients/
 * operators/deployments) is preserved.
 *
 * Run:  node seed-10y.js
 * Env:  DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD (defaults: localhost fleetos postgres/postgres)
 */

const { Client } = require('pg');
const { randomUUID } = require('crypto');

// Load .env from repo root (packages/db/.env not expected)
const envPath = require('path').resolve(__dirname, '../../.env');
if (require('fs').existsSync(envPath)) {
  for (const line of require('fs').readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const TENANT = '00000000-0000-0000-0000-000000000001';
const OWNER = '00000000-0000-0000-0000-000000000010';
const TAG = 'seed-10y';

// Deterministic PRNG (mulberry32) — same data on every run
function prng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = prng(20260922);
const ri = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const DAY = 86_400_000;
const today = new Date(); today.setHours(0, 0, 0, 0);
const START = new Date(today.getTime() - 10 * 365 * DAY); // ~10 years ago
const DAYS = Math.round((today.getTime() - START.getTime()) / DAY);

const DOWNTIME_REASONS = ['breakdown', 'no_diesel', 'no_work_client', 'transport', 'weather', 'police_permit', 'operator_absent', 'other'];
const EXPENSE_CATS = ['Fuel', 'Maintenance', 'Parts', 'Labour', 'Transport', 'Permits', 'Insurance', 'Other'];
const EXPENSE_DESC = {
  Fuel: ['Diesel fill-up', 'Diesel top-up for week', 'Emergency diesel purchase'],
  Maintenance: ['Scheduled service', 'Grease and oil top-up', 'Hydraulic check'],
  Parts: ['Hydraulic filter replacement', 'Engine oil + filters', 'Track shoe replacement', 'Tyre replacement'],
  Labour: ['Overtime mechanic', 'Helper wages', 'Night shift allowance'],
  Transport: ['Lowbed mobilisation', 'Spare parts run', 'Machine shifting'],
  Permits: ['Mining permit renewal', 'Road permit', 'Pollution certificate'],
  Insurance: ['Annual insurance premium', 'Third-party insurance'],
  Other: ['Site office supplies', 'Miscellaneous'],
};
// Units/day by machine type (hours)
const RATE_BY_TYPE = { excavator: 7, dump_truck: 9, dozer: 6, wheel_loader: 6, pipelayer: 5 };

// DATABASE_URL wins (Neon or any URL-style target); DB_* vars are the local
// fallback. SSL follows the URL's sslmode (Neon requires it, local doesn't).
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
    };

async function main() {
  const c = new Client(config);
  await c.connect();
  console.log(`Seeding 10 years (${START.toISOString().slice(0, 10)} → ${today.toISOString().slice(0, 10)}, ${DAYS} days)`);

  const q = (text, params = []) => c.query(text, params);

  // ── Load master data ──
  const machines = (await q(`SELECT id, code, type FROM tenant.machines WHERE tenant_id = $1 ORDER BY code`, [TENANT])).rows;
  const sites = (await q(`SELECT id, name FROM tenant.sites WHERE tenant_id = $1 ORDER BY name`, [TENANT])).rows;
  const clients = (await q(`SELECT id, name FROM tenant.clients WHERE tenant_id = $1 ORDER BY name`, [TENANT])).rows;
  const operators = (await q(`SELECT id, name FROM tenant.operators WHERE tenant_id = $1 ORDER BY name`, [TENANT])).rows;
  const deployments = (await q(`SELECT id, machine_id, site_id, status FROM tenant.deployments WHERE tenant_id = $1`, [TENANT])).rows;
  const cats = (await q(`SELECT id, name FROM tenant.expense_categories WHERE tenant_id = $1`, [TENANT])).rows;
  const accounts = (await q(`SELECT id, name FROM tenant.cash_accounts WHERE tenant_id = $1 ORDER BY name`, [TENANT])).rows;
  if (machines.length === 0) throw new Error('No machines found — run base seed first');

  const depByMachine = new Map(deployments.map((d) => [d.machine_id, d]));
  const catByName = new Map(cats.map((x) => [x.name, x.id]));
  console.log(`Master: ${machines.length} machines, ${sites.length} sites, ${clients.length} clients, ${operators.length} operators`);

  // ── Wipe ALL prior transactional rows for a clean, consistent 10y dataset ──
  // (replaces the small 14-day base-seed history; master data is preserved)
  await q(`DELETE FROM tenant.advance_consumptions WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.billing_ledger WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.extra_charges WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.maintenance_parts WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.maintenance_visit_tasks WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.maintenance_visits WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.work_sessions WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.fuel_logs WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.downtime_segments WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.expenses WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.cash_counts WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.cash_transfers WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.client_money_events WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.alerts WHERE tenant_id = $1`, [TENANT]);
  await q(`DELETE FROM tenant.notifications WHERE tenant_id = $1`, [TENANT]);
  console.log('Cleared all prior transactional rows');

  // ── Per-machine meter state (start low, accumulate forward) ──
  const meter = new Map(machines.map((m) => [m.id, ri(800, 1500)]));
  const depFor = (mid) => depByMachine.get(mid)?.id || null;

  const sessions = [], fuels = [], downtimes = [], expenses = [], visits = [];
  let sessionCount = 0;

  for (let back = DAYS; back >= 0; back--) {
    const day = new Date(START.getTime() + (DAYS - back) * DAY);
    const dow = day.getDay();
    const isSunday = dow === 0;
    const dateStr = day.toISOString().slice(0, 10);

    for (let mi = 0; mi < machines.length; mi++) {
      const m = machines[mi];
      // Rest pattern: Sundays off + deterministic rest rotation + rare holiday
      if (isSunday) continue;
      if ((back + mi * 3) % 11 === 0) continue;
      if (rand() < 0.02) continue; // holiday/rain

      const rate = RATE_BY_TYPE[m.type] || 6;
      const units = Math.round((rate * (0.7 + rand() * 0.6)) * 10) / 10; // ±30%
      const startHour = 7 + (mi % 3);
      const start = new Date(day.getTime() + startHour * 3_600_000 + ri(0, 30) * 60_000);
      const durHrs = Math.max(2, Math.round(units));
      const end = new Date(start.getTime() + durHrs * 3_600_000);

      const startMeter = Math.round(meter.get(m.id) * 10) / 10;
      const endMeter = Math.round((startMeter + units) * 10) / 10;
      meter.set(m.id, endMeter);
      const op = operators[(mi + back) % operators.length];

      sessions.push([TENANT, m.id, depFor(m.id), op.id, start.toISOString(), end.toISOString(),
        startMeter, endMeter, units, 'manual', 'manual', true, OWNER, randomUUID(), TAG, start.toISOString()]);
      sessionCount++;

      // Fuel every ~3rd working day
      if ((back + mi) % 3 === 0) {
        const litres = Math.round(units * (10 + rand() * 6));
        const cost = litres * (8800 + ri(0, 1400)); // paise/L drift
        fuels.push([TENANT, m.id, litres, Math.round(cost), 'INR', Math.round(cost), OWNER, randomUUID(), TAG,
          new Date(day.getTime() + 12 * 3_600_000).toISOString()]);
      }

      // Downtime ~2% of working days (evening, non-overlapping with session)
      if (rand() < 0.02) {
        const dStart = new Date(day.getTime() + 19 * 3_600_000);
        const dEnd = new Date(dStart.getTime() + ri(1, 6) * 3_600_000);
        downtimes.push([TENANT, m.id, dStart.toISOString(), dEnd.toISOString(),
          pick(DOWNTIME_REASONS), 'Seeded historical downtime', OWNER, randomUUID(), TAG, dStart.toISOString()]);
      }
    }

    // Expenses ~2-3/day across fleet
    const nExp = ri(1, 3);
    for (let k = 0; k < nExp; k++) {
      const catName = pick(EXPENSE_CATS);
      const catId = catByName.get(catName);
      if (!catId) continue;
      const m = pick(machines);
      const amt = catName === 'Parts' ? ri(5000, 80000) * 100 : catName === 'Fuel' ? ri(20000, 90000) * 100 : ri(500, 20000) * 100;
      expenses.push([TENANT, dateStr, catId, pick(EXPENSE_DESC[catName]), 'INR', amt, amt,
        accounts.length ? pick(accounts).id : null, pick(['Demo Ops', 'Site Incharge', 'Store Keeper']),
        rand() < 0.6 ? 'machine' : 'overhead', m.id, OWNER, randomUUID(), TAG,
        new Date(day.getTime() + 14 * 3_600_000).toISOString()]);
    }

    // Maintenance visit ~quarterly per machine
    if (back % 91 === 0) {
      for (const m of machines) {
        if (rand() < 0.5) continue;
        visits.push([TENANT, m.id, dateStr, pick(['scheduled', 'breakdown', 'inspection']),
          pick(['Raj Kumar', 'Suresh Patel', 'Anil Singh', 'Vikram Pawar']),
          Math.round(meter.get(m.id)), OWNER, randomUUID(), TAG,
          new Date(day.getTime() + 10 * 3_600_000).toISOString()]);
      }
    }
  }

  console.log(`Generated: ${sessions.length} sessions, ${fuels.length} fuel, ${downtimes.length} downtime, ${expenses.length} expenses, ${visits.length} maintenance`);

  // ── Batch inserts ──
  async function batch(table, cols, rows, size = 800) {
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      const vals = [], params = [];
      chunk.forEach((row, ri2) => {
        vals.push(`(${row.map((_, ci) => `$${ri2 * row.length + ci + 1}`).join(',')})`);
        params.push(...row);
      });
      await q(`INSERT INTO tenant.${table} (${cols}) VALUES ${vals.join(',')}`, params);
      if (i % 4000 === 0) console.log(`  ${table}: ${Math.min(i + size, rows.length)}/${rows.length}`);
    }
  }

  await batch('work_sessions',
    'tenant_id, machine_id, deployment_id, operator_id, start_at, end_at, start_meter, end_meter, units_run, start_evidence, end_evidence, billable, created_by, client_uuid, source, created_at', sessions);
  await batch('fuel_logs',
    'tenant_id, machine_id, litres, cost_minor, currency, base_minor, created_by, client_uuid, source, created_at', fuels);
  await batch('downtime_segments',
    'tenant_id, machine_id, started_at, ended_at, reason_code, note, created_by, client_uuid, source, created_at', downtimes);
  await batch('expenses',
    'tenant_id, date, category_id, description, currency, amount_minor, base_minor, cash_account_id, paid_by, allocation_type, machine_id, created_by, client_uuid, source, created_at', expenses);
  await batch('maintenance_visits',
    'tenant_id, machine_id, visit_date, visit_type, mechanic, meter_at_visit, created_by, client_uuid, source, created_at', visits);

  // ── Receipts: monthly per client over 10 years ──
  const receipts = [];
  for (let mo = 0; mo < 120; mo++) {
    const d = new Date(START.getTime() + mo * 30.4 * DAY);
    if (d > today) break;
    for (const cl of clients) {
      if (rand() < 0.25) continue;
      const amt = ri(500000, 8000000) * 100; // ₹5L–₹80L paise
      receipts.push([TENANT, cl.id, rand() < 0.8 ? 'receipt' : 'advance', 'INR', amt, amt,
        pick(['bank', 'cash', 'upi']), `REF-10Y-${mo}-${cl.name.slice(0, 3).toUpperCase()}`, d.toISOString().slice(0, 10),
        OWNER, randomUUID(), TAG, d.toISOString()]);
    }
  }
  await batch('client_money_events',
    'tenant_id, client_id, event_type, currency, amount_minor, base_minor, mode, reference, event_date, created_by, client_uuid, source, created_at', receipts);
  console.log(`Receipts: ${receipts.length}`);

  // ── Billing ledger: monthly hire per active deployment ──
  const ledger = [];
  const activeDeps = deployments.filter((d) => d.status === 'active');
  for (let mo = 0; mo < 120; mo++) {
    const d = new Date(START.getTime() + mo * 30.4 * DAY);
    if (d > today) break;
    for (const dep of activeDeps) {
      if (rand() < 0.15) continue;
      ledger.push([TENANT, dep.id, d.toISOString().slice(0, 10), 'monthly_hire', 26, 'INR', ri(2000000, 15000000), d.toISOString()]);
    }
  }
  await batch('billing_ledger',
    'tenant_id, deployment_id, entry_date, kind, units, currency, amount_minor, created_at', ledger);
  console.log(`Billing ledger: ${ledger.length}`);

  // ── Cash transfers + counts: monthly ──
  const transfers = [], counts = [];
  for (let mo = 0; mo < 120; mo++) {
    const d = new Date(START.getTime() + mo * 30.4 * DAY);
    if (d > today) break;
    if (accounts.length >= 2) {
      transfers.push([TENANT, accounts[0].id, accounts[1].id, 'INR', ri(100000, 2000000) * 100,
        `Monthly allocation ${d.toISOString().slice(0, 7)}`, d.toISOString().slice(0, 10), OWNER, randomUUID()]);
    }
    if (accounts.length >= 1) {
      counts.push([TENANT, accounts[0].id, d.toISOString().slice(0, 10),
        JSON.stringify([{ denomination: 500, quantity: ri(5, 60) }, { denomination: 100, quantity: ri(10, 100) }]),
        OWNER, randomUUID()]);
    }
  }
  await batch('cash_transfers',
    'tenant_id, from_account_id, to_account_id, currency, amount_minor, reference, transfer_date, created_by, client_uuid', transfers);
  await batch('cash_counts',
    'tenant_id, cash_account_id, count_date, counted, created_by, client_uuid', counts);
  console.log(`Cash: ${transfers.length} transfers, ${counts.length} counts`);

  // ── Push machine meters to final values ──
  for (const m of machines) {
    await q(`UPDATE tenant.machines SET current_meter = $1 WHERE id = $2`, [Math.round(meter.get(m.id)), m.id]);
  }
  console.log('Machine meters updated');

  // ── Summary ──
  const summary = await q(`SELECT
    (SELECT COUNT(*) FROM tenant.work_sessions WHERE tenant_id = $1 AND source = $2) AS sessions,
    (SELECT COUNT(*) FROM tenant.fuel_logs WHERE tenant_id = $1 AND source = $2) AS fuel,
    (SELECT COUNT(*) FROM tenant.downtime_segments WHERE tenant_id = $1 AND source = $2) AS downtime,
    (SELECT COUNT(*) FROM tenant.expenses WHERE tenant_id = $1 AND source = $2) AS expenses,
    (SELECT COUNT(*) FROM tenant.maintenance_visits WHERE tenant_id = $1 AND source = $2) AS visits,
    (SELECT COUNT(*) FROM tenant.client_money_events WHERE tenant_id = $1 AND source = $2) AS receipts,
    (SELECT MIN(start_at) FROM tenant.work_sessions WHERE tenant_id = $1 AND source = $2) AS earliest,
    (SELECT MAX(start_at) FROM tenant.work_sessions WHERE tenant_id = $1 AND source = $2) AS latest`, [TENANT, TAG]);
  console.log('\n✅ 10-YEAR SEED COMPLETE:', JSON.stringify(summary.rows[0], null, 2));
  await c.end();
}

main().catch((e) => { console.error('❌ SEED FAILED:', e); process.exit(1); });
