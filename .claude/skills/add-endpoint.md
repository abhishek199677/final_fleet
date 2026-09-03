# Skill: add an API endpoint

1. Module under packages/api/src/modules/<domain>/ : controller, service, repository, dto/.
2. Controller: `@Roles('owner')` or `@Roles('owner','ops')`; finance endpoints are owner-only and live under modules/finance.
3. DTO with class-validator; money fields as { currency, amountMinor: string (bigint), fxRate?: string }.
4. Writes: require `clientUuid`; repository does `INSERT ... ON CONFLICT (tenant_id, client_uuid) DO NOTHING RETURNING *` then selects the existing row if nothing returned; respond 200 with the existing row.
5. Corrections: `POST /<resource>/:id/corrections` inserts a new version; rely on the DB policy for the 24h window; map SQL error to `EDIT_WINDOW_CLOSED`.
6. Errors: throw `ProblemError(code, status, detail)` with a code from packages/shared/src/errors.ts.
7. OpenAPI decorators on every route and DTO; run `pnpm openapi:gen` to regenerate packages/shared clients; commit the output.
8. Tests: unit for service logic; integration hitting Postgres testcontainer as both app_owner and app_ops (ops must get 403 or permission-denied on finance).
