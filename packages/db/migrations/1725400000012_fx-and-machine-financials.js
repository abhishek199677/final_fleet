/**
 * FX defaults and machine financials tables (TSD §4, MCH-03).
 * - platform.tenant_fx_rates: tenant-specific FX rate defaults.
 * - tenant.machine_financials: purchase date and cost (owner-only finance table).
 * All tenant tables follow non-negotiable rule 1: tenant_id, index, FORCE RLS, policy.
 */

exports.up = (pgm) => {
  // FX defaults table - platform table (no tenant isolation)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS platform.tenant_fx_rates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES platform.tenants (id),
      from_currency text NOT NULL,
      to_currency text NOT NULL,
      rate numeric(18,8) NOT NULL CHECK (rate > 0),
      effective_from timestamptz NOT NULL DEFAULT now(),
      effective_to timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, from_currency, to_currency, effective_from)
    );
    CREATE INDEX IF NOT EXISTS idx_tenant_fx_rates_tenant ON platform.tenant_fx_rates (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_fx_rates_currency ON platform.tenant_fx_rates (tenant_id, from_currency, to_currency);
    GRANT SELECT, INSERT, UPDATE ON platform.tenant_fx_rates TO app_platform;
    GRANT SELECT ON platform.tenant_fx_rates TO app_owner;
  `);

  // Machine financials - tenant finance table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS tenant.machine_financials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      machine_id uuid NOT NULL,
      purchase_date date NULL,
      purchase_cost_minor integer NULL,
      purchase_currency text NULL,
      depreciation_method text NULL CHECK (depreciation_method IN ('straight_line','declining_balance','none')),
      residual_value_minor integer NULL,
      useful_life_months integer NULL,
      insurance_cost_minor integer NULL,
      insurance_currency text NULL,
      insurance_renewal_date date NULL,
      notes text NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      client_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
      UNIQUE (tenant_id, machine_id),
      UNIQUE (tenant_id, client_uuid)
    );
    CREATE INDEX IF NOT EXISTS idx_machine_financials_tenant ON tenant.machine_financials (tenant_id);
    CREATE INDEX IF NOT EXISTS idx_machine_financials_machine ON tenant.machine_financials (tenant_id, machine_id);
    ALTER TABLE tenant.machine_financials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tenant.machine_financials FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON tenant.machine_financials;
    CREATE POLICY tenant_isolation ON tenant.machine_financials
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    GRANT SELECT, INSERT, UPDATE ON tenant.machine_financials TO app_owner;
    REVOKE UPDATE, DELETE ON tenant.machine_financials FROM app_owner;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS tenant.machine_financials;`);
  pgm.sql(`DROP TABLE IF EXISTS platform.tenant_fx_rates;`);
};
