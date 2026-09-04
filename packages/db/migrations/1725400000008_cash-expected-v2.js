/**
 * CSH-04: real expected-balance engine for v_cash_expected.
 * expected = transfers in − transfers out − expenses paid from the account
 * (base minor units); variance = expected − latest physical count.
 * Counts store [{value (major), quantity}], summed to minor units.
 * Grants preserved: owner-only (app_ops/app_platform revoked).
 */

exports.up = (pgm) => {
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_cash_expected;`);
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
    ) lc ON true;
  `);
  pgm.sql(`REVOKE ALL ON tenant.v_cash_expected FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_cash_expected FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_cash_expected TO app_owner;`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP VIEW IF EXISTS tenant.v_cash_expected;`);
  pgm.sql(`CREATE VIEW tenant.v_cash_expected AS
    SELECT
      ca.tenant_id,
      ca.id AS account_id,
      ca.name AS account_name,
      ca.currency,
      0 AS expected_minor,
      0 AS last_count_minor,
      0 AS variance_minor
    FROM tenant.cash_accounts ca;
  `);
  pgm.sql(`REVOKE ALL ON tenant.v_cash_expected FROM app_ops;`);
  pgm.sql(`REVOKE ALL ON tenant.v_cash_expected FROM app_platform;`);
  pgm.sql(`GRANT SELECT ON tenant.v_cash_expected TO app_owner;`);
};
