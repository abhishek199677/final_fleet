# Fleet OS — agent standing orders

You are working on Fleet OS, a multi-tenant SaaS for heavy-equipment operators. The product spec is docs/BRD.md; the technical spec is docs/TSD.md. Read the relevant section of each before starting any task. Every PR must cite the requirement IDs it implements (e.g. WRK-01, BIL-03).

## Stack (do not substitute)
- Monorepo, pnpm workspaces, TypeScript strict.
- packages/db: SQL migrations (node-pg-migrate), RLS policies, grants, seed, generated isolation tests.
- packages/api: NestJS modular monolith, Postgres via pg + a small query layer (no ORM magic; SQL in .sql files or tagged templates).
- packages/shared: OpenAPI-generated types, enums, error codes.
- packages/web: Next.js (App Router), Tailwind, shadcn/ui, Recharts, next-intl (en, fr).
- packages/infra: AWS CDK (TypeScript).
- packages/mobile: Flutter (built after web launch; do not start unless the task says so).
- Tests: vitest (api, shared, web), Postgres testcontainer for integration, Playwright for e2e.

## Non-negotiable rules
1. Every table in schema `tenant` has `tenant_id uuid not null`, an index on it, `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, and a policy on `current_setting('app.tenant_id')::uuid`.
2. Three DB roles: app_owner, app_ops, app_platform. Finance tables and views (rate_cards, extra_charges, billing_ledger, client_money_events, advance_consumptions, machine_financials, client_credit, v_client_receivable, v_unused_advances, v_machine_contribution, v_cash_expected, v_tenant_kpis, v_projection_inputs) have NO grants to app_ops or app_platform. Never add a finance column to an operational table; add a finance table instead.
3. Transactional tables are append-only: no UPDATE/DELETE grants to app roles. Corrections are new rows with supersedes_id and version; a trigger maintains is_current.
4. Money: store currency, amount_minor (integer), fx_rate numeric(18,8), base_minor. Never store floats for money. fx_rate required when currency ≠ tenant base currency.
5. Every write endpoint accepts client_uuid and is idempotent.
6. Errors are RFC 7807 with a code from packages/shared/src/errors.ts. Add new codes there, never inline strings.
7. Ops routes and components never import finance clients or types. Web: /ops/* must not reference packages/shared finance modules (lint rule enforces).
8. No secrets in code or tests. Dev AWS account only. Never modify packages/infra/prod-* stacks; propose changes in a PR description instead.
9. Strings in web are externalised to messages/en.json and messages/fr.json from the first commit.
10. Do not add libraries without stating why in the PR; prefer what is already in the repo.

## How to work
- Read the task. Restate it in 2–3 lines with the BRD/TSD IDs. Propose a plan (files, migrations, tests). Wait for approval only if the task says "plan first"; otherwise proceed.
- Test first: write failing tests from the requirement, then implement, then run `pnpm test` and `pnpm test:isolation` until green.
- Use the skills in .claude/skills for repeatable work. If you find yourself deriving a pattern that a skill should cover, add or update the skill in the same PR.
- Small PRs, one slice each (migration + api + client + web + tests for one requirement group). Branch name: `slice/<id>-<short-name>`.
- Commit only to your branch. Never push to main.
- Before declaring done: tests green, lint green, OpenAPI regenerated and committed, migration linter green, PR description lists IDs, what was tested, and anything skipped.

## Definition of done for a slice
- Migration (if any) with RLS, grants, indexes; isolation test generator picks it up automatically.
- API endpoints with DTO validation, error codes, idempotency.
- OpenAPI updated; clients regenerated.
- Web screen(s) wired, en + fr strings.
- Unit + integration tests; e2e for user-facing flows.
- No finance leakage to ops (run `pnpm test:finance-denial`).

## Things agents get wrong here (check yourself)
- Forgetting FORCE ROW LEVEL SECURITY (owner of table bypasses RLS otherwise).
- Adding rate or cost columns to machines/deployments/sessions.
- Recomputing billing in place instead of writing adjustment entries.
- Allowing overlapping work sessions (use the exclusion constraint on tstzrange per machine for is_current rows).
- Showing expected cash balance or variance on any ops screen.
- Using floats or JS Number arithmetic for money; use bigint minor units.
- Hard-coding USD or a single local currency.
