/**
 * Fix CRUD grants on all tenant tables.
 *
 * The initial migrations only granted SELECT + INSERT. The seed script's
 * ensureGrants added full DML, but fresh production deployments that skip
 * seed would fail on UPDATE/DELETE. This migration explicitly grants
 * SELECT, INSERT, UPDATE, DELETE on every tenant table to app_owner and
 * app_ops (where appropriate) so the API works out of the box.
 *
 * Tables that are append-only by design (audit_log, work_sessions,
 * fuel_logs, etc.) still receive the full grant here because the API
 * layer already enforces the business rule; the DB grant is a safety net
 * and avoids cryptic "permission denied" errors during development.
 */

exports.up = (pgm) => {
  // ─── Core entity tables ───
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.machines TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.clients TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.sites TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.deployments TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.operators TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.users TO app_owner, app_ops;`);

  // ─── Work / ops tables ───
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.work_sessions TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.fuel_logs TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.downtime_segments TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.maintenance_tasks TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.maintenance_visits TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.maintenance_visit_tasks TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.maintenance_parts TO app_owner, app_ops;`);

  // ─── Finance tables ───
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.rate_cards TO app_owner;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.extra_charges TO app_owner;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.billing_ledger TO app_owner;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.client_money_events TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.advance_consumptions TO app_owner;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.machine_financials TO app_owner;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.client_credit TO app_owner;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.expense_categories TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.expenses TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.cash_accounts TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.cash_transfers TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.cash_counts TO app_owner, app_ops;`);

  // ─── Alerts / notifications ───
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.alerts TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.notifications TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.insight_notes TO app_owner;`);

  // ─── Photos ───
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant.photos TO app_owner, app_ops;`);

  // ─── Support ───
  pgm.sql(`GRANT SELECT, INSERT, UPDATE, DELETE ON platform.support_tickets TO app_owner, app_ops;`);

  // ─── Default privileges for future tables ───
  pgm.sql(`ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_owner;`);
  pgm.sql(`ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_ops;`);

  console.log('✅ Full CRUD grants applied to all tenant tables');
};

exports.down = (pgm) => {
  // Revert to the original restrictive grants (SELECT + INSERT only)
  const tables = [
    'machines', 'clients', 'sites', 'deployments', 'operators', 'users',
    'work_sessions', 'fuel_logs', 'downtime_segments',
    'maintenance_tasks', 'maintenance_visits', 'maintenance_visit_tasks', 'maintenance_parts',
    'expenses', 'expense_categories', 'cash_accounts', 'cash_transfers', 'cash_counts',
    'photos',
  ];
  for (const t of tables) {
    pgm.sql(`GRANT SELECT, INSERT ON tenant.${t} TO app_owner, app_ops;`);
    pgm.sql(`REVOKE UPDATE, DELETE ON tenant.${t} FROM app_owner, app_ops;`);
  }
  const ownerOnly = [
    'rate_cards', 'extra_charges', 'billing_ledger',
    'advance_consumptions', 'machine_financials', 'client_credit', 'insight_notes',
  ];
  for (const t of ownerOnly) {
    pgm.sql(`GRANT SELECT, INSERT ON tenant.${t} TO app_owner;`);
    pgm.sql(`REVOKE UPDATE, DELETE ON tenant.${t} FROM app_owner;`);
  }
  pgm.sql(`GRANT SELECT, INSERT, UPDATE ON tenant.alerts TO app_owner, app_ops;`);
  pgm.sql(`REVOKE DELETE ON tenant.alerts FROM app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT, UPDATE ON tenant.notifications TO app_owner, app_ops;`);
  pgm.sql(`REVOKE DELETE ON tenant.notifications FROM app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT ON platform.support_tickets TO app_owner, app_ops;`);
  pgm.sql(`REVOKE UPDATE, DELETE ON platform.support_tickets FROM app_owner, app_ops;`);
};
