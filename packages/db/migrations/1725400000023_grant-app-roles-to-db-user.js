/**
 * Grant the app roles to the connecting database user.
 *
 * Locally/CI the connecting user is superuser `postgres`, so SET ROLE to
 * app_owner/app_ops/app_platform always works. On serverless Postgres (Neon)
 * the owner user is NOT superuser and needs explicit membership — otherwise
 * DatabaseService's `SET LOCAL ROLE` fails with "permission denied".
 *
 * GRANT is idempotent, and CURRENT_USER makes this environment-agnostic.
 */

exports.up = (pgm) => {
  pgm.sql(`GRANT app_owner, app_ops, app_platform TO CURRENT_USER;`);
};

exports.down = (pgm) => {
  pgm.sql(`REVOKE app_owner, app_ops, app_platform FROM CURRENT_USER;`);
};
