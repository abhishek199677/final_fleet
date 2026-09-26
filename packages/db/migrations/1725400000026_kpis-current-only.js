/**
 * v_tenant_kpis summed every version of an append-only row, not just the
 * current one.
 *
 * Corrections and voids insert/retain earlier versions on purpose — so after a
 * single correction (or a void, which used to be implemented as a correction
 * carrying the same amount) `total_expenses_minor` counted the same money
 * twice. Same for `total_receipts_minor` over client_money_events.
 *
 * Every other finance view already filters `is_current = true`; this brings
 * v_tenant_kpis in line so voided and superseded rows stop inflating the
 * headline numbers.
 *
 * CREATE OR REPLACE (not DROP): column names, types and order are unchanged,
 * which keeps the existing app_owner grant intact.
 */

const VIEW = `
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
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_tenant_kpis AS ${VIEW}`);
};

exports.down = (pgm) => {
  pgm.sql(`CREATE OR REPLACE VIEW tenant.v_tenant_kpis AS
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      COALESCE((SELECT SUM(bl.amount_minor) FROM tenant.billing_ledger bl WHERE bl.tenant_id = t.id AND bl.kind != 'adjustment'), 0) AS total_billed_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.tenant_id = t.id AND cme.event_type = 'receipt'), 0) AS total_receipts_minor,
      COALESCE((SELECT SUM(e.amount_minor) FROM tenant.expenses e WHERE e.tenant_id = t.id), 0) AS total_expenses_minor,
      (SELECT COUNT(*) FROM tenant.machines m WHERE m.tenant_id = t.id AND m.status_flag = 'active') AS active_machines,
      (SELECT COUNT(*) FROM tenant.work_sessions ws WHERE ws.tenant_id = t.id AND ws.is_current = true AND DATE(ws.start_at) = CURRENT_DATE) AS sessions_today
    FROM platform.tenants t;`);
};
