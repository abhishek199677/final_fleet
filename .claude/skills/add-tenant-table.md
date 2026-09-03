# Skill: add a tenant table

Use when a slice needs a new table in schema `tenant`.

1. Create migration `packages/db/migrations/<timestamp>_<name>.sql` with:
   - `tenant_id uuid not null references platform.tenants(id)`
   - versioning columns if transactional: created_by uuid, created_at timestamptz default now(), client_uuid uuid not null, version int default 1, supersedes_id uuid null, is_current bool default true, source text default 'app'
   - unique (tenant_id, client_uuid)
   - indexes: (tenant_id), plus natural lookups
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;`
   - policy: `CREATE POLICY tenant_isolation ON tenant.<t> USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`
   - grants: operational → `GRANT SELECT, INSERT ON tenant.<t> TO app_owner, app_ops;` finance → `GRANT SELECT, INSERT ON tenant.<t> TO app_owner;` only. Never UPDATE/DELETE.
   - if transactional: attach `tenant.fn_supersede()` trigger (sets is_current=false on the superseded row) and `tenant.fn_audit()` trigger.
2. Register the table in `packages/db/tables.json` with `{ "name", "kind": "operational|finance", "transactional": true|false }` — the isolation and finance-denial test generators read this file.
3. Run `pnpm db:migrate && pnpm test:isolation && pnpm test:finance-denial`.
4. Add the TypeScript row type in packages/shared and a repository in packages/api.
