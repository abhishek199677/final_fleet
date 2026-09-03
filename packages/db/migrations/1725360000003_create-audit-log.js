/**
 * S01: Create tenant.audit_log table
 * TSD §2.4 — every write is logged
 */

exports.up = (pgm) => {
  pgm.createTable(
    { name: 'audit_log', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      user_id: { type: 'uuid' },
      operation: { type: 'text', notNull: true },
      table_name: { type: 'text', notNull: true },
      record_id: { type: 'uuid' },
      old_data: { type: 'jsonb' },
      new_data: { type: 'jsonb' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );

  // Indexes
  pgm.createIndex({ name: 'audit_log', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'audit_log', schema: 'tenant' }, ['table_name']);
  pgm.createIndex({ name: 'audit_log', schema: 'tenant' }, ['record_id']);
  pgm.createIndex({ name: 'audit_log', schema: 'tenant' }, ['created_at']);

  // RLS
  pgm.sql(`ALTER TABLE tenant.audit_log ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.audit_log FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`
    CREATE POLICY tenant_isolation ON tenant.audit_log
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
  `);

  // Grants — append-only, both roles can read and insert
  pgm.sql(`GRANT SELECT, INSERT ON tenant.audit_log TO app_owner, app_ops;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'audit_log', schema: 'tenant' });
};
