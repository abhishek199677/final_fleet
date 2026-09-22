/**
 * Attach the audit-trail and supersede triggers (S01, TSD §2.4).
 *
 * The first migration created tenant.fn_audit() / tenant.fn_supersede() but
 * never attached them to a single table, so audit_log stayed empty forever
 * (the Audit page could never show anything) and only work_sessions — which
 * clears is_current inline in the API — ever superseded rows.
 *
 * It also hardens fn_audit: once a transaction has run `SET LOCAL
 * app.user_id`, the custom placeholder resets to '' between transactions,
 * and `''::uuid` throws, which would break every subsequent write. NULLIF
 * maps the empty string back to NULL (user_id is nullable).
 *
 * audit_log itself, user_credentials (password hashes must never be copied
 * into jsonb) and notifications (noise) are deliberately not audited.
 */

const AUDIT_TABLES = [
  'advance_consumptions', 'alert_rules', 'alerts', 'approval_requests',
  'billing_ledger', 'cash_accounts', 'cash_counts', 'cash_transfers',
  'client_credit', 'client_money_events', 'clients', 'deployments',
  'downtime_segments', 'expense_categories', 'expenses', 'extra_charges',
  'fuel_logs', 'insight_notes', 'machine_financials', 'machines',
  'maintenance_parts', 'maintenance_tasks', 'maintenance_visit_tasks',
  'maintenance_visits', 'operators', 'period_closes', 'photos',
  'rate_cards', 'sites', 'users', 'work_sessions',
];

const SUPERSEDE_TABLES = [
  'cash_counts', 'client_money_events', 'downtime_segments', 'expenses',
  'extra_charges', 'fuel_logs', 'maintenance_visits', 'work_sessions',
];

exports.up = (pgm) => {
  // fn_audit with the empty-string guard (see header).
  pgm.sql(`
    CREATE OR REPLACE FUNCTION tenant.fn_audit()
    RETURNS TRIGGER AS $$
    DECLARE
      _operation text;
      _record_id uuid;
      _table_name text;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        _operation := 'insert';
        _record_id := NEW.id;
        _table_name := TG_TABLE_NAME;
      ELSIF TG_OP = 'UPDATE' THEN
        _operation := 'update';
        _record_id := NEW.id;
        _table_name := TG_TABLE_NAME;
      ELSIF TG_OP = 'DELETE' THEN
        _operation := 'delete';
        _record_id := OLD.id;
        _table_name := TG_TABLE_NAME;
      END IF;

      INSERT INTO tenant.audit_log (
        tenant_id, user_id, operation, table_name, record_id, old_data, new_data, created_at
      ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        NULLIF(current_setting('app.user_id', true), '')::uuid,
        _operation,
        _table_name,
        _record_id,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        now()
      );

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const table of AUDIT_TABLES) {
    pgm.sql(`DROP TRIGGER IF EXISTS audit_trg ON tenant.${table};`);
    pgm.sql(
      `CREATE TRIGGER audit_trg
       AFTER INSERT OR UPDATE OR DELETE ON tenant.${table}
       FOR EACH ROW EXECUTE FUNCTION tenant.fn_audit();`,
    );
  }

  // BEFORE INSERT so the superseded row is cleared before constraints
  // (e.g. work_sessions' overlap exclusion) are checked.
  for (const table of SUPERSEDE_TABLES) {
    pgm.sql(`DROP TRIGGER IF EXISTS supersede_trg ON tenant.${table};`);
    pgm.sql(
      `CREATE TRIGGER supersede_trg
       BEFORE INSERT ON tenant.${table}
       FOR EACH ROW EXECUTE FUNCTION tenant.fn_supersede();`,
    );
  }

  console.log(`✅ fn_audit attached to ${AUDIT_TABLES.length} tables, fn_supersede to ${SUPERSEDE_TABLES.length}`);
};

exports.down = (pgm) => {
  for (const table of AUDIT_TABLES) {
    pgm.sql(`DROP TRIGGER IF EXISTS audit_trg ON tenant.${table};`);
  }
  for (const table of SUPERSEDE_TABLES) {
    pgm.sql(`DROP TRIGGER IF EXISTS supersede_trg ON tenant.${table};`);
  }
  // The hardened fn_audit body is kept: it is a strict superset of the old one.
};
