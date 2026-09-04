#!/usr/bin/env node
/**
 * Seed script — creates test tenant, users, machines, clients, and sample data
 * Run: pnpm db:seed
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleetos';

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('🌱 Seeding database...');

    // Create test tenant
    await client.query(`
      INSERT INTO platform.tenants (id, name, slug, country, base_currency, status)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Construction', 'demo', 'IN', 'INR', 'active')
      ON CONFLICT (id) DO NOTHING
    `);

    // Create tenant settings
    await client.query(`
      INSERT INTO platform.tenant_settings (tenant_id, working_days_per_month, working_units_per_day, evidence_policy, fx_defaults)
      VALUES ('00000000-0000-0000-0000-000000000001', 26, 8, '{}', '{}')
      ON CONFLICT (tenant_id) DO NOTHING
    `);

    // Create entitlements
    await client.query(`
      INSERT INTO platform.entitlements (tenant_id, plan, machine_limit, user_limit)
      VALUES ('00000000-0000-0000-0000-000000000001', 'pilot', 50, 20)
      ON CONFLICT (tenant_id) DO NOTHING
    `);

    // Create owner user (cognito_sub for local auth)
    await client.query(`
      INSERT INTO tenant.users (id, tenant_id, cognito_sub, email, name, role, is_active, client_uuid)
      VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'owner-local', 'demo@fleetos.com', 'Demo Owner', 'owner', true, gen_random_uuid())
      ON CONFLICT (id) DO NOTHING
    `);

    // Create ops user
    await client.query(`
      INSERT INTO tenant.users (id, tenant_id, cognito_sub, email, name, role, is_active, client_uuid)
      VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'ops-local', 'ops@fleetos.com', 'Demo Ops', 'ops', true, gen_random_uuid())
      ON CONFLICT (id) DO NOTHING
    `);

    // Create machines
    const machines = [
      { code: 'EXC-001', type: 'excavator', make: 'Caterpillar', model: '320', year: 2020, meter: 4500 },
      { code: 'EXC-002', type: 'excavator', make: 'Komatsu', model: 'PC200', year: 2019, meter: 6200 },
      { code: 'LDR-001', type: 'wheel_loader', make: 'Volvo', model: 'L120', year: 2021, meter: 3200 },
      { code: 'DMP-001', type: 'dump_truck', make: 'HD325', model: 'HD325', year: 2020, meter: 8900 },
      { code: 'DOZ-001', type: 'dozer', make: 'Caterpillar', model: 'D6', year: 2018, meter: 7800 },
    ];

    for (const m of machines) {
      await client.query(`
        INSERT INTO tenant.machines (tenant_id, code, type, make, model, year, current_meter, meter_unit_label, primary_meter_type, status_flag, client_uuid)
        VALUES ('00000000-0000-0000-0000-000000000001', $1, $2, $3, $4, $5, $6, 'hours', 'hours', 'available', gen_random_uuid())
        ON CONFLICT (tenant_id, code) DO NOTHING
      `, [m.code, m.type, m.make, m.model, m.year, m.meter]);
    }

    // Create clients
    const clientNames = ['BuildIt Corp', 'RoadWorks Inc', 'Metro Construction'];
    for (const name of clientNames) {
      await client.query(`
        INSERT INTO tenant.clients (tenant_id, name, currency, payment_terms_days, client_uuid)
        VALUES ('00000000-0000-0000-0000-000000000001', $1, 'INR', 30, gen_random_uuid())
        ON CONFLICT DO NOTHING
      `, [name]);
    }

    // Create operators
    const operatorNames = ['Ahmed Hassan', 'Carlos Rodriguez', 'Mike Johnson'];
    for (const name of operatorNames) {
      await client.query(`
        INSERT INTO tenant.operators (tenant_id, name, is_active, client_uuid)
        VALUES ('00000000-0000-0000-0000-000000000001', $1, true, gen_random_uuid())
        ON CONFLICT DO NOTHING
      `, [name]);
    }

    // Create expense categories
    const categories = ['Fuel', 'Maintenance', 'Parts', 'Labour', 'Transport', 'Permits', 'Insurance', 'Other'];
    for (const cat of categories) {
      await client.query(`
        INSERT INTO tenant.expense_categories (tenant_id, name)
        VALUES ('00000000-0000-0000-0000-000000000001', $1)
        ON CONFLICT DO NOTHING
      `, [cat]);
    }

    // Create cash accounts
    await client.query(`
      INSERT INTO tenant.cash_accounts (tenant_id, name, type, currency, is_default)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Main Cash', 'site_cash', 'INR', true)
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Seed completed successfully');
    console.log('');
    console.log('Test accounts (login via /api/auth/login):');
    console.log('  Owner: demo@fleetos.com');
    console.log('  Ops:   ops@fleetos.com');

    await seedDemoHistory(client);
    await seedDemoBilling(client);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Demo history (S60-lite): 14 days of sessions, fuel, downtime and expenses
 * for the demo tenant so dashboards render realistically. Idempotent — skips
 * entirely when sessions already exist.
 */
async function seedDemoHistory(client) {
  const TENANT = '00000000-0000-0000-0000-000000000001';
  const OWNER = '00000000-0000-0000-0000-000000000010';
  const existing = await client.query(`SELECT COUNT(*)::int AS n FROM tenant.work_sessions WHERE tenant_id = $1`, [TENANT]);
  if (existing.rows[0].n > 0) {
    console.log('ℹ️  Demo history already present — skipping');
    return;
  }

  const q = async (text, params = []) => (await client.query(text, params)).rows;

  // Site + deployments for the first three machines
  const clientRow = (await q(`SELECT id FROM tenant.clients WHERE tenant_id = $1 ORDER BY name LIMIT 1`, [TENANT]))[0];
  const siteRows = await q(
    `INSERT INTO tenant.sites (tenant_id, client_id, name, location, client_uuid)
     VALUES ($1, $2, 'Demo Quarry Site', 'Demo District', gen_random_uuid())
     ON CONFLICT DO NOTHING RETURNING id`,
    [TENANT, clientRow.id],
  );
  const siteId = siteRows.length > 0
    ? siteRows[0].id
    : (await q(`SELECT id FROM tenant.sites WHERE tenant_id = $1 LIMIT 1`, [TENANT]))[0].id;

  const machines = await q(`SELECT id, code, current_meter FROM tenant.machines WHERE tenant_id = $1 ORDER BY code LIMIT 3`, [TENANT]);
  const operators = await q(`SELECT id FROM tenant.operators WHERE tenant_id = $1 ORDER BY name`, [TENANT]);
  const depIds = [];
  for (const m of machines) {
    const dep = await q(
      `INSERT INTO tenant.deployments (tenant_id, machine_id, site_id, start_date, status, client_uuid)
       VALUES ($1, $2, $3, CURRENT_DATE - 30, 'active', gen_random_uuid()) RETURNING id`,
      [TENANT, m.id, siteId],
    );
    depIds.push({ machine_id: m.id, deployment_id: dep[0].id, meter: Number(m.current_meter) });
  }

  // Default service template: General service every 250h, warning 20 (MNT-01).
  // EXC-001 is set just past due so the maintenance alert fires.
  for (let i = 0; i < depIds.length; i++) {
    const d = depIds[i];
    const nextDue = i === 0 ? d.meter - 10 : d.meter + 240 - i * 30;
    await q(
      `INSERT INTO tenant.maintenance_tasks (tenant_id, machine_id, name, trigger, interval_value, warning_value, last_done_value, last_done_date, next_due_value, client_uuid)
       VALUES ($1, $2, 'General service', 'meter', 250, 20, $3, CURRENT_DATE - 200, $4, gen_random_uuid())`,
      [TENANT, d.machine_id, nextDue - 250, nextDue],
    );
  }

  // 14 days of sessions (deterministic pattern, some rest days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let back = 13; back >= 0; back--) {
    const day = new Date(today.getTime() - back * 86_400_000);
    for (let i = 0; i < depIds.length; i++) {
      const d = depIds[i];
      if ((back + i) % 5 === 4) continue; // rest day
      const units = 4 + ((back * 3 + i * 2) % 6); // 4..9
      const start = new Date(day.getTime() + (7 + i) * 3_600_000);
      const end = new Date(start.getTime() + (6 + ((back + i) % 3)) * 3_600_000);
      const startMeter = d.meter;
      d.meter += units;
      await q(
        `INSERT INTO tenant.work_sessions (tenant_id, machine_id, deployment_id, operator_id, start_at, end_at, start_meter, end_meter, units_run, start_evidence, end_evidence, billable, created_by, client_uuid, source, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual','manual',true,$10,gen_random_uuid(),'seed',$5)`,
        [TENANT, d.machine_id, d.deployment_id, operators[i % operators.length].id,
         start.toISOString(), end.toISOString(), startMeter, d.meter, units, OWNER],
      );
      if (back % 3 === 0) {
        const litres = 40 + ((back * 7 + i * 13) % 50);
        await q(
          `INSERT INTO tenant.fuel_logs (tenant_id, machine_id, litres, cost_minor, currency, base_minor, created_by, client_uuid)
           VALUES ($1,$2,$3,$4,'INR',$4,$5,gen_random_uuid())`,
          [TENANT, d.machine_id, litres, Math.round(litres * 9500), OWNER],
        );
      }
    }
  }
  // Push machine meters forward to the latest session meter
  for (const d of depIds) {
    await q(`UPDATE tenant.machines SET current_meter = $1 WHERE id = $2`, [d.meter, d.machine_id]);
  }

  // Downtime samples
  await q(
    `INSERT INTO tenant.downtime_segments (tenant_id, machine_id, started_at, ended_at, reason_code, note, created_by, client_uuid)
     VALUES ($1,$2,NOW() - INTERVAL '5 days',NOW() - INTERVAL '5 days' + INTERVAL '3 hours','breakdown','Hydraulic hose burst',$3,gen_random_uuid())`,
    [TENANT, depIds[1].machine_id, OWNER],
  );
  await q(
    `INSERT INTO tenant.downtime_segments (tenant_id, machine_id, started_at, ended_at, reason_code, note, created_by, client_uuid)
     VALUES ($1,$2,NOW() - INTERVAL '1 day',NOW() - INTERVAL '1 day' + INTERVAL '2 hours','no_diesel','Tanker delayed',$3,gen_random_uuid())`,
    [TENANT, depIds[2].machine_id, OWNER],
  );

  // Expenses + one receipt so finance views are non-empty
  const cat = (await q(`SELECT id FROM tenant.expense_categories WHERE tenant_id = $1 AND name = 'Transport'`, [TENANT]))[0];
  const acct = (await q(`SELECT id FROM tenant.cash_accounts WHERE tenant_id = $1 LIMIT 1`, [TENANT]))[0];
  if (cat && acct) {
    await q(
      `INSERT INTO tenant.expenses (tenant_id, date, category_id, description, currency, amount_minor, base_minor, cash_account_id, paid_by, allocation_type, created_by, client_uuid)
       VALUES ($1,CURRENT_DATE - 2,$2,'Spare parts run','INR',1500000,1500000,$3,'Demo Ops','overhead',$4,gen_random_uuid())`,
      [TENANT, cat.id, acct.id, OWNER],
    );
  }
  await q(
    `INSERT INTO tenant.client_money_events (tenant_id, client_id, event_type, currency, amount_minor, base_minor, mode, reference, event_date, created_by, client_uuid)
     VALUES ($1,$2,'receipt','INR',5000000,5000000,'bank','REF-DEMO-001',CURRENT_DATE - 3,$3,gen_random_uuid())`,
    [TENANT, clientRow.id, OWNER],
  );

  console.log('✅ Demo history seeded (14 days, 3 machines)');
}

/** Demo rate card + extra charge so billing runs produce a ledger (idempotent). */
async function seedDemoBilling(client) {
  const TENANT = '00000000-0000-0000-0000-000000000001';
  const OWNER = '00000000-0000-0000-0000-000000000010';
  const existing = await client.query(`SELECT COUNT(*)::int AS n FROM tenant.rate_cards WHERE tenant_id = $1`, [TENANT]);
  if (existing.rows[0].n > 0) {
    console.log('ℹ️  Demo billing already present — skipping');
    return;
  }
  const deps = await client.query(`SELECT id FROM tenant.deployments WHERE tenant_id = $1 ORDER BY start_date LIMIT 3`, [TENANT]);
  for (const d of deps.rows) {
    await client.query(
      `INSERT INTO tenant.rate_cards (tenant_id, deployment_id, effective_from, strategy, rate_minor, currency, min_units_per_day)
       VALUES ($1, $2, CURRENT_DATE - 30, 'hourly', 500000, 'INR', 4)`,
      [TENANT, d.id],
    );
  }
  if (deps.rows.length > 0) {
    await client.query(
      `INSERT INTO tenant.extra_charges (tenant_id, deployment_id, kind, date, currency, amount_minor, base_minor, note, created_by, client_uuid)
       VALUES ($1, $2, 'mobilisation', CURRENT_DATE - 10, 'INR', 2000000, 2000000, 'Lowbed mobilisation', $3, gen_random_uuid())`,
      [TENANT, deps.rows[0].id, OWNER],
    );
  }
  console.log('✅ Demo billing seeded (rate cards + mobilisation)');
}

seed();
