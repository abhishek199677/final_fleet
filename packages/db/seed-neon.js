#!/usr/bin/env node
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sql = neon(DATABASE_URL);

async function seed() {
  console.log('🌱 Seeding database...');

  await sql`INSERT INTO platform.tenants (id, name, slug, country, base_currency, status) VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Construction', 'demo', 'IN', 'INR', 'active') ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO platform.tenant_settings (tenant_id, working_days_per_month, working_units_per_day, evidence_policy, fx_defaults) VALUES ('00000000-0000-0000-0000-000000000001', 26, 8, '{}', '{}') ON CONFLICT (tenant_id) DO NOTHING`;
  await sql`INSERT INTO platform.entitlements (tenant_id, plan, machine_limit, user_limit) VALUES ('00000000-0000-0000-0000-000000000001', 'pilot', 50, 20) ON CONFLICT (tenant_id) DO NOTHING`;

  await sql`INSERT INTO tenant.users (id, tenant_id, cognito_sub, email, name, role, is_active, client_uuid) VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'owner-local', 'demo@fleetos.com', 'Demo Owner', 'owner', true, gen_random_uuid()) ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO tenant.users (id, tenant_id, cognito_sub, email, name, role, is_active, client_uuid) VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'ops-local', 'ops@fleetos.com', 'Demo Ops', 'ops', true, gen_random_uuid()) ON CONFLICT (id) DO NOTHING`;

  const machines = [
    ['EXC-001', 'excavator', 'Caterpillar', '320', 2020, 4500],
    ['EXC-002', 'excavator', 'Komatsu', 'PC200', 2019, 6200],
    ['LDR-001', 'wheel_loader', 'Volvo', 'L120', 2021, 3200],
    ['DMP-001', 'dump_truck', 'HD325', 'HD325', 2020, 8900],
    ['DOZ-001', 'dozer', 'Caterpillar', 'D6', 2018, 7800],
  ];
  for (const m of machines) {
    await sql`INSERT INTO tenant.machines (tenant_id, code, type, make, model, year, current_meter, meter_unit_label, primary_meter_type, status_flag, client_uuid) VALUES ('00000000-0000-0000-0000-000000000001', ${m[0]}, ${m[1]}, ${m[2]}, ${m[3]}, ${m[4]}, ${m[5]}, 'hours', 'hours', 'available', gen_random_uuid()) ON CONFLICT (tenant_id, code) DO NOTHING`;
  }

  for (const name of ['BuildIt Corp', 'RoadWorks Inc', 'Metro Construction']) {
    await sql`INSERT INTO tenant.clients (tenant_id, name, currency, payment_terms_days, client_uuid) VALUES ('00000000-0000-0000-0000-000000000001', ${name}, 'INR', 30, gen_random_uuid()) ON CONFLICT DO NOTHING`;
  }

  for (const name of ['Ahmed Hassan', 'Carlos Rodriguez', 'Mike Johnson']) {
    await sql`INSERT INTO tenant.operators (tenant_id, name, is_active, client_uuid) VALUES ('00000000-0000-0000-0000-000000000001', ${name}, true, gen_random_uuid()) ON CONFLICT DO NOTHING`;
  }

  for (const cat of ['Fuel', 'Maintenance', 'Parts', 'Labour', 'Transport', 'Permits', 'Insurance', 'Other']) {
    await sql`INSERT INTO tenant.expense_categories (tenant_id, name) VALUES ('00000000-0000-0000-0000-000000000001', ${cat}) ON CONFLICT DO NOTHING`;
  }

  await sql`INSERT INTO tenant.cash_accounts (tenant_id, name, type, currency, is_default) VALUES ('00000000-0000-0000-0000-000000000001', 'Main Cash', 'site_cash', 'INR', true) ON CONFLICT DO NOTHING`;

  console.log('✅ Base seed done');
  await seedHistory();
  await seedBilling();
}

async function seedHistory() {
  const T = '00000000-0000-0000-0000-000000000001';
  const O = '00000000-0000-0000-0000-000000000010';
  const existing = await sql`SELECT COUNT(*)::int AS n FROM tenant.work_sessions WHERE tenant_id = ${T}`;
  if (existing[0].n > 0) { console.log('ℹ️  Demo history already present'); return; }

  const clientRow = (await sql`SELECT id FROM tenant.clients WHERE tenant_id = ${T} ORDER BY name LIMIT 1`)[0];
  
  const siteRows = await sql`INSERT INTO tenant.sites (tenant_id, client_id, name, location, client_uuid) VALUES (${T}, ${clientRow.id}, 'Demo Quarry Site', 'Demo District', gen_random_uuid()) ON CONFLICT DO NOTHING RETURNING id`;
  let siteId;
  if (siteRows.length > 0) {
    siteId = siteRows[0].id;
  } else {
    siteId = (await sql`SELECT id FROM tenant.sites WHERE tenant_id = ${T} LIMIT 1`)[0].id;
  }

  const machines = await sql`SELECT id, code, current_meter FROM tenant.machines WHERE tenant_id = ${T} ORDER BY code LIMIT 3`;
  const operators = await sql`SELECT id FROM tenant.operators WHERE tenant_id = ${T} ORDER BY name`;
  const depIds = [];
  for (const m of machines) {
    const dep = await sql`INSERT INTO tenant.deployments (tenant_id, machine_id, site_id, start_date, status, client_uuid) VALUES (${T}, ${m.id}, ${siteId}, CURRENT_DATE - 30, 'active', gen_random_uuid()) RETURNING id`;
    depIds.push({ machine_id: m.id, deployment_id: dep[0].id, meter: Number(m.current_meter) });
  }

  for (let i = 0; i < depIds.length; i++) {
    const d = depIds[i];
    const nextDue = i === 0 ? d.meter - 10 : d.meter + 240 - i * 30;
    await sql`INSERT INTO tenant.maintenance_tasks (tenant_id, machine_id, name, trigger, interval_value, warning_value, last_done_value, last_done_date, next_due_value, client_uuid) VALUES (${T}, ${d.machine_id}, 'General service', 'meter', 250, 20, ${nextDue - 250}, CURRENT_DATE - 200, ${nextDue}, gen_random_uuid())`;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let back = 13; back >= 0; back--) {
    const day = new Date(today.getTime() - back * 86_400_000);
    for (let i = 0; i < depIds.length; i++) {
      const d = depIds[i];
      if ((back + i) % 5 === 4) continue;
      const units = 4 + ((back * 3 + i * 2) % 6);
      const start = new Date(day.getTime() + (7 + i) * 3_600_000);
      const end = new Date(start.getTime() + (6 + ((back + i) % 3)) * 3_600_000);
      const startMeter = d.meter;
      d.meter += units;
      await sql`INSERT INTO tenant.work_sessions (tenant_id, machine_id, deployment_id, operator_id, start_at, end_at, start_meter, end_meter, units_run, start_evidence, end_evidence, billable, created_by, client_uuid, source, created_at) VALUES (${T},${d.machine_id},${d.deployment_id},${operators[i % operators.length].id},${start.toISOString()},${end.toISOString()},${startMeter},${d.meter},${units},'manual','manual',true,${O},gen_random_uuid(),'seed',${start.toISOString()})`;
      if (back % 3 === 0) {
        const litres = 40 + ((back * 7 + i * 13) % 50);
        await sql`INSERT INTO tenant.fuel_logs (tenant_id, machine_id, litres, cost_minor, currency, base_minor, created_by, client_uuid) VALUES (${T},${d.machine_id},${litres},${Math.round(litres * 9500)},'INR',${Math.round(litres * 9500)},${O},gen_random_uuid())`;
      }
    }
  }
  for (const d of depIds) {
    await sql`UPDATE tenant.machines SET current_meter = ${d.meter} WHERE id = ${d.machine_id}`;
  }

  await sql`INSERT INTO tenant.downtime_segments (tenant_id, machine_id, started_at, ended_at, reason_code, note, created_by, client_uuid) VALUES (${T},${depIds[1].machine_id},NOW() - INTERVAL '5 days',NOW() - INTERVAL '5 days' + INTERVAL '3 hours','breakdown','Hydraulic hose burst',${O},gen_random_uuid())`;
  await sql`INSERT INTO tenant.downtime_segments (tenant_id, machine_id, started_at, ended_at, reason_code, note, created_by, client_uuid) VALUES (${T},${depIds[2].machine_id},NOW() - INTERVAL '1 day',NOW() - INTERVAL '1 day' + INTERVAL '2 hours','no_diesel','Tanker delayed',${O},gen_random_uuid())`;

  const cat = (await sql`SELECT id FROM tenant.expense_categories WHERE tenant_id = ${T} AND name = 'Transport'`)[0];
  const acct = (await sql`SELECT id FROM tenant.cash_accounts WHERE tenant_id = ${T} LIMIT 1`)[0];
  if (cat && acct) {
    await sql`INSERT INTO tenant.expenses (tenant_id, date, category_id, description, currency, amount_minor, base_minor, cash_account_id, paid_by, allocation_type, created_by, client_uuid) VALUES (${T},CURRENT_DATE - 2,${cat.id},'Spare parts run','INR',1500000,1500000,${acct.id},'Demo Ops','overhead',${O},gen_random_uuid())`;
  }
  await sql`INSERT INTO tenant.client_money_events (tenant_id, client_id, event_type, currency, amount_minor, base_minor, mode, reference, event_date, created_by, client_uuid) VALUES (${T},${clientRow.id},'receipt','INR',5000000,5000000,'bank','REF-DEMO-001',CURRENT_DATE - 3,${O},gen_random_uuid())`;

  console.log('✅ Demo history seeded (14 days, 3 machines)');
}

async function seedBilling() {
  const T = '00000000-0000-0000-0000-000000000001';
  const O = '00000000-0000-0000-0000-000000000010';
  const existing = await sql`SELECT COUNT(*)::int AS n FROM tenant.rate_cards WHERE tenant_id = ${T}`;
  if (existing[0].n > 0) { console.log('ℹ️  Demo billing already present'); return; }

  const deps = await sql`SELECT id FROM tenant.deployments WHERE tenant_id = ${T} ORDER BY start_date LIMIT 3`;
  for (const d of deps) {
    await sql`INSERT INTO tenant.rate_cards (tenant_id, deployment_id, effective_from, strategy, rate_minor, currency, min_units_per_day) VALUES (${T}, ${d.id}, CURRENT_DATE - 30, 'hourly', 500000, 'INR', 4)`;
  }
  if (deps.length > 0) {
    await sql`INSERT INTO tenant.extra_charges (tenant_id, deployment_id, kind, date, currency, amount_minor, base_minor, note, created_by, client_uuid) VALUES (${T}, ${deps[0].id}, 'mobilisation', CURRENT_DATE - 10, 'INR', 2000000, 2000000, 'Lowbed mobilisation', ${O}, gen_random_uuid())`;
  }
  console.log('✅ Demo billing seeded');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
