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
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();
