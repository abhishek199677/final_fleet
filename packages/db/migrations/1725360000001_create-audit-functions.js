/**
 * S01: Create fn_supersede and fn_audit functions
 * TSD §2.4 — append-only, versioning, audit trail
 */

exports.up = (pgm) => {
  // fn_supersede: sets is_current=false on the row being superseded
  pgm.sql(`
    CREATE OR REPLACE FUNCTION tenant.fn_supersede()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.supersedes_id IS NOT NULL THEN
        UPDATE tenant."table_name"
        SET is_current = false
        WHERE id = NEW.supersedes_id AND is_current = true;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // fn_audit: logs every write to audit_log
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
        current_setting('app.user_id', true)::uuid,
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

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS tenant.fn_audit();`);
  pgm.sql(`DROP FUNCTION IF EXISTS tenant.fn_supersede();`);
};
