/**
 * S12-S13: Machines, clients, sites, deployments
 * TSD §3.2, BRD MCH-01..06, CLI-01..06
 */

exports.up = (pgm) => {
  // ─── tenant.machines ───
  pgm.createTable(
    { name: 'machines', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      code: { type: 'text', notNull: true },
      type: { type: 'text', notNull: true },
      make: { type: 'text' },
      model: { type: 'text' },
      year: { type: 'int' },
      chassis_no: { type: 'text' },
      primary_meter_type: {
        type: 'text',
        notNull: true,
        check: "primary_meter_type IN ('hours', 'km', 'cycles', 'metres', 'tonnes', 'trips')",
      },
      meter_unit_label: { type: 'text', notNull: true },
      current_meter: { type: 'numeric', notNull: true, default: 0 },
      status_flag: { type: 'text', default: 'active' },
      flag_note: { type: 'text' },
      photo_key: { type: 'text' },
      attributes: { type: 'jsonb', notNull: true, default: '{}' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'machines', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'machines', schema: 'tenant' }, ['tenant_id', 'code'], { unique: true });
  pgm.createIndex({ name: 'machines', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.machines ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.machines FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.machines USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.machines TO app_owner, app_ops;`);

  // ─── tenant.clients ───
  pgm.createTable(
    { name: 'clients', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      name: { type: 'text', notNull: true },
      contact: { type: 'text' },
      phone: { type: 'text' },
      whatsapp: { type: 'text' },
      address: { type: 'text' },
      currency: { type: 'text', notNull: true },
      payment_terms_days: { type: 'int', notNull: true, default: 30 },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'clients', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'clients', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.clients ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.clients FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.clients USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.clients TO app_owner, app_ops;`);

  // ─── tenant.sites ───
  pgm.createTable(
    { name: 'sites', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      client_id: { type: 'uuid', notNull: true, references: 'tenant.clients(id)' },
      name: { type: 'text', notNull: true },
      location: { type: 'text' },
      lat: { type: 'numeric' },
      lng: { type: 'numeric' },
      start_date: { type: 'date' },
      end_date: { type: 'date' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'sites', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'sites', schema: 'tenant' }, ['client_id']);
  pgm.createIndex({ name: 'sites', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.sites ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.sites FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.sites USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.sites TO app_owner, app_ops;`);

  // ─── tenant.deployments ───
  pgm.createTable(
    { name: 'deployments', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      machine_id: { type: 'uuid', notNull: true, references: 'tenant.machines(id)' },
      site_id: { type: 'uuid', notNull: true, references: 'tenant.sites(id)' },
      start_date: { type: 'date', notNull: true },
      end_date: { type: 'date' },
      status: {
        type: 'text',
        notNull: true,
        default: 'active',
        check: "status IN ('active', 'on_hold_payment', 'ended')",
      },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'deployments', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'deployments', schema: 'tenant' }, ['machine_id']);
  pgm.createIndex({ name: 'deployments', schema: 'tenant' }, ['site_id']);
  pgm.createIndex({ name: 'deployments', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });
  // One active deployment per machine
  pgm.sql(`CREATE UNIQUE INDEX idx_deployments_one_active ON tenant.deployments (machine_id) WHERE status = 'active';`);

  pgm.sql(`ALTER TABLE tenant.deployments ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.deployments FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.deployments USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.deployments TO app_owner, app_ops;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'deployments', schema: 'tenant' });
  pgm.dropTable({ name: 'sites', schema: 'tenant' });
  pgm.dropTable({ name: 'clients', schema: 'tenant' });
  pgm.dropTable({ name: 'machines', schema: 'tenant' });
};
