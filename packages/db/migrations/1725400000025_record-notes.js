/**
 * Give every append-only money/ops table a place to record why it was edited
 * or voided.
 *
 * `note` already exists on expenses, downtime_segments, maintenance_visits,
 * cash_counts, extra_charges and `notes` on work_sessions. fuel_logs and
 * client_money_events had nowhere to put it, which would have made the shared
 * void-with-reason flow unusable on those two.
 *
 * Nullable and additive: existing rows are untouched, no backfill, no default.
 */

exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE tenant.fuel_logs ADD COLUMN note text;`);
  pgm.sql(`ALTER TABLE tenant.client_money_events ADD COLUMN note text;`);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE tenant.client_money_events DROP COLUMN IF EXISTS note;`);
  pgm.sql(`ALTER TABLE tenant.fuel_logs DROP COLUMN IF EXISTS note;`);
};
