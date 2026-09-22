/**
 * Allow self-service registration: app_platform must be able to INSERT new
 * tenants, their settings row and their entitlement row. Without these
 * grants POST /v1/auth/register always fails with a permission error.
 */

exports.up = (pgm) => {
  pgm.sql(`GRANT INSERT ON platform.tenants TO app_platform;`);
  pgm.sql(`GRANT INSERT ON platform.tenant_settings TO app_platform;`);
  pgm.sql(`GRANT INSERT ON platform.entitlements TO app_platform;`);
  console.log('✅ app_platform can now provision tenants (self-service register)');
};

exports.down = (pgm) => {
  pgm.sql(`REVOKE INSERT ON platform.entitlements FROM app_platform;`);
  pgm.sql(`REVOKE INSERT ON platform.tenant_settings FROM app_platform;`);
  pgm.sql(`REVOKE INSERT ON platform.tenants FROM app_platform;`);
};
