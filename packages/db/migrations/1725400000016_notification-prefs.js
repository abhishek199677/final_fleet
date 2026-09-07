/**
 * Add notification_preferences column to tenant.users (ALT-01, SEC-02).
 * Stores per-user channel preferences as JSONB:
 * { "whatsapp": true, "sms": false, "in_app": true }
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tenant.users
    ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{"whatsapp": true, "sms": false, "in_app": true}';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE tenant.users DROP COLUMN IF EXISTS notification_preferences;`);
};
