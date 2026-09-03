#!/usr/bin/env node
/**
 * Seed script — creates test tenant, users, machines, clients, and sample data
 * Run: pnpm db:seed
 */

const { Client } = require('pg');
const { randomBytes, createHash } = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql:///fleetos_test';

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('🌱 Seeding database...');

    // Create test tenant
    const tenantResult = await client.query(`
      INSERT INTO platform.tenants (id, name, slug, base_currency, status)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Construction', 'demo', 'USD', 'active')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `);
    const tenantId = tenantResult.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    // Create owner user (password: demo1234)
    const salt = randomBytes(16).toString('hex');
    const passwordHash = createHash('sha256').update('demo1234' + salt).digest('hex');

    await client.query(`
      INSERT INTO platform.users (id, tenant_id, email, password_hash, password_salt, role, is_active)
      VALUES ('00000000-0000-0000-0000-000000000010', $1, 'demo@fleetos.com', $2, $3, 'owner', true)
      ON CONFLICT (id) DO NOTHING
    `, [tenantId, passwordHash, salt]);

    // Create ops user (password: demo1234)
    const opsSalt = randomBytes(16).toString('hex');
    const opsPasswordHash = createHash('sha256').update('demo1234' + opsSalt).digest('hex');

    await client.query(`
      INSERT INTO platform.users (id, tenant_id, email, password_hash, password_salt, role, is_active)
      VALUES ('00000000-0000-0000-0000-000000000011', $1, 'ops@fleetos.com', $2, $3, 'ops', true)
      ON CONFLICT (id) DO NOTHING
    `, [tenantId, opsPasswordHash, opsSalt]);

    // Create tenant settings
    await client.query(`
      INSERT INTO platform.tenant_settings (tenant_id, working_days_per_month, working_units_per_day, evidence_policy, fx_defaults)
      VALUES ($1, 26, 8, '{"work_session": true, "fuel": false}', '{"USD": 1.0}')
      ON CONFLICT (tenant_id) DO NOTHING
    `, [tenantId]);

    // Create machines
    const machines = [
      { code: 'EXC-001', type: 'excavator', make: 'Caterpillar', model: '320', year: '2020', meter: 4500 },
      { code: 'EXC-002', type: 'excavator', make: 'Komatsu', model: 'PC200', year: '2019', meter: 6200 },
      { code: '.Loader-001', type: 'wheel_loader', make: 'Volvo', model: 'L120', year: '2021', meter: 3200 },
      { code: 'Dump-001', type: 'dump_truck', make: 'HD325', model: 'HD325', year: '2020', meter: 8900 },
      { code: 'Doz-001', type: 'dozer', make: 'Caterpillar', model: 'D6', year: '2018', meter: 7800 },
    ];

    for (const m of machines) {
      await client.query(`
        INSERT INTO tenant.machines (tenant_id, code, type, make, model, year, current_meter, meter_unit_label, primary_meter_type, status_flag, client_uuid)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'hours', 'hour_meter', 'available', gen_random_uuid())
        ON CONFLICT (tenant_id, code) DO NOTHING
      `, [tenantId, m.code, m.type, m.make, m.model, m.year, m.meter]);
    }

    // Create clients
    const clients = [
      { name: 'BuildIt Corp', contact: 'John Smith', phone: '+1-555-0101', currency: 'USD' },
      { name: 'RoadWorks Inc', contact: 'Jane Doe', phone: '+1-555-0102', currency: 'USD' },
      { name: 'Metro Construction', contact: 'Bob Wilson', phone: '+1-555-0103', currency: 'USD' },
    ];

    for (const c of clients) {
      await client.query(`
        INSERT INTO tenant.clients (tenant_id, name, contact, phone, currency, payment_terms_days, client_uuid)
        VALUES ($1, $2, $3, $4, $5, 30, gen_random_uuid())
        ON CONFLICT DO NOTHING
      `, [tenantId, c.name, c.contact, c.phone, c.currency]);
    }

    // Create sites
    const sites = [
      { name: 'Downtown Office Tower', client_idx: 0 },
      { name: 'Highway Expansion Phase 2', client_idx: 1 },
      { name: 'Shopping Mall Renovation', client_idx: 2 },
    ];

    const clientIds = (await client.query(`SELECT id FROM tenant.clients WHERE tenant_id = $1 ORDER BY name`, [tenantId])).rows;

    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      const clientId = clientIds[s.client_idx]?.id;
      if (clientId) {
        await client.query(`
          INSERT INTO tenant.sites (tenant_id, name, client_id, address, active, client_uuid)
          VALUES ($1, $2, $3, '123 Main St', true, gen_random_uuid())
          ON CONFLICT DO NOTHING
        `, [tenantId, s.name, clientId]);
      }
    }

    // Create operators
    const operators = [
      { name: 'Ahmed Hassan', phone: '+1-555-0201' },
      { name: 'Carlos Rodriguez', phone: '+1-555-0202' },
      { name: 'Mike Johnson', phone: '+1-555-0203' },
    ];

    for (const o of operators) {
      await client.query(`
        INSERT INTO tenant.operators (tenant_id, name, phone, active, client_uuid)
        VALUES ($1, $2, $3, true, gen_random_uuid())
        ON CONFLICT DO NOTHING
      `, [tenantId, o.name, o.phone]);
    }

    // Create expense categories
    const categories = ['Fuel', 'Maintenance', 'Parts', 'Labour', 'Transport', 'Permits', 'Insurance', 'Other'];
    for (const cat of categories) {
      await client.query(`
        INSERT INTO tenant.expense_categories (tenant_id, name, client_uuid)
        VALUES ($1, $2, gen_random_uuid())
        ON CONFLICT DO NOTHING
      `, [tenantId, cat]);
    }

    // Create cash accounts
    await client.query(`
      INSERT INTO tenant.cash_accounts (tenant_id, name, currency, is_default, client_uuid)
      VALUES ($1, 'Main Cash', 'USD', true, gen_random_uuid())
      ON CONFLICT DO NOTHING
    `, [tenantId]);

    console.log('✅ Seed completed successfully');
    console.log('');
    console.log('Test accounts:');
    console.log('  Owner: demo@fleetos.com / demo1234');
    console.log('  Ops:   ops@fleetos.com / demo1234');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();
