/**
 * Admin ticket workflow (ADM-04/S43): platform staff update ticket status.
 */

exports.up = (pgm) => {
  pgm.sql(`GRANT UPDATE ON platform.support_tickets TO app_platform;`);
  pgm.sql(`GRANT UPDATE ON platform.announcements TO app_platform;`);
};

exports.down = (pgm) => {
  pgm.sql(`REVOKE UPDATE ON platform.support_tickets FROM app_platform;`);
  pgm.sql(`REVOKE UPDATE ON platform.announcements FROM app_platform;`);
};
