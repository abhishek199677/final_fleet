/**
 * Auth hardening: store password credentials in DB instead of in-memory map.
 * Separate table because tenant.users is designed for Cognito integration.
 */

exports.up = (pgm) => {
  pgm.createTable(
    { name: 'user_credentials', schema: 'tenant' },
    {
      user_id: { type: 'uuid', notNull: true, references: 'tenant.users(id)' },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      email: { type: 'text', notNull: true },
      password_hash: { type: 'text', notNull: true },
      salt: { type: 'text', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.createIndex({ name: 'user_credentials', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'user_credentials', schema: 'tenant' }, ['email'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.user_credentials ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.user_credentials FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.user_credentials USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.user_credentials TO app_owner;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'user_credentials', schema: 'tenant' });
};
