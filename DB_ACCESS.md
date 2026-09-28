# Database Access Guide (pgAdmin 4 + psql)

How to connect a SQL client to the Fleet OS database, and the two project-specific
gotchas (**use the direct endpoint**, **set the tenant before you SELECT anything**).

All secrets live in the repo-root `.env` (git-ignored). Copy them from there — never
commit them, and never paste them into tickets or chat.

---

## 1. Register the server in pgAdmin 4

**File → Register → Server…**

| Field | Value |
|---|---|
| Name | `fleetos-neon` (anything you like) |
| Host | `ep-sweet-night-axik7k01.c-4.us-east-2.aws.neon.tech` ← **direct, no `-pooler`** |
| Port | `5432` |
| Maintenance database | `neondb` |
| Username | `neondb_owner` |
| Password | from `.env` → `DATABASE_URL_DIRECT` |
| SSL | **Require** (Save password ☑, set a pgAdmin master password) |

Parsing your own URL: strip `postgresql://USER:PASS@`, split the rest on `/` —
everything before the first `/` is `host:port`, everything after is the DB name.

### ⚠️ Why the direct endpoint and not `DATABASE_URL`?

`.env` has two URLs:

- `DATABASE_URL` → `ep-…-pooler.c-4…` — goes through **pgBouncer in transaction mode**.
  Session state (`SET`, `SET ROLE`, DDL, prepared statements, `SHOW`) is unreliable or
  silently lost. The long-running API uses this one because `pg` pooling wants it.
- `DATABASE_URL_DIRECT` → `ep-…c-4…` — no pooler. **This is what pgAdmin, psql,
  migrations, seeds and any admin work must use.** `scripts/run-with-env.js` already
  swaps it in for CLI commands.

If queries behave strangely (roles not sticking, `SET` ignored, errors mentioning
prepared statements), you registered the pooler host by mistake.

---

## 2. First query: find your tenant IDs

Tenant data is worthless without a `tenant_id`. List the workspaces first:

```sql
SELECT id, name, slug, status, created_at
FROM platform.tenants
ORDER BY created_at;
```

There is no seeded demo tenant — tenants are created by `POST /auth/register`
(`AuthService.register`). The local fallback tenant `00000000-0000-0000-0000-000000000001`
only exists if something explicitly inserted it.

---

## 3. THE important gotcha: row-level security

Every `tenant.*` table is `ENABLE ROW LEVEL SECURITY` **+ `FORCE ROW LEVEL SECURITY`**
(migrations `…00005`, `…00006`, `…00011`). The policy matches on a session GUC:

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'tenant' AND c.relkind = 'r'
ORDER BY c.relname;
```

`relforcerowsecurity = true` means **even the table owner is filtered**. So a bare
`SELECT * FROM tenant.machines;` in pgAdmin will very likely return **0 rows** — that is
RLS working, not an empty table.

### The correct session setup (mirrors what the API does per query)

Run this as one block in the pgAdmin query tool (or psql) before reading:

```sql
-- 1. Which tenant am I looking at?
SET app.tenant_id = 'PASTE-TENANT-UUID-HERE';

-- 2. Act like the application (optional but recommended)
SET ROLE app_owner;   -- full CRUD incl. money tables
-- SET ROLE app_ops;  -- operator role: no rate_cards / billing_ledger / machine_financials
-- SET ROLE app_platform;  -- tenants, entitlements, user_credentials only
```

Now queries return real rows:

```sql
SELECT code, type, make, model, status_flag FROM tenant.machines  ORDER BY code;
SELECT name, client_id FROM tenant.sites      ORDER BY name;
SELECT name, phone, currency FROM tenant.clients ORDER BY name;
```

Reset a session back to superuser-ish state:

```sql
RESET ROLE;
RESET app.tenant_id;
```

> `SET` is **session-scoped**. Every new pgAdmin query tool / psql connection starts
> clean — set the tenant again after reconnecting. In a fresh script you may prefer
> `BEGIN; SET LOCAL app.tenant_id = '…'; … ; COMMIT;` — same trick
> `DatabaseService.queryWithTenant()` uses (`packages/api/src/common/database/database.service.ts`).

### Your pgAdmin login is special: `neondb_owner` has `BYPASSRLS = true`

Verified on this database:

```sql
SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;
-- neondb_owner | t
```

So when you connect pgAdmin as `neondb_owner`, **RLS does not filter you** — you see
rows from *every* tenant, and `SET app.tenant_id` changes nothing for you. That is
convenient for admin work, but it means:

- A `SELECT` returning rows does **not** prove the app can see them.
- Always `SET ROLE app_owner` (plus `SET app.tenant_id`) to see what the **application**
  actually sees. That's the difference between "does the row exist?" and "can this
  tenant read it?".
- Never assume a write you do in pgAdmin will be scoped the way the app scopes it.

### Why `SET ROLE` at all?

The app never connects as a superuser. It opens three pools and runs
`SET LOCAL ROLE app_owner | app_ops | app_platform` (`NOLOGIN NOINHERIT`, no
`BYPASSRLS`) so a compromised API path can only touch what its role is granted
(`packages/db/migrations/1725400000018_full-crud-grants.js`). Working under
`app_owner` reproduces the app's real permissions instead of your owner-login
superpowers — you'll catch grant bugs instead of masking them.

---

## 4. Schema map

| Schema | Purpose | Key objects |
|---|---|---|
| `platform` | Cross-tenant / billing for the product itself | `tenants`, `tenant_settings`, `entitlements` |
| `tenant` | All per-customer business data | `users`, `user_credentials`, `machines`, `clients`, `sites`, `deployments`, `operators`, `work_sessions`, `fuel_logs`, `downtime_segments`, `maintenance_*`, `expenses`, `expense_categories`, `cash_accounts`, `cash_transfers`, `cash_counts`, `photos`, `rate_cards`, `extra_charges`, `billing_ledger`, `client_money_events`, `advance_consumptions`, `machine_financials`, `client_credit`, `alerts`, `notifications`, `insight_notes`, `approval_requests`, `period_closes`, `audit_log` |
| `ref` | Reference/lookup data | enums and code lists |

Full inventory with transactional flags: `packages/db/tables.json`.
Schema DDL: `packages/db/migrations/*.js` (node-pg-migrate, timestamped).

### Read-only cheat sheet

```sql
-- Today's work per machine
SELECT m.code, ws.start_at, ws.end_at, ws.start_meter, ws.end_meter, ws.operator_id
FROM tenant.work_sessions ws
JOIN tenant.machines m ON m.id = ws.machine_id
WHERE ws.is_current = true
ORDER BY ws.start_at DESC LIMIT 50;

-- Who is in this workspace
SELECT u.email, u.role, u.is_active, uc.created_at
FROM tenant.users u LEFT JOIN tenant.user_credentials uc ON uc.user_id = u.id
WHERE u.tenant_id = current_setting('app.tenant_id')::uuid;

-- What changed recently (append-only audit trail)
SELECT * FROM tenant.audit_log ORDER BY created_at DESC LIMIT 100;

-- Photo/evidence files (blob lives on disk or S3, row here is the pointer)
SELECT id, s3_key_original, s3_key_thumb, size_bytes, taken_at_device
FROM tenant.photos ORDER BY taken_at_device DESC LIMIT 50;
```

---

## 5. Safety rules

1. **Read first, write never by default.** pgAdmin is a diagnostic tool here; the app
   is the writer of record.
2. **Always `SET app.tenant_id` before an `UPDATE`/`DELETE`.** Without it RLS blocks
   the statement — which is the desired outcome. Do **not** "fix" that by disabling
   RLS (`ALTER TABLE … NO FORCE ROW LEVEL SECURITY`) on the shared database.
3. **Wrap writes in a transaction and read the plan first.**
   ```sql
   BEGIN;
   SET LOCAL app.tenant_id = '…';
   -- EXPLAIN / dry-run SELECT with the same WHERE clause
   UPDATE …;
   ROLLBACK;   -- commit only after you've eyeballed the result
   ```
4. **Never hand-edit `tenant.user_credentials`.** Passwords are
   `sha256(password + salt)`; saltless or re-hashed copies break login. Use the
   invite flow (`AuthService.acceptInvite`) to rotate a password.
5. **Money is append-only.** `billing_ledger`, `cash_counts`, `expenses`,
   `work_sessions`, `fuel_logs`, `downtime_segments`, `period_closes` are versioned /
   never destroyed (see `packages/db/generators/test-append-only.js`). Correct with a
   new version or a void, never an UPDATE that rewrites history.
6. **`tenant.audit_log` is written by triggers** (`fn_audit`). If you mutate rows
   outside the app, the acting user shows as your login role — expect that in review.
7. **Prefer a Neon branch for experiments.** Create a copy in the Neon console and
   point pgAdmin at the branch instead of poking production. Destructive SQL belongs
   on a branch, never on the primary.
8. **pgAdmin master password**: it protects every saved server password on that
   machine. Don't share the profile; don't store it on shared/cloud desktops.
9. **.env stays out of git** (it is in `.gitignore` — keep it that way). The Neon
   password, `OPENAI_API_KEY` and `GEMINI_API_KEY` in there are live credentials.

---

## 6. CLI equivalents (no GUI)

```bash
pnpm db:migrate        # run pending migrations (uses DATABASE_URL_DIRECT)
pnpm db:seed           # seed demo data
pnpm db:lint           # migration linter
pnpm verify:launch     # launch-acceptance checks

# ad-hoc SQL from a terminal
node scripts/run-with-env.js psql "$DATABASE_URL_DIRECT" \
  -c "SET app.tenant_id='…'; SELECT count(*) FROM tenant.machines;"
```

`scripts/run-with-env.js <cmd>` loads the repo-root `.env` and rewrites
`DATABASE_URL` to the direct endpoint for the child process — use it for anything
that talks to the database from the shell.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `SELECT` returns 0 rows on every table | You're under `SET ROLE app_owner` with no tenant set | `SET app.tenant_id = '<uuid>';` (as `neondb_owner` alone, RLS is bypassed and this won't be needed) |
| `permission denied for table …` under `SET ROLE app_ops` | Role lacks the grant (by design) | `RESET ROLE`, or use `app_owner` if you truly need money tables |
| `SET ROLE` / `SET app.tenant_id` seems ignored, odd prepared-statement errors | Connected through the **pooler** host | Re-register with the `-pooler` **removed** from the host |
| `SSL/TLS` or connection timeout | Wrong host or SSL mode off | Host must end in `.aws.neon.tech`, SSL = Require, port 5432 |
| `relation "tenant.machines" does not exist` | Migrations not run / wrong DB | `pnpm db:migrate`, check you're on `neondb` |
| Rows exist but the app shows nothing | You're on a different tenant than the app | Compare with `current_setting('app.tenant_id')` and the app's JWT `custom:tenant_id` |
| Table has `FORCE RLS` but you need an unfiltered count | Owner is filtered too | `SELECT count(*) …` per tenant in a `UNNEST` of tenant ids — don't turn RLS off |
