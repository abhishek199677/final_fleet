/**
 * S16-S19: Work sessions, fuel, downtime, maintenance
 * TSD §3.2, BRD WRK-01..08, MNT-01..05
 */

exports.up = (pgm) => {
  // ─── tenant.work_sessions ───
  pgm.createTable(
    { name: 'work_sessions', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      machine_id: { type: 'uuid', notNull: true, references: 'tenant.machines(id)' },
      deployment_id: { type: 'uuid', notNull: true, references: 'tenant.deployments(id)' },
      operator_id: { type: 'uuid', notNull: true, references: 'tenant.operators(id)' },
      helper_id: { type: 'uuid', references: 'tenant.operators(id)' },
      start_at: { type: 'timestamptz', notNull: true },
      end_at: { type: 'timestamptz' },
      start_meter: { type: 'numeric', notNull: true },
      end_meter: { type: 'numeric' },
      units_run: { type: 'numeric' },
      start_photo_key: { type: 'text' },
      end_photo_key: { type: 'text' },
      start_evidence: { type: 'text', check: "start_evidence IN ('photo', 'manual')" },
      end_evidence: { type: 'text', check: "end_evidence IN ('photo', 'manual')" },
      start_ocr_value: { type: 'numeric' },
      end_ocr_value: { type: 'numeric' },
      ocr_mismatch: { type: 'boolean', notNull: true, default: false },
      activity: { type: 'text' },
      billable: { type: 'boolean', notNull: true, default: true },
      override_reason: { type: 'text' },
      notes: { type: 'text' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid', references: 'tenant.work_sessions(id)' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'work_sessions', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'work_sessions', schema: 'tenant' }, ['machine_id']);
  pgm.createIndex({ name: 'work_sessions', schema: 'tenant' }, ['deployment_id']);
  pgm.createIndex({ name: 'work_sessions', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });
  pgm.createIndex({ name: 'work_sessions', schema: 'tenant' }, ['tenant_id', 'is_current']);
  // Exclusion constraint: no overlapping current sessions per machine
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
  pgm.sql(`ALTER TABLE tenant.work_sessions ADD CONSTRAINT exclude_overlapping_sessions EXCLUDE USING gist (machine_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (is_current = true);`);

  pgm.sql(`ALTER TABLE tenant.work_sessions ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.work_sessions FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.work_sessions USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.work_sessions TO app_owner, app_ops;`);

  // ─── tenant.fuel_logs ───
  pgm.createTable(
    { name: 'fuel_logs', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      machine_id: { type: 'uuid', notNull: true, references: 'tenant.machines(id)' },
      work_session_id: { type: 'uuid', references: 'tenant.work_sessions(id)' },
      litres: { type: 'numeric', notNull: true },
      cost_minor: { type: 'int', notNull: true },
      currency: { type: 'text', notNull: true },
      fx_rate: { type: 'numeric(18,8)' },
      base_minor: { type: 'int' },
      receipt_photo_key: { type: 'text' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'fuel_logs', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'fuel_logs', schema: 'tenant' }, ['machine_id']);
  pgm.createIndex({ name: 'fuel_logs', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.fuel_logs ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.fuel_logs FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.fuel_logs USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.fuel_logs TO app_owner, app_ops;`);

  // ─── tenant.downtime_segments ───
  pgm.createTable(
    { name: 'downtime_segments', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      machine_id: { type: 'uuid', notNull: true, references: 'tenant.machines(id)' },
      work_session_id: { type: 'uuid', references: 'tenant.work_sessions(id)' },
      started_at: { type: 'timestamptz', notNull: true },
      ended_at: { type: 'timestamptz' },
      reason_code: {
        type: 'text',
        notNull: true,
        check: "reason_code IN ('no_diesel', 'breakdown', 'transport', 'police_permit', 'no_work_client', 'weather', 'operator_absent', 'other')",
      },
      note: { type: 'text' },
      photo_key: { type: 'text' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'downtime_segments', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'downtime_segments', schema: 'tenant' }, ['machine_id']);
  pgm.createIndex({ name: 'downtime_segments', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.downtime_segments ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.downtime_segments FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.downtime_segments USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.downtime_segments TO app_owner, app_ops;`);

  // ─── tenant.maintenance_tasks ───
  pgm.createTable(
    { name: 'maintenance_tasks', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      machine_id: { type: 'uuid', notNull: true, references: 'tenant.machines(id)' },
      name: { type: 'text', notNull: true },
      trigger: { type: 'text', notNull: true, check: "trigger IN ('meter', 'calendar')" },
      interval_value: { type: 'numeric', notNull: true },
      warning_value: { type: 'numeric', notNull: true },
      last_done_value: { type: 'numeric' },
      last_done_date: { type: 'date' },
      next_due_value: { type: 'numeric' },
      next_due_date: { type: 'date' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'maintenance_tasks', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'maintenance_tasks', schema: 'tenant' }, ['machine_id']);
  pgm.createIndex({ name: 'maintenance_tasks', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.maintenance_tasks ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_tasks FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.maintenance_tasks USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.maintenance_tasks TO app_owner, app_ops;`);

  // ─── tenant.maintenance_visits ───
  pgm.createTable(
    { name: 'maintenance_visits', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      machine_id: { type: 'uuid', notNull: true, references: 'tenant.machines(id)' },
      visit_date: { type: 'date', notNull: true },
      visit_type: { type: 'text', notNull: true, check: "visit_type IN ('scheduled', 'breakdown', 'inspection')" },
      mechanic: { type: 'text', notNull: true },
      meter_at_visit: { type: 'numeric', notNull: true },
      checklist: { type: 'jsonb' },
      labour_cost_txn: { type: 'int' },
      labour_currency: { type: 'text' },
      labour_fx: { type: 'numeric(18,8)' },
      labour_base: { type: 'int' },
      notes: { type: 'text' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'maintenance_visits', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'maintenance_visits', schema: 'tenant' }, ['machine_id']);
  pgm.createIndex({ name: 'maintenance_visits', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.maintenance_visits ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_visits FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.maintenance_visits USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.maintenance_visits TO app_owner, app_ops;`);

  // ─── tenant.maintenance_visit_tasks ───
  pgm.createTable(
    { name: 'maintenance_visit_tasks', schema: 'tenant' },
    {
      visit_id: { type: 'uuid', notNull: true, references: 'tenant.maintenance_visits(id)' },
      task_id: { type: 'uuid', notNull: true, references: 'tenant.maintenance_tasks(id)' },
      _pk: { type: 'text', primaryKey: true },
    },
  );
  pgm.sql(`ALTER TABLE tenant.maintenance_visit_tasks DROP COLUMN _pk;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_visit_tasks ADD PRIMARY KEY (visit_id, task_id);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.maintenance_visit_tasks TO app_owner, app_ops;`);

  // ─── tenant.maintenance_parts ───
  pgm.createTable(
    { name: 'maintenance_parts', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      visit_id: { type: 'uuid', notNull: true, references: 'tenant.maintenance_visits(id)' },
      item: { type: 'text', notNull: true },
      qty: { type: 'numeric', notNull: true },
      unit_cost_txn: { type: 'int', notNull: true },
      currency: { type: 'text', notNull: true },
      fx: { type: 'numeric(18,8)' },
      base: { type: 'int' },
      is_consumable: { type: 'boolean', notNull: true, default: false },
      meter_at_change: { type: 'numeric' },
    },
  );
  pgm.sql(`GRANT SELECT, INSERT ON tenant.maintenance_parts TO app_owner, app_ops;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'maintenance_parts', schema: 'tenant' });
  pgm.dropTable({ name: 'maintenance_visit_tasks', schema: 'tenant' });
  pgm.dropTable({ name: 'maintenance_visits', schema: 'tenant' });
  pgm.dropTable({ name: 'maintenance_tasks', schema: 'tenant' });
  pgm.dropTable({ name: 'downtime_segments', schema: 'tenant' });
  pgm.dropTable({ name: 'fuel_logs', schema: 'tenant' });
  pgm.dropTable({ name: 'work_sessions', schema: 'tenant' });
};
