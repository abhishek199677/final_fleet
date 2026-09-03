# Fleet OS — launch backlog (paste each prompt into a fresh Claude Code session)

Conventions: one slice per session; branch `slice/<n>-<name>`; cite IDs; run the full CI locally before the PR. "Plan first" = agent proposes a plan and waits.

## Week 0 — foundation

**S00 Repo scaffold (plan first).** Create the pnpm monorepo per CLAUDE.md with packages db, api, shared, web, infra. Add lint, typecheck, vitest, Playwright, OpenAPI generation script, migration linter (`pnpm db:lint`) that fails when a tenant table lacks tenant_id/RLS/FORCE or grants a finance table to app_ops. Add the boundary lint rule that forbids `/ops/*` importing finance modules. Wire .github/workflows/ci.yml. TSD §1, §2.3.

**S01 Database foundation.** Migrations for schemas platform, tenant, ref; roles app_owner, app_ops, app_platform; functions fn_supersede, fn_audit; audit_log; tables.json registry; generators for test:isolation, test:finance-denial, test:append-only. TSD §2, §3.

**S02 Infra dev stack (plan first).** CDK stack FleetOS-dev: VPC (2 AZ, private subnets, VPC endpoints for S3/SQS/Secrets, one NAT), RDS Postgres 16 t4g.micro, S3 evidence bucket (versioned, SSE), two Cognito pools with pre-token Lambda (pool B with MFA required), ALB + Fargate service (1 task) for api, SQS queues ocr/media/alerts/notify/billing/export/import/nightly/offboarding, EventBridge rules, Secrets Manager entries, CloudWatch alarms. Output endpoints. TSD §1.1, §2.1.

**S03 API skeleton.** NestJS app: JWT verification for both pools, TenantContext middleware, per-role connection pools with SET LOCAL app.tenant_id, ProblemError filter, health endpoint, OpenAPI setup, role guards. Integration test proving app_ops cannot read a finance table. TSD §2.2, §6.

**S04 Web skeleton.** Next.js app with route groups (owner), (ops), (admin), Cognito auth for pools A and B, next-intl en/fr scaffold, shadcn/ui, layout with role-based nav, MoneyInput component, useOfflineQueue hook (IndexedDB + retry). TSD §8.

## Weeks 1–2 — core data and sessions

**S10 Tenants and entitlements.** platform.tenants, entitlements, tenant_settings (evidence policy, thresholds, FX defaults, cut-off, working units), admin endpoints to create/suspend/archive tenants and set entitlements, owner endpoints to read/update settings. TEN-01, TEN-02, TEN-04, TEN-06 (status only), TEN-07.

**S11 Users, invites, operators.** Owner invites ops users (Cognito admin-create + email/SMS), deactivate, operators CRUD. TEN-03, MCH-05.

**S12 Machines and meters.** machines with primary_meter_type and unit label, status flag, maintenance_tasks default template (250h general service, warning 20) created on insert; machine_financials as a finance table. MCH-01..06, MNT-01.

**S13 Clients, sites, deployments, rate cards, client credit.** One active deployment per machine; rate_cards effective-dated (finance); client_credit (finance); hold/release endpoints. CLI-01..04, CLI-06 (manual hold only).

**S14 Money model.** Shared money utilities (bigint minor units, fx), tenant FX default table, validation FX_RATE_REQUIRED, MoneyInput wiring, multi-line receipt event structure. TSD §4.

**S15 Photos and evidence.** presign/commit, media worker (server SHA-256, thumbnail, EXIF, gps accuracy, capture source), photos table, evidence policy enforcement helper (`EVIDENCE_REQUIRED`). TEN-07, TSD §3.2 photos, §7 media.

**S16 Work sessions.** work_sessions with tstzrange exclusion constraint per machine on is_current rows, validations (end ≥ start, ≤ 24h, continuity warning + override_reason, SESSION_OVERLAP), evidence fields, corrections endpoint, daily rollup view. WRK-01, WRK-02, WRK-04, WRK-07 (API side), WRK-08 (view only).

**S17 OCR.** ocr worker calling the OCR adapter (vision model) with strict JSON; patch session OCR value; mismatch flag > threshold. WRK-03.

**S18 Fuel and downtime.** fuel_logs (money fields, receipt per policy), downtime_segments. WRK-05, WRK-06.

**S19 Maintenance.** maintenance_tasks CRUD, maintenance_visits with ticked tasks, parts/consumables, next-due advancement, v_maintenance_status. MNT-01..05.

## Week 3 — cash, expenses, billing, ops screens

**S20 Expenses.** expense_categories seeded per tenant, expenses with cash account and allocation, duplicate detection (flag + alert stub), needs_verification, templates. EXP-01..05.

**S21 Cash.** cash_accounts (defaults), cash_transfers, cash_counts (blind for ops), v_cash_expected (finance). CSH-01..04.

**S22 Client money events.** receipts/advances/credit notes with multi-currency lines; ops may post with evidence, never read balances. BIL-04.

**S23 Billing engine v1 (plan first).** Strategies hourly/daily/monthly + standby + minimum top-up, extra_charges, billing_ledger insert-only, adjustments on recompute, advance_consumptions, billing job on session write and nightly, v_client_receivable, v_unused_advances. BIL-01..03, BIL-05. Golden tests per skill write-billing-strategy.

**S24 CSV import.** Validate and import MACHINES, DAILY_LOG (as sessions with source=import), PAYMENTS, EXPENSES; report errors per row. TEN-05.

**S25 Ops web screens.** Today, Work session (with photo + offline queue), Downtime, Fuel, Expense, Receipt/advance, Cash count (blind), Maintenance visit, My history. RPT-02, all WRK/EXP/CSH entry screens. Playwright for each.

## Weeks 4–5 — owner surface

**S30 KPI views.** v_tenant_kpis, v_evidence_coverage, v_logging_compliance, v_machine_daily_ops, v_machine_contribution with overhead allocation setting. RPT-01, BIL-06, INS-02, INS-03 (metric only).

**S31 Owner home.** KPI cards with range toggle, machine cards, collections, alerts, log-pending, site cash expected. RPT-01.

**S32 Machine detail.** Meter trend, utilisation, diesel per unit, maintenance tasks, downtime, consumables, contribution. RPT-03.

**S33 Clients and cash pages.** Receivable with ageing, unused advances, hold controls; cash accounts, transfers, counts vs expected, variance. BIL-05, CSH-04, CLI-06.

**S34 Billing report and Excel export.** By machine/site/client/month; export worker with signed link. RPT-04.

**S35 Projections.** Inputs page and computed projection. RPT-05.

**S36 Settings.** Users, machines, meters, maintenance tasks, categories, evidence policy, FX defaults, thresholds. TEN-07, ALT-03.

## Week 6 — alerts, audit, admin

**S40 Alert rules.** All ALT-02 types via skill add-alert-rule, including automatic hold (CLI-06), duplicate, concentration, cash variance, maintenance warning/overdue, log pending, diesel anomaly, payment due/overdue. ALT-02, INS-04.

**S41 Notify.** WhatsApp adapter (chosen provider), templates en/fr, in-app notifications list, per-user channel prefs, entry-edited notification. ALT-01, SEC-02.

**S42 Audit list.** Owner audit page with filters; void with reason. SEC-04, SEC-05.

**S43 Admin pages.** Tenants and entitlements, onboard wizard (create → invite → import), health (metadata only from nightly rollup), tickets, announcements, offboarding stub (export + archive). ADM-01..05, TEN-06.

## Week 7 — polish

**S50 French.** Complete fr.json, FX/number/date formatting per locale, French WhatsApp templates. 
**S51 Support form.** In-app report with screenshot → ticket → WhatsApp to Perceptiqx. ADM-04.
**S52 E2E and hardening.** Playwright suite across owner/ops/admin flows incl. offline queue; load test script (k6) for 200 concurrent uploads; fix findings.

## Week 8 — go-live

**S60 Pilot load and cutover.** Import pilot history, create users, verify KPIs against the parallel spreadsheet, enable alerts, announce cut-off time. Acceptance per BRD §8.

## Weekly standing task

**SW Security sweep.** Fresh session, read-only: find tenant isolation gaps, finance leakage to ops, untested error codes, money float usage, missing FORCE RLS. Output a list; do not change code.
