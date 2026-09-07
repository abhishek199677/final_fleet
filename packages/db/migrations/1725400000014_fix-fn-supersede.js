/**
 * Fix fn_supersede: use TG_TABLE_NAME instead of literal "table_name"
 * The original function referenced tenant."table_name" which only worked
 * for a table literally named "table_name". Now uses EXECUTE format() to
 * dynamically target the correct table.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION tenant.fn_supersede()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.supersedes_id IS NOT NULL THEN
        EXECUTE format(
          'UPDATE tenant.%I SET is_current = false WHERE id = $1 AND is_current = true',
          TG_TABLE_NAME
        ) USING NEW.supersedes_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
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
};
