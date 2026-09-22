/**
 * Harden fn_audit for real tables.
 *
 * Verification against the live API exposed two crashes in the function
 * migration 1725400000020 installed:
 *
 * 1. `_record_id := NEW.id` throws `record "new" has no field "id"`
 *    (42703) on advance_consumptions, client_credit, machine_financials
 *    and maintenance_visit_tasks — none of them have an `id` column. That
 *    aborted POST /v1/billing/run mid-flight whenever an advance existed.
 * 2. NEW/OLD are only assigned for the matching trigger operation, so the
 *    safe way to read any column is via to_jsonb(), guarded per TG_OP.
 *
 * record_id is nullable in audit_log, so tables without a natural `id`
 * simply audit with record_id = NULL.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION tenant.fn_audit()
    RETURNS TRIGGER AS $$
    DECLARE
      _operation text;
      _record_id uuid;
      _table_name text;
      _new jsonb;
      _old jsonb;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        _operation := 'insert';
      ELSIF TG_OP = 'UPDATE' THEN
        _operation := 'update';
      ELSIF TG_OP = 'DELETE' THEN
        _operation := 'delete';
      END IF;
      _table_name := TG_TABLE_NAME;

      IF TG_OP <> 'INSERT' THEN _old := to_jsonb(OLD); END IF;
      IF TG_OP <> 'DELETE' THEN _new := to_jsonb(NEW); END IF;

      _record_id := COALESCE(_new ->> 'id', _old ->> 'id')::uuid;

      INSERT INTO tenant.audit_log (
        tenant_id, user_id, operation, table_name, record_id, old_data, new_data, created_at
      ) VALUES (
        COALESCE((_new ->> 'tenant_id')::uuid, (_old ->> 'tenant_id')::uuid),
        NULLIF(current_setting('app.user_id', true), '')::uuid,
        _operation,
        _table_name,
        _record_id,
        _old,
        _new,
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

  console.log('✅ fn_audit reads columns via to_jsonb (works on tables without id)');
};

exports.down = (pgm) => {
  // Revert to the migration-20 body (KNOWN to fail on id-less tables).
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
};
