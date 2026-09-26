/**
 * Billed totals excluded `adjustment` rows — so the money a correction moved
 * was invisible everywhere a human reads it.
 *
 * billing_ledger is append-only (BIL-03): a recompute never rewrites the
 * original `work`/`standby`/... row, it posts the difference as a single
 * `adjustment` referencing it. The base row therefore keeps its stale value
 * and the adjustment carries the real delta. Three read paths dropped those
 * rows (`WHERE kind != 'adjustment'` / a CASE that omitted them), so after a
 * correction the client was invoiced for the OLD amount, `total_billed_minor`
 * under-reported, and machine contribution ignored the top-up entirely.
 *
 * Also indexes the day's base entries so two concurrent posts of the same
 * (deployment, day, kind) can't both land — the insert now uses
 * ON CONFLICT DO NOTHING against this partial index.
 *
 * CREATE OR REPLACE (not DROP): column names, types and order are unchanged,
 * which keeps the existing app_owner grants intact.
 */

const RECEIVABLE = `
    SELECT
      bl.tenant_id,
      d.site_id,
      s.client_id,
      c.name AS client_name,
      c.currency,
      COALESCE(SUM(CASE WHEN bl.kind IN ('work', 'minimum_topup', 'standby', 'monthly_hire', 'adjustment') THEN bl.amount_minor ELSE 0 END), 0) AS billed_minor,
      COALESCE(SUM(CASE WHEN bl.kind = 'extra_charge' THEN bl.amount_minor ELSE 0 END), 0) AS extras_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.client_id = s.client_id AND cme.event_type = 'credit_note' AND cme.is_current = true), 0) AS credits_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.client_id = s.client_id AND cme.event_type = 'receipt' AND cme.is_current = true), 0) AS receipts_minor,
      COALESCE((SELECT SUM(ac.base_minor) FROM tenant.advance_consumptions ac JOIN tenant.client_money_events cme ON cme.id = ac.advance_id WHERE cme.client_id = s.client_id), 0) AS advances_consumed_minor
    FROM tenant.billing_ledger bl
    JOIN tenant.deployments d ON d.id = bl.deployment_id
    JOIN tenant.sites s ON s.id = d.site_id
    JOIN tenant.clients c ON c.id = s.client_id
    GROUP BY bl.tenant_id, d.site_id, s.client_id, c.name, c.currency;`;

const CONTRIB = `
    SELECT
      bl.tenant_id,
      bl.deployment_id,
      d.machine_id,
      COALESCE(SUM(CASE WHEN bl.kind IN ('work', 'minimum_topup', 'standby', 'monthly_hire', 'adjustment') THEN bl.amount_minor ELSE 0 END), 0) AS billed_minor,
      COALESCE((SELECT SUM(fl.cost_minor) FROM tenant.fuel_logs fl WHERE fl.machine_id = d.machine_id AND fl.is_current = true), 0) AS diesel_minor,
      COALESCE((SELECT SUM(mp.unit_cost_txn * mp.qty) FROM tenant.maintenance_parts mp JOIN tenant.maintenance_visits mv ON mv.id = mp.visit_id WHERE mv.machine_id = d.machine_id AND mv.is_current = true), 0) AS parts_minor,
      COALESCE((SELECT SUM(mv.labour_base) FROM tenant.maintenance_visits mv WHERE mv.machine_id = d.machine_id AND mv.is_current = true), 0) AS labour_minor
    FROM tenant.billing_ledger bl
    JOIN tenant.deployments d ON d.id = bl.deployment_id
    GROUP BY bl.tenant_id, bl.deployment_id, d.machine_id;`;

const KPIS = `
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      COALESCE((SELECT SUM(bl.amount_minor) FROM tenant.billing_ledger bl WHERE bl.tenant_id = t.id), 0) AS total_billed_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.tenant_id = t.id AND cme.event_type = 'receipt' AND cme.is_current = true), 0) AS total_receipts_minor,
      COALESCE((SELECT SUM(e.amount_minor) FROM tenant.expenses e WHERE e.tenant_id = t.id AND e.is_current = true), 0) AS total_expenses_minor,
      (SELECT COUNT(*) FROM tenant.machines m WHERE m.tenant_id = t.id AND m.status_flag = 'active') AS active_machines,
      (SELECT COUNT(*) FROM tenant.work_sessions ws WHERE ws.tenant_id = t.id AND ws.is_current = true AND DATE(ws.start_at) = CURRENT_DATE) AS sessions_today
    FROM platform.tenants t;`;

// Pre-this-migration definitions, for `down`.
const RECEIVABLE_OLD = `
    SELECT
      bl.tenant_id,
      d.site_id,
      s.client_id,
      c.name AS client_name,
      c.currency,
      COALESCE(SUM(CASE WHEN bl.kind IN ('work', 'minimum_topup', 'standby', 'monthly_hire') THEN bl.amount_minor ELSE 0 END), 0) AS billed_minor,
      COALESCE(SUM(CASE WHEN bl.kind = 'extra_charge' THEN bl.amount_minor ELSE 0 END), 0) AS extras_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.client_id = s.client_id AND cme.event_type = 'credit_note' AND cme.is_current = true), 0) AS credits_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.client_id = s.client_id AND cme.event_type = 'receipt' AND cme.is_current = true), 0) AS receipts_minor,
      COALESCE((SELECT SUM(ac.base_minor) FROM tenant.advance_consumptions ac JOIN tenant.client_money_events cme ON cme.id = ac.advance_id WHERE cme.client_id = s.client_id), 0) AS advances_consumed_minor
    FROM tenant.billing_ledger bl
    JOIN tenant.deployments d ON d.id = bl.deployment_id
    JOIN tenant.sites s ON s.id = d.site_id
    JOIN tenant.clients c ON c.id = s.client_id
    WHERE bl.kind != 'adjustment'
    GROUP BY bl.tenant_id, d.site_id, s.client_id, c.name, c.currency;`;

const CONTRIB_OLD = `
    SELECT
      bl.tenant_id,
      bl.deployment_id,
      d.machine_id,
      COALESCE(SUM(CASE WHEN bl.kind IN ('work', 'minimum_topup', 'standby', 'monthly_hire') THEN bl.amount_minor ELSE 0 END), 0) AS billed_minor,
      COALESCE((SELECT SUM(fl.cost_minor) FROM tenant.fuel_logs fl WHERE fl.machine_id = d.machine_id AND fl.is_current = true), 0) AS diesel_minor,
      COALESCE((SELECT SUM(mp.unit_cost_txn * mp.qty) FROM tenant.maintenance_parts mp JOIN tenant.maintenance_visits mv ON mv.id = mp.visit_id WHERE mv.machine_id = d.machine_id AND mv.is_current = true), 0) AS parts_minor,
      COALESCE((SELECT SUM(mv.labour_base) FROM tenant.maintenance_visits mv WHERE mv.machine_id = d.machine_id AND mv.is_current = true), 0) AS labour_minor
    FROM tenant.billing_ledger bl
    JOIN tenant.deployments d ON d.id = bl.deployment_id
    WHERE bl.kind != 'adjustment'
    GROUP BY bl.tenant_id, bl.deployment_id, d.machine_id;`;

const KPIS_OLD = `
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      COALESCE((SELECT SUM(bl.amount_minor) FROM tenant.billing_ledger bl WHERE bl.tenant_id = t.id AND bl.kind != 'adjustment'), 0) AS total_billed_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.tenant_id = t.id AND cme.event_type = 'receipt' AND cme.is_current = true), 0) AS total_receipts_minor,
      COALESCE((SELECT SUM(e.amount_minor) FROM tenant.expenses e WHERE e.tenant_id = t.id AND e.is_current = true), 0) AS total_expenses_minor,
      (SELECT COUNT(*) FROM tenant.machines m WHERE m.tenant_id = t.id AND m.status_flag = 'active') AS active_machines,
      (SELECT COUNT(*) FROM tenant.work_sessions ws WHERE ws.tenant_id = t.id AND ws.is_current = true AND DATE(ws.start_at) = CURRENT_DATE) AS sessions_today
    FROM platform.tenants t;`;

exports.up = (pgm) => {
  // One base row per deployment/day/kind: concurrent posts of the same day
  // resolve to a no-op instead of a duplicate invoice.
  pgm.sql(
    `CREATE UNIQUE INDEX IF NOT EXISTS billing_ledger_day_kind_uniq
       ON tenant.billing_ledger (deployment_id, entry_date, kind)
       WHERE kind NOT IN ('adjustment', 'extra_charge');`,
  );
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_client_receivable AS ${RECEIVABLE}`);
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_machine_contribution AS ${CONTRIB}`);
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_tenant_kpis AS ${KPIS}`);
};

exports.down = (pgm) => {
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_client_receivable AS ${RECEIVABLE_OLD}`);
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_machine_contribution AS ${CONTRIB_OLD}`);
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_tenant_kpis AS ${KPIS_OLD}`);
  pgm.sql(`DROP INDEX IF EXISTS tenant.billing_ledger_day_kind_uniq;`);
};
