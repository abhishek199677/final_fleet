/**
 * Commercial hardening tables (BRD §3, BIL-07, SEC-08, ADM-06, ALT-04).
 * - tenant.approval_requests: owner approval queue + OTP verification record.
 * - tenant.period_closes: month-end close per tenant (owner + OTP).
 * - platform.support_access_grants: audited, time-limited, owner-approved access.
 * All tenant tables follow non-negotiable rule 1: tenant_id, index, FORCE RLS, policy.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS tenant.approval_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      kind text NOT NULL CHECK (kind IN ('period_close','support_access','sensitive_change')),
      payload jsonb NOT NULL DEFAULT '{}',
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
      otp_hash text NULL,
      otp_expires_at timestamptz NULL,
      requested_by uuid NULL,
      decided_by uuid NULL,
      decided_at timestamptz NULL,
      reason text NULL,
      client_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, client_uuid)
    );
    CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant ON tenant.approval_requests (tenant_id);
    ALTER TABLE tenant.approval_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tenant.approval_requests FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON tenant.approval_requests;
    CREATE POLICY tenant_isolation ON tenant.approval_requests
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    GRANT SELECT, INSERT ON tenant.approval_requests TO app_owner;
    GRANT SELECT ON tenant.approval_requests TO app_ops;
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS tenant.period_closes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
      closed_by uuid NULL,
      closed_at timestamptz NOT NULL DEFAULT now(),
      approval_id uuid NULL REFERENCES tenant.approval_requests (id),
      note text NULL,
      client_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
      UNIQUE (tenant_id, period),
      UNIQUE (tenant_id, client_uuid)
    );
    CREATE INDEX IF NOT EXISTS idx_period_closes_tenant ON tenant.period_closes (tenant_id);
    ALTER TABLE tenant.period_closes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tenant.period_closes FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON tenant.period_closes;
    CREATE POLICY tenant_isolation ON tenant.period_closes
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
    GRANT SELECT, INSERT ON tenant.period_closes TO app_owner;
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS platform.support_access_grants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES platform.tenants (id),
      ticket_id uuid NULL,
      reason text NOT NULL,
      granted_by uuid NULL,
      granted_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      scope text NOT NULL DEFAULT 'metadata' CHECK (scope IN ('metadata','support_read')),
      finance_unmasked boolean NOT NULL DEFAULT false,
      revoked_at timestamptz NULL
    );
    CREATE INDEX IF NOT EXISTS idx_support_grants_tenant ON platform.support_access_grants (tenant_id);
    GRANT SELECT, INSERT, UPDATE ON platform.support_access_grants TO app_platform;
  `);

  // Append-only: no UPDATE/DELETE for app roles on tenant hardening tables.
  pgm.sql(`REVOKE UPDATE, DELETE ON tenant.approval_requests FROM app_owner;`);
  pgm.sql(`REVOKE UPDATE, DELETE ON tenant.approval_requests FROM app_ops;`);
  pgm.sql(`REVOKE UPDATE, DELETE ON tenant.period_closes FROM app_owner;`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS platform.support_access_grants;`);
  pgm.sql(`DROP TABLE IF EXISTS tenant.period_closes;`);
  pgm.sql(`DROP TABLE IF EXISTS tenant.approval_requests;`);
};
