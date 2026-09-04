/**
 * Restore real view definitions (0006 replaced them with SELECT 1 stubs).
 * Finance views: owner-only. Shared views: owner + ops (TSD §3.4).
 */

exports.up = (pgm) => {
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_machine_daily_ops;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_maintenance_status;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_logging_compliance;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_evidence_coverage;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_client_receivable;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_unused_advances;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_machine_contribution;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_cash_expected;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_tenant_kpis;`);
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_projection_inputs;`);
  pgm.sql(`CREATE VIEW tenant.v_machine_daily_ops AS
    SELECT
      ws.tenant_id,
      ws.machine_id,
      DATE(ws.start_at) AS work_date,
      SUM(COALESCE(ws.units_run, 0)) AS units,
      COALESCE(SUM(fl.litres), 0) AS litres,
      CASE WHEN SUM(COALESCE(ws.units_run, 0)) > 0
        THEN ROUND(COALESCE(SUM(fl.litres), 0) / SUM(COALESCE(ws.units_run, 0)), 2)
        ELSE 0 END AS litres_per_unit,
      COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ds.ended_at, now()) - ds.started_at)) / 3600), 0) AS downtime_hours
    FROM tenant.work_sessions ws
    LEFT JOIN tenant.fuel_logs fl ON fl.machine_id = ws.machine_id AND DATE(fl.created_at) = DATE(ws.start_at) AND fl.is_current = true
    LEFT JOIN tenant.downtime_segments ds ON ds.machine_id = ws.machine_id AND ds.started_at::date = DATE(ws.start_at) AND ds.is_current = true
    WHERE ws.is_current = true
    GROUP BY ws.tenant_id, ws.machine_id, DATE(ws.start_at);`);
  pgm.sql(`CREATE VIEW tenant.v_maintenance_status AS
    SELECT
      mt.tenant_id,
      mt.machine_id,
      mt.id AS task_id,
      mt.name AS task_name,
      mt.trigger AS trigger_type,
      m.current_meter,
      CASE
        WHEN mt.trigger = 'meter' THEN GREATEST(0, mt.next_due_value - m.current_meter)
        ELSE NULL
      END AS units_to_due,
      CASE
        WHEN mt.trigger = 'calendar' THEN GREATEST(0, (mt.next_due_date - CURRENT_DATE))
        ELSE NULL
      END AS days_to_due,
      CASE
        WHEN mt.next_due_value IS NOT NULL AND m.current_meter >= mt.next_due_value THEN 'overdue'
        WHEN mt.next_due_value IS NOT NULL AND m.current_meter >= (mt.next_due_value - mt.warning_value) THEN 'warning'
        WHEN mt.next_due_date IS NOT NULL AND CURRENT_DATE >= mt.next_due_date THEN 'overdue'
        WHEN mt.next_due_date IS NOT NULL AND CURRENT_DATE >= (mt.next_due_date - (mt.warning_value || ' days')::interval) THEN 'warning'
        ELSE 'ok'
      END AS status
    FROM tenant.maintenance_tasks mt
    JOIN tenant.machines m ON m.id = mt.machine_id;`);
  pgm.sql(`CREATE VIEW tenant.v_logging_compliance AS
    SELECT
      m.tenant_id,
      m.id AS machine_id,
      m.code AS machine_code,
      DATE_TRUNC('day', now())::date AS check_date,
      CASE WHEN ws.id IS NOT NULL THEN true ELSE false END AS has_session_today
    FROM tenant.machines m
    LEFT JOIN tenant.work_sessions ws ON ws.machine_id = m.id
      AND DATE(ws.start_at) = DATE_TRUNC('day', now())::date
      AND ws.is_current = true
    WHERE m.status_flag != 'retired';`);
  pgm.sql(`CREATE VIEW tenant.v_evidence_coverage AS
    SELECT
      ws.tenant_id,
      ws.machine_id,
      DATE(ws.start_at) AS work_date,
      COUNT(*) AS total_sessions,
      COUNT(ws.start_photo_key) AS start_photo_count,
      COUNT(ws.end_photo_key) AS end_photo_count,
      ROUND(COUNT(ws.start_photo_key)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS start_coverage_pct,
      ROUND(COUNT(ws.end_photo_key)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS end_coverage_pct
    FROM tenant.work_sessions ws
    WHERE ws.is_current = true
    GROUP BY ws.tenant_id, ws.machine_id, DATE(ws.start_at);`);
  pgm.sql(`CREATE VIEW tenant.v_client_receivable AS
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
    GROUP BY bl.tenant_id, d.site_id, s.client_id, c.name, c.currency;`);
  pgm.sql(`CREATE VIEW tenant.v_unused_advances AS
    SELECT
      cme.tenant_id,
      cme.client_id,
      c.name AS client_name,
      cme.id AS advance_id,
      cme.amount_minor AS original_minor,
      COALESCE((SELECT SUM(ac.base_minor) FROM tenant.advance_consumptions ac WHERE ac.advance_id = cme.id), 0) AS consumed_minor,
      cme.amount_minor - COALESCE((SELECT SUM(ac.base_minor) FROM tenant.advance_consumptions ac WHERE ac.advance_id = cme.id), 0) AS remaining_minor,
      cme.currency,
      cme.event_date
    FROM tenant.client_money_events cme
    JOIN tenant.clients c ON c.id = cme.client_id
    WHERE cme.event_type = 'advance' AND cme.is_current = true;`);
  pgm.sql(`CREATE VIEW tenant.v_machine_contribution AS
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
    GROUP BY bl.tenant_id, bl.deployment_id, d.machine_id;`);
  pgm.sql(`CREATE VIEW tenant.v_cash_expected AS
    SELECT
      ca.tenant_id,
      ca.id AS account_id,
      ca.name AS account_name,
      ca.currency,
      (COALESCE(tin.total, 0) - COALESCE(tout.total, 0) - COALESCE(exp.total, 0))::bigint AS expected_minor,
      COALESCE(lc.total, 0)::bigint AS last_count_minor,
      (COALESCE(tin.total, 0) - COALESCE(tout.total, 0) - COALESCE(exp.total, 0) - COALESCE(lc.total, 0))::bigint AS variance_minor
    FROM tenant.cash_accounts ca
    LEFT JOIN (
      SELECT to_account_id AS aid, SUM(COALESCE(base_minor, amount_minor, 0)) AS total
      FROM tenant.cash_transfers GROUP BY to_account_id
    ) tin ON tin.aid = ca.id
    LEFT JOIN (
      SELECT from_account_id AS aid, SUM(COALESCE(base_minor, amount_minor, 0)) AS total
      FROM tenant.cash_transfers GROUP BY from_account_id
    ) tout ON tout.aid = ca.id
    LEFT JOIN (
      SELECT cash_account_id AS aid, SUM(COALESCE(base_minor, amount_minor, 0)) AS total
      FROM tenant.expenses WHERE is_current = true GROUP BY cash_account_id
    ) exp ON exp.aid = ca.id
    LEFT JOIN LATERAL (
      SELECT (SELECT COALESCE(SUM(((elem->>'value')::numeric * (elem->>'quantity')::numeric) * 100), 0)
              FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(cc.counted) = 'array' THEN cc.counted ELSE '[]'::jsonb END
              ) AS elem)::bigint AS total
      FROM tenant.cash_counts cc
      WHERE cc.cash_account_id = ca.id AND cc.is_current = true
      ORDER BY cc.count_date DESC, cc.created_at DESC
      LIMIT 1
    ) lc ON true;`);
  pgm.sql(`CREATE VIEW tenant.v_tenant_kpis AS
    SELECT
      t.id AS tenant_id,
      t.name AS tenant_name,
      COALESCE((SELECT SUM(bl.amount_minor) FROM tenant.billing_ledger bl WHERE bl.tenant_id = t.id AND bl.kind != 'adjustment'), 0) AS total_billed_minor,
      COALESCE((SELECT SUM(cme.amount_minor) FROM tenant.client_money_events cme WHERE cme.tenant_id = t.id AND cme.event_type = 'receipt'), 0) AS total_receipts_minor,
      COALESCE((SELECT SUM(e.amount_minor) FROM tenant.expenses e WHERE e.tenant_id = t.id), 0) AS total_expenses_minor,
      (SELECT COUNT(*) FROM tenant.machines m WHERE m.tenant_id = t.id AND m.status_flag = 'active') AS active_machines,
      (SELECT COUNT(*) FROM tenant.work_sessions ws WHERE ws.tenant_id = t.id AND ws.is_current = true AND DATE(ws.start_at) = CURRENT_DATE) AS sessions_today
    FROM platform.tenants t;`);
  pgm.sql(`CREATE VIEW tenant.v_projection_inputs AS
    SELECT
      t.id AS tenant_id,
      t.base_currency,
      (SELECT COUNT(*) FROM tenant.machines m WHERE m.tenant_id = t.id AND m.status_flag = 'active') AS active_machines,
      ts.working_days_per_month,
      ts.working_units_per_day
    FROM platform.tenants t
    JOIN platform.tenant_settings ts ON ts.tenant_id = t.id;`);
  pgm.sql(`GRANT SELECT ON tenant.v_machine_daily_ops TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT ON tenant.v_maintenance_status TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT ON tenant.v_logging_compliance TO app_owner, app_ops;`);
  pgm.sql(`GRANT SELECT ON tenant.v_evidence_coverage TO app_owner, app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_client_receivable FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_client_receivable FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_client_receivable TO app_owner;`);
  pgm.sql(`REVOKE ALL ON tenant.v_unused_advances FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_unused_advances FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_unused_advances TO app_owner;`);
  pgm.sql(`REVOKE ALL ON tenant.v_machine_contribution FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_machine_contribution FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_machine_contribution TO app_owner;`);
  pgm.sql(`REVOKE ALL ON tenant.v_cash_expected FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_cash_expected FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_cash_expected TO app_owner;`);
  pgm.sql(`REVOKE ALL ON tenant.v_tenant_kpis FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_tenant_kpis FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_tenant_kpis TO app_owner;`);
  pgm.sql(`REVOKE ALL ON tenant.v_projection_inputs FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_projection_inputs FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_projection_inputs TO app_owner;`);
};

exports.down = (pgm) => {};
