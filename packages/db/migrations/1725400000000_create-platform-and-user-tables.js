/**
 * S10-S11: Platform tables — entitlements, tenant_settings, users, operators
 * TSD §3.1, BRD TEN-01..07, MCH-05
 */

exports.up = (pgm) => {
  // ─── platform.entitlements ───
  pgm.createTable(
    { name: 'entitlements', schema: 'platform' },
    {
      tenant_id: { type: 'uuid', primaryKey: true, references: 'platform.tenants(id)' },
      plan: { type: 'text', notNull: true, default: 'pilot' },
      machine_limit: { type: 'int', notNull: true, default: 50 },
      user_limit: { type: 'int', notNull: true, default: 20 },
      storage_gb: { type: 'int', notNull: true, default: 100 },
      features: { type: 'jsonb', notNull: true, default: '{}' },
      trial_start: { type: 'timestamptz' },
      trial_end: { type: 'timestamptz' },
      contract_start: { type: 'timestamptz' },
      contract_end: { type: 'timestamptz' },
      usage: { type: 'jsonb', notNull: true, default: '{"machines":0,"users":0,"storage_bytes":0}' },
    },
  );
  pgm.sql(`GRANT SELECT ON platform.entitlements TO app_platform;`);

  // ─── platform.tenant_settings ───
  pgm.createTable(
    { name: 'tenant_settings', schema: 'platform' },
    {
      tenant_id: { type: 'uuid', primaryKey: true, references: 'platform.tenants(id)' },
      evidence_policy: { type: 'jsonb', notNull: true, default: '{"meter_readings":"optional","diesel_receipts":"optional","expense_receipts":"optional","receipt_slips":"optional"}' },
      receipt_threshold_minor: { type: 'int', notNull: true, default: 0 },
      policy_locked: { type: 'boolean', notNull: true, default: false },
      cut_off_time: { type: 'text', notNull: true, default: '18:00' },
      working_units_per_day: { type: 'int', notNull: true, default: 8 },
      working_days_per_month: { type: 'int', notNull: true, default: 26 },
      overhead_method: { type: 'text', notNull: true, default: 'per_meter_unit' },
      fx_defaults: { type: 'jsonb', notNull: true, default: '{}' },
      thresholds: { type: 'jsonb', notNull: true, default: '{}' },
    },
  );
  pgm.sql(`GRANT SELECT ON platform.tenant_settings TO app_platform;`);

  // ─── platform.platform_users ───
  pgm.createTable(
    { name: 'platform_users', schema: 'platform' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      cognito_sub: { type: 'text', notNull: true, unique: true },
      email: { type: 'text', notNull: true },
      role: { type: 'text', notNull: true, check: "role IN ('platform_admin', 'support')" },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.sql(`GRANT SELECT, INSERT, UPDATE ON platform.platform_users TO app_platform;`);

  // ─── tenant.users ───
  pgm.createTable(
    { name: 'users', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      cognito_sub: { type: 'text', notNull: true },
      email: { type: 'text', notNull: true },
      name: { type: 'text' },
      role: { type: 'text', notNull: true, check: "role IN ('owner', 'ops')" },
      is_active: { type: 'boolean', notNull: true, default: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'users', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'users', schema: 'tenant' }, ['cognito_sub'], { unique: true });
  pgm.createIndex({ name: 'users', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.users ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.users FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.users USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.users TO app_owner, app_ops;`);

  // ─── tenant.operators ───
  pgm.createTable(
    { name: 'operators', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      name: { type: 'text', notNull: true },
      phone: { type: 'text' },
      is_active: { type: 'boolean', notNull: true, default: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'operators', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'operators', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.operators ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.operators FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.operators USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.operators TO app_owner, app_ops;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'operators', schema: 'tenant' });
  pgm.dropTable({ name: 'users', schema: 'tenant' });
  pgm.dropTable({ name: 'platform_users', schema: 'platform' });
  pgm.dropTable({ name: 'tenant_settings', schema: 'platform' });
  pgm.dropTable({ name: 'entitlements', schema: 'platform' });
};
