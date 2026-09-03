/**
 * S40-S41: Alerts, notifications, insight_notes
 * TSD §3.2, BRD ALT-01..04
 */

exports.up = (pgm) => {
  // ─── tenant.alerts ───
  pgm.createTable(
    { name: 'alerts', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      type: { type: 'text', notNull: true },
      machine_id: { type: 'uuid' },
      client_id: { type: 'uuid' },
      expense_id: { type: 'uuid' },
      severity: { type: 'text', notNull: true, default: 'info', check: "severity IN ('info', 'warning', 'critical')" },
      title: { type: 'text', notNull: true },
      detail: { type: 'text' },
      is_resolved: { type: 'boolean', notNull: true, default: false },
      resolved_at: { type: 'timestamptz' },
      resolved_by: { type: 'uuid' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.createIndex({ name: 'alerts', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'alerts', schema: 'tenant' }, ['type']);
  pgm.createIndex({ name: 'alerts', schema: 'tenant' }, ['is_resolved']);
  // One open alert per (type, entity)
  pgm.sql(`CREATE UNIQUE INDEX idx_alerts_one_open ON tenant.alerts (type, COALESCE(machine_id, client_id, expense_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE is_resolved = false;`);

  pgm.sql(`ALTER TABLE tenant.alerts ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.alerts FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.alerts USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE ON tenant.alerts TO app_owner, app_ops;`);

  // ─── tenant.notifications ───
  pgm.createTable(
    { name: 'notifications', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      user_id: { type: 'uuid', notNull: true },
      type: { type: 'text', notNull: true },
      title: { type: 'text', notNull: true },
      body: { type: 'text' },
      data: { type: 'jsonb' },
      is_read: { type: 'boolean', notNull: true, default: false },
      read_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.createIndex({ name: 'notifications', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'notifications', schema: 'tenant' }, ['user_id']);
  pgm.createIndex({ name: 'notifications', schema: 'tenant' }, ['is_read']);

  pgm.sql(`ALTER TABLE tenant.notifications ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.notifications FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.notifications USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE ON tenant.notifications TO app_owner, app_ops;`);

  // ─── tenant.insight_notes ───
  pgm.createTable(
    { name: 'insight_notes', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      insight_type: { type: 'text', notNull: true },
      entity_id: { type: 'uuid' },
      note: { type: 'text', notNull: true },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.createIndex({ name: 'insight_notes', schema: 'tenant' }, ['tenant_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.insight_notes TO app_owner;`);

  // ─── platform.support_tickets ───
  pgm.createTable(
    { name: 'support_tickets', schema: 'platform' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      user_id: { type: 'uuid', notNull: true },
      subject: { type: 'text', notNull: true },
      description: { type: 'text' },
      screenshot_key: { type: 'text' },
      status: { type: 'text', notNull: true, default: 'open', check: "status IN ('open', 'in_progress', 'resolved', 'closed')" },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.sql(`GRANT SELECT, INSERT ON platform.support_tickets TO app_platform;`);

  // ─── platform.announcements ───
  pgm.createTable(
    { name: 'announcements', schema: 'platform' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      title: { type: 'text', notNull: true },
      body: { type: 'text', notNull: true },
      target_tenant_id: { type: 'uuid' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.sql(`GRANT SELECT, INSERT ON platform.announcements TO app_platform;`);

  // ─── platform.offboarding_jobs ───
  pgm.createTable(
    { name: 'offboarding_jobs', schema: 'platform' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      status: { type: 'text', notNull: true, default: 'pending', check: "status IN ('pending', 'exporting', 'archived', 'deleted', 'certificate_issued')" },
      export_key: { type: 'text' },
      archive_key: { type: 'text' },
      certificate_key: { type: 'text' },
      scheduled_deletion_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.sql(`GRANT SELECT, INSERT, UPDATE ON platform.offboarding_jobs TO app_platform;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'offboarding_jobs', schema: 'platform' });
  pgm.dropTable({ name: 'announcements', schema: 'platform' });
  pgm.dropTable({ name: 'support_tickets', schema: 'platform' });
  pgm.dropTable({ name: 'insight_notes', schema: 'tenant' });
  pgm.dropTable({ name: 'notifications', schema: 'tenant' });
  pgm.dropTable({ name: 'alerts', schema: 'tenant' });
};
