/**
 * Two wiring fixes found by the end-to-end audit:
 *
 * 1. maintenance_tasks.warning_value is NOT NULL, but the API inserts NULL
 *    when no warning threshold is supplied (it treats the field as optional)
 *    → every maintenance task without an explicit warning value failed 500.
 *
 * 2. Only tenants created through POST /v1/auth/register get a default cash
 *    account. The demo tenant predates that seed and, with no create
 *    endpoint historically, had zero accounts — which dead-ended cash
 *    counts, transfers and account-paid expenses. Backfill the same default
 *    row register uses.
 */

exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE tenant.maintenance_tasks ALTER COLUMN warning_value DROP NOT NULL;`);

  pgm.sql(`
    INSERT INTO tenant.cash_accounts (tenant_id, name, type, currency, is_default)
    SELECT t.id, 'Main Cash', 'site_cash', 'INR', true
    FROM platform.tenants t
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant.cash_accounts ca WHERE ca.tenant_id = t.id
    );
  `);

  console.log('✅ warning_value is optional; every tenant now has a default cash account');
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM tenant.maintenance_tasks WHERE warning_value IS NULL) THEN
        ALTER TABLE tenant.maintenance_tasks ALTER COLUMN warning_value SET NOT NULL;
      END IF;
    END $$;
  `);

  pgm.sql(`
    DELETE FROM tenant.cash_accounts ca
    WHERE ca.name = 'Main Cash'
      AND ca.is_default = true
      AND NOT EXISTS (SELECT 1 FROM tenant.cash_counts cc WHERE cc.cash_account_id = ca.id)
      AND NOT EXISTS (SELECT 1 FROM tenant.expenses e WHERE e.cash_account_id = ca.id)
      AND NOT EXISTS (SELECT 1 FROM tenant.cash_transfers ct
                      WHERE ct.from_account_id = ca.id OR ct.to_account_id = ca.id);
  `);
};
