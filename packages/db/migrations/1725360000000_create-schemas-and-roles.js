/**
 * S01: Create schemas and roles
 * TSD §2.2, §2.3
 */

exports.up = (pgm) => {
  // Schemas
  pgm.createSchema('platform');
  pgm.createSchema('tenant');
  pgm.createSchema('ref');

  // Roles (non-superuser, no BYPASSRLS)
  pgm.sql(`
    CREATE ROLE app_owner NOLOGIN NOINHERIT;
    CREATE ROLE app_ops NOLOGIN NOINHERIT;
    CREATE ROLE app_platform NOLOGIN NOINHERIT;
  `);

  // Grant usage on schemas
  pgm.sql(`
    GRANT USAGE ON SCHEMA platform TO app_owner, app_ops, app_platform;
    GRANT USAGE ON SCHEMA tenant TO app_owner, app_ops;
    GRANT USAGE ON SCHEMA ref TO app_owner, app_ops, app_platform;
  `);

  // Grant default privileges for future tables
  pgm.sql(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT SELECT, INSERT ON TABLES TO app_owner, app_ops;
    ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT SELECT, INSERT ON TABLES TO app_owner;
    ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT SELECT ON TABLES TO app_platform;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP ROLE IF EXISTS app_owner;
    DROP ROLE IF EXISTS app_ops;
    DROP ROLE IF EXISTS app_platform;
  `);
  pgm.dropSchema('ref');
  pgm.dropSchema('tenant');
  pgm.dropSchema('platform');
};
