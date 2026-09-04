/**
 * S22 + CLI-06: grants for ops-posted client money and owner hold/release.
 * - app_ops may INSERT client_money_events (receipts/advances with evidence, BIL-04/S22).
 *   Balances stay protected: finance views remain revoked for app_ops.
 * - app_owner may UPDATE tenant.deployments status for payment hold/release (CLI-06).
 */

exports.up = (pgm) => {
  pgm.sql(`GRANT INSERT ON tenant.client_money_events TO app_ops;`);
  pgm.sql(`GRANT SELECT ON tenant.client_money_events TO app_ops;`);
  pgm.sql(`GRANT UPDATE ON tenant.deployments TO app_owner;`);
  pgm.sql(`GRANT SELECT, INSERT ON platform.support_tickets TO app_owner, app_ops;`);
  // Evidence policy + thresholds must be readable to enforce TEN-07 on writes.
  pgm.sql(`GRANT SELECT ON platform.tenant_settings TO app_owner, app_ops;`);
};

exports.down = (pgm) => {
  pgm.sql(`REVOKE INSERT ON tenant.client_money_events FROM app_ops;`);
  pgm.sql(`REVOKE SELECT ON tenant.client_money_events FROM app_ops;`);
  pgm.sql(`REVOKE UPDATE ON tenant.deployments FROM app_owner;`);
  pgm.sql(`REVOKE ALL ON platform.support_tickets FROM app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT ON platform.support_tickets TO app_platform;`);
  pgm.sql(`REVOKE SELECT ON platform.tenant_settings FROM app_owner, app_ops;`);
};
