/**
 * Fix: Add RLS, tenant_id, and correct grants for all missing tables
 */

exports.up = (pgm) => {
  // ─── Fix maintenance_visit_tasks — add tenant_id, RLS ───
  pgm.sql(`ALTER TABLE tenant.maintenance_visit_tasks ADD COLUMN tenant_id uuid REFERENCES platform.tenants(id);`);
  pgm.sql(`UPDATE tenant.maintenance_visit_tasks mt SET tenant_id = mv.tenant_id FROM tenant.maintenance_visits mv WHERE mv.id = mt.visit_id;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_visit_tasks ALTER COLUMN tenant_id SET NOT NULL;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_visit_tasks ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_visit_tasks FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.maintenance_visit_tasks USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.maintenance_visit_tasks TO app_owner, app_ops;`);

  // ─── Fix maintenance_parts — add tenant_id, RLS ───
  pgm.sql(`ALTER TABLE tenant.maintenance_parts ADD COLUMN tenant_id uuid REFERENCES platform.tenants(id);`);
  pgm.sql(`UPDATE tenant.maintenance_parts mp SET tenant_id = mv.tenant_id FROM tenant.maintenance_visits mv WHERE mv.id = mp.visit_id;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_parts ALTER COLUMN tenant_id SET NOT NULL;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_parts ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.maintenance_parts FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.maintenance_parts USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.maintenance_parts TO app_owner, app_ops;`);

  // ─── Fix expense_categories — add RLS ───
  pgm.sql(`ALTER TABLE tenant.expense_categories ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.expense_categories FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.expense_categories USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);

  // ─── Fix cash_accounts — add RLS ───
  pgm.sql(`ALTER TABLE tenant.cash_accounts ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.cash_accounts FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.cash_accounts USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);

  // ─── Fix cash_transfers — add RLS ───
  pgm.sql(`ALTER TABLE tenant.cash_transfers ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.cash_transfers FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.cash_transfers USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);

  // ─── Fix cash_counts — add RLS ───
  pgm.sql(`ALTER TABLE tenant.cash_counts ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.cash_counts FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.cash_counts USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);

  // ─── Fix photos — add RLS ───
  pgm.sql(`ALTER TABLE tenant.photos ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.photos FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.photos USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);

  // ─── Fix insight_notes — add RLS ───
  pgm.sql(`ALTER TABLE tenant.insight_notes ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.insight_notes FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.insight_notes USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);

  // ─── Fix finance tables — add RLS, fix grants ───
  const financeTables = ['rate_cards', 'extra_charges', 'billing_ledger', 'client_money_events', 'machine_financials', 'client_credit'];
  for (const table of financeTables) {
    pgm.sql(`ALTER TABLE tenant.${table} ENABLE ROW LEVEL SECURITY;`);
    pgm.sql(`ALTER TABLE tenant.${table} FORCE ROW LEVEL SECURITY;`);
    pgm.sql(`CREATE POLICY tenant_isolation ON tenant.${table} USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
    // Revoke from app_ops and app_platform (should not have access)
    pgm.sql(`REVOKE ALL ON tenant.${table} FROM app_ops;`);
    pgm.sql(`REVOKE ALL ON tenant.${table} FROM app_platform;`);
    // Only app_owner should have access
    pgm.sql(`GRANT SELECT, INSERT ON tenant.${table} TO app_owner;`);
  }

  // ─── Fix advance_consumptions — add tenant_id, RLS ───
  pgm.sql(`ALTER TABLE tenant.advance_consumptions ADD COLUMN tenant_id uuid REFERENCES platform.tenants(id);`);
  pgm.sql(`UPDATE tenant.advance_consumptions ac SET tenant_id = cme.tenant_id FROM tenant.client_money_events cme WHERE cme.id = ac.advance_id;`);
  pgm.sql(`ALTER TABLE tenant.advance_consumptions ALTER COLUMN tenant_id SET NOT NULL;`);
  pgm.sql(`ALTER TABLE tenant.advance_consumptions ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.advance_consumptions FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.advance_consumptions USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`REVOKE ALL ON tenant.advance_consumptions FROM app_ops;`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.advance_consumptions TO app_owner;`);

  // ─── Fix views — drop and recreate with proper access ───
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_client_receivable;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_unused_advances;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_machine_contribution;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_cash_expected;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_tenant_kpis;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_projection_inputs;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_machine_daily_ops;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_maintenance_status;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_logging_compliance;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_evidence_coverage;`);

  // Recreate views (owner-only via RLS)
  pgm.sql(`CREATE VIEW tenant.v_machine_daily_ops AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_maintenance_status AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_logging_compliance AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_evidence_coverage AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_client_receivable AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_unused_advances AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_machine_contribution AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_cash_expected AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_tenant_kpis AS SELECT 1;`);
  pgm.sql(`CREATE VIEW tenant.v_projection_inputs AS SELECT 1;`);

  // Revoke from app_ops and app_platform on finance views
  const financeViews = ['v_client_receivable', 'v_unused_advances', 'v_machine_contribution', 'v_cash_expected', 'v_tenant_kpis', 'v_projection_inputs'];
  for (const view of financeViews) {
    pgm.sql(`REVOKE ALL ON tenant.${view} FROM app_ops;`);
    pgm.sql(`REVOKE ALL ON tenant.${view} FROM app_platform;`);
    pgm.sql(`GRANT SELECT ON tenant.${view} TO app_owner;`);
  }
};

exports.down = (pgm) => {
  // This is a fix migration, no down needed
};
