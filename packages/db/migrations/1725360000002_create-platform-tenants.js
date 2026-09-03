/**
 * S01: Create platform.tenants table
 * TSD §3.1 — the root tenant record
 */

exports.up = (pgm) => {
  pgm.createTable(
    { name: 'tenants', schema: 'platform' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      name: { type: 'text', notNull: true },
      slug: { type: 'text', notNull: true, unique: true },
      country: { type: 'text', notNull: true },
      base_currency: { type: 'text', notNull: true },
      timezone: { type: 'text', notNull: true, default: 'UTC' },
      status: {
        type: 'text',
        notNull: true,
        default: 'active',
        check: "status IN ('active', 'suspended', 'archived', 'pending_deletion')",
      },
      retention_months: { type: 'int', notNull: true, default: 12 },
      legal_hold: { type: 'boolean', notNull: true, default: false },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );

  // Platform role can read tenants
  pgm.sql(`GRANT SELECT ON platform.tenants TO app_platform;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'tenants', schema: 'platform' });
};
