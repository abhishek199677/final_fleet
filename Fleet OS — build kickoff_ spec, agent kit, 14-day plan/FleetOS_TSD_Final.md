# Fleet OS — Technical Specification Document (TSD)

**Companion to:** FleetOS_BRD_Final.md
**Version:** 3.0 — Approved for development
**Date:** 3 September 2026
**Audience:** development team (one developer working with coding agents; see docs/agent-kit)

---

## 1. Architecture

One AWS account per environment, one region (ap-south-1 at launch; a second region only when a tenant's data-residency contract requires it). Managed services only. One shared Postgres database with tenant isolation by row-level security. Two explicit infrastructure profiles: **Pilot** (now) and **Commercial** (gate before tenant #3 or the first paid contract). Schema, API and code are identical across profiles; only capacity and redundancy change.

```
Owner web + ops entry + admin (Next.js, Amplify Hosting)         Mobile (Flutter, after web)
                     |                                                    |
                     +------------------- CloudFront + WAF ----------------+
                                              |
              Cognito pool A: tenant users          Cognito pool B: platform admins (MFA)
                                              |
                                   ALB → ECS Fargate: NestJS modular monolith
                                   (tenant API /v1, admin API /admin — separate DB roles)
                                              |
        +-----------------+-------------------+-------------------+
        |                 |                   |                   |
   RDS PostgreSQL 16    S3 evidence         SQS queues        EventBridge schedules
   RLS + finance        (original + thumb)  (ocr, notify,     (alerts 15 min, nightly)
   tables split                             import, export)
                                              |
                              Lambda workers → OCR adapter · WhatsApp adapter · FCM adapter
```

IaC: AWS CDK (TypeScript). CI/CD: GitHub Actions. Monitoring: CloudWatch + Sentry. Adapters for OCR, WhatsApp, push and (later) telematics are interfaces with one provider implementation each, so providers can be swapped.

### 1.1 Profiles and cost

| Item | Pilot | Commercial gate |
|---|---|---|
| Environments | dev, prod | dev, staging, prod (separate accounts) |
| API | 1 Fargate task 0.5 vCPU/1GB behind ALB | ≥ 2 tasks across AZs, autoscaling |
| Workers | Lambda for OCR, notify, export, import, nightly | + ECS worker service for heavy imports/reports if Lambda limits are hit |
| DB | RDS PostgreSQL 16 db.t4g.micro, single-AZ, 7-day backups, PITR | Multi-AZ, db.t4g.small+, 35-day backups, quarterly restore test |
| Storage | S3 versioned, SSE, lifecycle to IA at 90 days | + Object Lock on evidence bucket |
| Network | VPC, private subnets, one NAT gateway (or VPC endpoints for S3/SQS/Secrets to cut NAT cost) | + WAF managed rules |
| Auth | two Cognito pools | same + advanced security features |
| Observability | CloudWatch alarms, Sentry free tier | + dashboards, on-call routing |
| Security testing | CI isolation suite, dependency scanning | + external penetration test |
| **Monthly cost (USD)** | **~$110–150** (RDS ~18, Fargate ~15, ALB ~18, NAT ~35, IPv4 ~4, logs/backups/S3 ~10, WhatsApp base ~10, OCR/notify usage) | **~$500–900** |

Cognito is within the free tier at pilot scale; verify current pricing tiers before the commercial gate. Developer time for support is not included.

### 1.2 Commercial gate checklist
Multi-AZ RDS · ≥ 2 API tasks · staging environment · backup restore tested · WAF · alarms routed to a person · penetration test passed · entitlement limits enforced · audited support-access path built · admin MFA verified · runbooks for incident, restore and tenant offboarding.

## 2. Identity, authorisation, isolation

### 2.1 Identity
- **Cognito pool A** (`fleetos-tenants`): Owner and Operations users; custom attributes `tenant_id`, `role` ∈ {owner, ops} copied into JWT claims by a pre-token Lambda. Password login; refresh 30 days mobile / 8 hours web.
- **Cognito pool B** (`fleetos-platform`): Perceptiqx staff; MFA mandatory (TOTP); 1-hour sessions; claims `role` ∈ {platform_admin, support}. Only `/admin/*` accepts pool B tokens; `/v1/*` rejects them.

### 2.2 Database roles and request pipeline
Three Postgres roles, all non-superuser, no BYPASSRLS:
- `app_owner` — SELECT/INSERT on all tenant tables including finance tables.
- `app_ops` — SELECT/INSERT on operational tables; **no grant at all** on finance tables (`rate_cards`, `billing_ledger`, `extra_charges`, `client_money_events`, `machine_financials`, `cash_expected` views, contribution views).
- `app_platform` — SELECT on `platform.*` and on tenant metadata views only (counts, health); no access to tenant operational or financial rows.

Pipeline: JWT verified → `TenantContext` (tenant_id, role) → connection taken from the pool **for that role** → `SET LOCAL app.tenant_id` → RLS policies filter every tenant table on `tenant_id`. Role authorisation is therefore enforced by Postgres grants, not by application code; NestJS guards are a second layer.

### 2.3 Isolation checklist (CI-enforced)
- Every `tenant.*` table has `tenant_id uuid not null`, index, RLS enabled and forced.
- Generated test: two tenants, rows in every table, zero cross-tenant visibility for each role.
- Generated test: `app_ops` gets permission-denied on every finance table and view.
- Migration linter fails the build if a new tenant table lacks `tenant_id` + RLS or grants finance access to `app_ops`.
- S3 keys `tenants/<tenant_id>/…`; presigned URLs only after ownership check.

### 2.4 Append-only, edit window, audit
- App roles have no UPDATE/DELETE on transactional tables. Corrections insert a new row with `supersedes_id`, `version`; trigger maintains `is_current`.
- RLS insert policy for `app_ops` on correction rows: original `created_by = current user` and `created_at > now() − 24h`; else `EDIT_WINDOW_CLOSED`.
- `audit_log` trigger on every write; corrections enqueue an "entry edited" notification to Owner.
- Evidence rows never updated.

## 3. Data model

Schemas: `platform`, `tenant` (RLS), `ref`. `…v` = `created_by, client_uuid, version, supersedes_id, is_current, source`.

### 3.1 Platform
`tenants` (id, name, slug, country, base_currency, timezone, status enum(active, suspended, archived, pending_deletion), retention_months, legal_hold, created_at), `entitlements` (tenant_id, plan, machine_limit, user_limit, storage_gb, features jsonb, trial_start, trial_end, contract_start, contract_end, usage jsonb), `tenant_settings` (evidence policy per type, receipt threshold, policy_locked, cut-off time, working units/day, working days/month, overhead method, thresholds), `platform_users`, `platform_audit`, `support_tickets`, `announcements`, `offboarding_jobs` (export, archive, delete, certificate).

### 3.2 Tenant — operational (app_ops readable)
- `users`, `operators`
- `machines` (id, code, type, make, model, year, chassis_no, primary_meter_type enum(hours, km, cycles, metres, tonnes, trips), meter_unit_label, current_meter, status_flag, flag_note, photo_key, attributes jsonb)
- `clients` (id, name, contact, phone, whatsapp, address, currency, payment_terms_days) — credit_limit and required_advance live in finance
- `sites`, `deployments` (id, machine_id, site_id, start_date, end_date, status enum(active, on_hold_payment, ended))
- `work_sessions` (id, machine_id, deployment_id, operator_id, helper_id, start_at, end_at, start_meter, end_meter, units_run, start_photo_key null, end_photo_key null, start_evidence enum(photo, manual), end_evidence, start_ocr_value, end_ocr_value, ocr_mismatch, activity, billable bool, override_reason, notes, …v) — exclusion constraint: no overlapping [start_at, end_at) per machine among current rows
- `fuel_logs`, `downtime_segments` (id, machine_id, work_session_id null, started_at, ended_at, reason_code, note, photo_key, …v)
- `maintenance_tasks` (id, machine_id, name, trigger enum(meter, calendar), interval_value, warning_value, last_done_value, last_done_date, next_due_value, next_due_date)
- `maintenance_visits` (id, machine_id, visit_date, visit_type, mechanic, meter_at_visit, checklist jsonb, labour_cost_txn, labour_currency, labour_fx, labour_base, notes, …v), `maintenance_visit_tasks` (visit_id, task_id), `maintenance_parts` (visit_id, item, qty, unit_cost_txn, currency, fx, base, is_consumable, meter_at_change)
- `expense_categories`, `expenses` (id, date, category_id, description, currency, amount_minor, fx_rate, base_minor, cash_account_id, paid_by, allocation_type, site_id, machine_id, receipt_photo_key, needs_verification, duplicate_of_id, note, …v), `expense_templates`
- `cash_accounts`, `cash_transfers` (…currency, amount_minor, fx_rate, base_minor…), `cash_counts` (id, cash_account_id, count_date, counted jsonb {currency: minor}, photo_key, note, …v)
- `photos` (id, s3_key_original, s3_key_thumb, sha256_server, sha256_device, size_bytes, taken_at_device, received_at, lat, lng, gps_accuracy_m, capture_source enum(camera, gallery, web), uploaded_by, ocr_result jsonb)
- `alerts`, `notifications`, `insight_notes`, `audit_log`

### 3.3 Tenant — finance (app_owner only)
- `machine_financials` (machine_id, purchase_date, purchase_cost_minor, currency, fx, base_minor)
- `client_credit` (client_id, credit_limit_minor, required_advance_minor)
- `rate_cards` (id, deployment_id, effective_from, strategy enum(hourly, daily, monthly), rate_minor, currency, min_units_per_day, standby_rate_minor)
- `extra_charges` (id, deployment_id, kind enum(mobilisation, demobilisation, transport, other), date, currency, amount_minor, fx, base_minor, note, …v)
- `billing_ledger` (id, deployment_id, work_session_id null, rate_card_id, entry_date, kind enum(work, minimum_topup, standby, monthly_hire, extra_charge, adjustment), units, currency, amount_minor, fx, base_minor, adjusts_id null) — insert-only
- `client_money_events` (id, client_id, site_id, event_type enum(receipt, advance, credit_note, rebate), currency, amount_minor, fx_rate, base_minor, mode, reference, slip_photo_key, event_date, …v), `advance_consumptions` (advance_id, billing_ledger_id, base_minor, date)
- Views: `v_client_receivable` (billed + extras − credits − receipts − advances consumed; ageing), `v_unused_advances`, `v_machine_contribution`, `v_cash_expected` (per account: in, out, expenses, expected, last count, variance), `v_tenant_kpis`, `v_projection_inputs`

### 3.4 Shared views (both roles)
`v_machine_daily_ops` (units, litres, litres_per_unit, downtime), `v_maintenance_status` (per task: units/days to due, state), `v_logging_compliance`, `v_evidence_coverage`.

## 4. Money and currency

- Tenant `base_currency` is any ISO code. Every money row stores `currency`, `amount_minor` (integer), `fx_rate` (to base, numeric(18,8)), `base_minor` (computed), `fx_source` (tenant_default | manual | import) and `fx_date`.
- Tenant keeps a default FX table (currency → rate, updated by Owner); entry forms pre-fill it, editable per row.
- Reports aggregate `base_minor`; drill-down shows original currency and rate.
- The default entry form for a receipt allows several currency lines in one event (e.g. USD + local), stored as one event with child amounts; base = sum of lines.

## 5. Billing engine

`BillingStrategy` interface with `computeForDay(deployment, sessions, rateCard) → ledger entries`:
- **Hourly:** units × rate; if units < min_units_per_day, add a `minimum_topup` entry for the shortfall.
- **Daily fixed:** one `work` entry per day with ≥ 1 billable session (or per calendar day if the rate card says "calendar").
- **Monthly hire:** one `monthly_hire` entry per month, prorated by days deployed.
- **Standby:** on days with no billable session but deployment active and standby rate set, one `standby` entry.
- Extra charges are copied into the ledger as `extra_charge` on their date.
- Recalculation never mutates; if inputs change (corrected session, new rate version), the engine writes `adjustment` entries netting the difference and referencing the original.
- Runs on session insert/correction (for that day) and nightly for the trailing 35 days.

## 6. API

REST `/v1` (tenant) and `/admin` (platform), OpenAPI generated; typed clients for web and Flutter. Cursor pagination; `updated_since`; `client_uuid` idempotency on writes; RFC 7807 errors with codes: `SESSION_OVERLAP`, `EDIT_WINDOW_CLOSED`, `EVIDENCE_REQUIRED`, `OCR_MISMATCH_REVIEW`, `EXPENSE_DUPLICATE_SUSPECT`, `FX_RATE_REQUIRED`, `ENTITLEMENT_LIMIT` (warning header at pilot).

| Group | Endpoints (abridged) | Roles |
|---|---|---|
| Me | `GET /me`, notification prefs, device token | all |
| Machines, meters, operators, maintenance tasks | CRUD | owner write; ops read |
| Clients, sites, deployments | CRUD, `POST /deployments/:id/hold|release` | owner; ops read |
| Rate cards, extra charges, client credit | CRUD | owner |
| Work sessions, fuel, downtime, maintenance visits, expenses, cash transfers, cash counts | `GET/POST`, `POST …/:id/corrections` | ops, owner |
| Client money events | `POST` (ops may post receipts/advances with evidence), `GET` | ops (own entries, no balances), owner |
| Photos | presign, commit (server hashes and thumbnails) | ops, owner |
| Billing, receivables, cash expected, contribution, KPIs, projections, exports | `GET /reports/*`, `POST /reports/export` | owner |
| Alerts | list, resolve | all (ops: non-financial types) |
| Support | `POST /support/tickets` | all |
| Import | `POST /import/csv` | owner, admin |
| Admin | tenants, entitlements, health (metadata), tickets, announcements, offboarding | platform |

Validations: evidence policy per type (`EVIDENCE_REQUIRED` when `required` and no photo); session overlap (DB exclusion constraint + API check); end ≥ start; ≤ 24h; continuity warning with `override_reason`; OCR mismatch flag; `fx_rate` required when currency ≠ base; receipt threshold; duplicate expense (same month, category, base ±1%, description similarity ≥ 0.7); hold rules per BRD CLI-06; no overlapping deployments; entitlement counters checked on machine/user create.

## 7. Async processing

| Queue | Trigger | Worker | Work |
|---|---|---|---|
| `ocr` | photo commit with a meter photo | Lambda → OCR adapter (vision model) | `{reading, unit, confidence, meter_type, readable}` → `photos.ocr_result` → patch session OCR value |
| `media` | photo commit | Lambda | server SHA-256, thumbnail, EXIF extraction |
| `alerts` | EventBridge 15 min | Lambda | maintenance, log pending, stopped > N h, payment due/overdue/hold, diesel anomaly, duplicate, concentration, cash variance |
| `notify` | alerts, corrections, tickets | Lambda → WhatsApp adapter / FCM adapter | retries, delivery log |
| `billing` | session write, nightly | Lambda | run billing engine for affected days |
| `export` / `import` | reports, import | Lambda (ECS worker at commercial gate if needed) | XLSX build; CSV validate + insert |
| `nightly` | 01:00 tenant-local | Lambda | refresh views, compliance snapshot, entitlement usage, admin health rollup |
| `offboarding` | admin action | Lambda | export bundle, archive, scheduled deletion, certificate |

## 8. Web (Next.js) — launch surface

One Next.js app on Amplify Hosting: `/owner/*`, `/ops/*` (responsive entry screens; camera via file input on phones; local queue in IndexedDB with retry while the tab is open), `/admin/*` (pool B auth). Tailwind + shadcn/ui, Recharts, `next-intl` (en, fr). Route guards by role; owner-only components fetch only owner endpoints; ops routes never import finance clients.

## 9. Mobile (Flutter) — after web launch, independent codebase

Riverpod, Drift, generated API client. Upload queue: every write stored locally with `client_uuid` and photo paths; background worker pushes photos (presign → PUT → commit) then records; rejections surface in History. Reference data cached at login. Camera with meter framing guide; original kept ≤ 3MB; device SHA-256; GPS with accuracy; capture source recorded. Android internal track first, iOS after. Push via FCM.

## 10. Screens

Owner: Home (KPIs incl. evidence coverage, machine cards, collections, alerts, log-pending, site cash expected), Machine detail, Billing and contribution, Clients and sites (receivable, advances, ageing, hold), Cash (accounts, transfers, counts vs expected, variance), Projections, Audit, Settings (users, machines, meters, maintenance tasks, categories, evidence policy, FX defaults, thresholds).
Operations: Today, Work session, Downtime, Fuel, Expense, Receipt/advance (evidence only), Cash count (blind), Maintenance visit, My history, Report a problem.
Admin: Tenants and entitlements, Onboard, Health (metadata), Tickets, Announcements, Offboarding.

## 11. Testing

Unit: billing strategies (hourly/min/daily/monthly/standby/adjustments), FX math, maintenance due math, hold rules, duplicate logic. Integration (Postgres container): RLS isolation per role, finance-table denial for `app_ops`, append-only, edit window, session overlap constraint, idempotency. Contract: OpenAPI vs clients. E2E: Playwright for web incl. offline queue; Maestro for Flutter later. Load: 200 concurrent uploads (k6). Security: Dependabot, Semgrep; pen test at commercial gate.

## 12. Delivery plan — web launch 8–10 weeks, mobile +4–5 weeks; one developer with coding agents

| Week | Deliverables |
|---|---|
| 0 | Agent-ready repo (CLAUDE.md, skills, CI guardrails incl. isolation and finance-denial tests), CDK dev/prod, RDS, two Cognito pools, schema with split finance tables, i18n scaffold |
| 1–2 | API: tenants/entitlements, machines + meters, operators, clients, sites, deployments, rate cards, work sessions (overlap constraint, evidence policy), fuel, downtime, maintenance tasks/visits, photos + media + OCR, money model + FX |
| 3 | Expenses, cash accounts/transfers/counts, client money events, CSV import; billing engine v1 with adjustments; ops web entry screens → pilot starts logging |
| 4–5 | Owner home, machine detail, receivables + advances, cash expected/variance, contribution, projections, Excel export |
| 6 | Alerts engine, WhatsApp adapter, audit list, edit-window policy, admin pages (tenants, entitlements, health, tickets, announcements, offboarding stub), settings |
| 7 | French, support form, hardening of validations, Playwright E2E |
| 8 | Pilot data load, field test, fixes, go-live |
| 9–10 | Buffer for field feedback |
| 11–15 | Flutter app (Android then iOS), upload queue, camera, push |

Weekly demo to the pilot from week 3. Commercial gate work is scheduled when the second tenant is signed.

## 13. Later-phase hooks
`telemetry_events` + ingestion adapter (telemetry as a session `source`); `insights` table for scheduled AI jobs; `approval_requests` + OTP (Cognito custom auth); invoices as documents; accounting export adapter (Tally/Zoho/QuickBooks); subscription billing webhook; schema-per-tenant path for enterprise.
