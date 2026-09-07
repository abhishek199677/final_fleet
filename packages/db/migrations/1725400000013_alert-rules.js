/**
 * S40: Alert rules table for configurable alert thresholds.
 * Enables automatic alert generation based on tenant-configured rules.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS tenant.alert_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      rule_type text NOT NULL CHECK (rule_type IN (
        'maintenance_warning', 'maintenance_overdue', 'payment_due', 'payment_overdue',
        'log_pending', 'diesel_anomaly', 'cash_variance', 'duplicate_expense',
        'concentration', 'ocr_mismatch', 'auto_hold'
      )),
      threshold numeric(10,2) NULL,
      threshold_unit text NULL,
      is_active boolean NOT NULL DEFAULT true,
      notify_channels text[] NOT NULL DEFAULT ARRAY['in_app'],
      client_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, rule_type),
      UNIQUE (tenant_id, client_uuid)
    );
    CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant ON tenant.alert_rules (tenant_id);
    ALTER TABLE tenant.alert_rules ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tenant.alert_rules FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON tenant.alert_rules;
    CREATE POLICY tenant_isolation ON tenant.alert_rules
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    GRANT SELECT, INSERT, UPDATE ON tenant.alert_rules TO app_owner;
    REVOKE UPDATE, DELETE ON tenant.alert_rules FROM app_owner;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS tenant.alert_rules;`);
};
