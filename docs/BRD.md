# Fleet OS — Business Requirements Document (BRD)

**Product:** Fleet OS, multi-tenant SaaS for heavy-equipment operators
**Vendor:** Perceptiqx
**Version:** 3.0 — Approved for development
**Date:** 3 September 2026
**Pilot:** one existing equipment-rental operation in Africa ("the pilot tenant"); target 5–10 tenants within 12 months

---

## 1. Purpose

Fleet OS lets owners of heavy-equipment businesses (excavators, drilling rigs, loaders, compactors, cranes, tippers and similar) see daily billing, cash, machine utilisation, maintenance status and client collections without doing data entry themselves. Site and office staff log daily data; owners consume dashboards on web or mobile. Perceptiqx hosts, operates, onboards and supports every tenant.

## 2. Business goals

| Goal | Measure |
|---|---|
| Owner knows daily work, billing and cash per machine by end of day | ≥ 90% of active machines have a work session filed same day |
| Stop leakage (unbilled work, unrecorded diesel, quiet edits, duplicate expenses) | 100% of entries append-only; evidence coverage visible; duplicate and concentration alerts live |
| Never miss a maintenance task | Alert fires at the task's warning interval before due |
| Collections visibility | Overdue receivables on the owner home within 24h of due date |
| Sellable to any equipment operator | New tenant onboarded in under one working day with no code changes |

## 3. Scope

### Launch (pilot tenant, web)
- Multi-tenant SaaS with hard tenant isolation on Perceptiqx's AWS account
- Tenant roles: Owner and Operations. Perceptiqx role: Platform admin (separate authentication)
- Owner web app, responsive Operations entry screens, admin pages
- Modules: Home/KPIs, Machines and meters, Work sessions, Maintenance, Billing and receivables, Cash, Expenses, Issues and insights, Clients and sites, Projections, Alerts, Audit, Reports, Support
- Optional photo evidence with OCR assist, policy per tenant
- Local save and automatic retry for entries made without connectivity
- WhatsApp and in-app notifications
- Generic multicurrency (tenant base currency, transaction currency, FX per transaction)
- English and French
- CSV import of history

### Mobile (after web launch)
- Independent Flutter app (Android, then iOS) on the same API: Operations workflow with upload queue and camera, Owner views, push notifications

### Commercial hardening (before tenant #3 or first paid contract)
- Owner approval workflow and OTP; period closing
- Infrastructure hardening (see TSD gate), penetration test
- Subscription limits enforced; automated billing
- Owner-approved, time-limited, audited support access to tenant data
- PDF export, daily digest

### Later
- GPS/telematics, cameras, OEM integrations; client portal; accounting export (Tally/Zoho/QuickBooks); purchasing and tax modules; payroll; AI insights and benchmarks

## 4. Users and roles

| Role | Can | Cannot |
|---|---|---|
| Owner | Everything: billing, receivables, cash expected balance and variance, margins, projections, rate cards; manage users, machines, clients, rates, maintenance plans, evidence policy, alert thresholds; export; enter data | — |
| Operations | Enter work sessions, diesel, expenses, client receipts and advances (with evidence), cash counts, maintenance visits, downtime; view machine status, meters, maintenance due, own entries | See rates, billing, revenue, receivables, expected cash balance, variance, margins, projections; delete; edit entries after the edit window or created by others |
| Platform admin (Perceptiqx) | Create/suspend tenants, invite owners, set entitlements, view tenant metadata and health, handle tickets, broadcast announcements | See any tenant's operational or financial records (until the audited support-access path exists) |

Every tenant user belongs to exactly one tenant. User limits are set per tenant entitlement (generous at launch).

## 5. Functional requirements

Launch unless marked **Hardening** or **Later**.

### 5.1 Tenancy, entitlements, onboarding (TEN)
- TEN-01 Admin creates a tenant: name, country, base currency, default transaction currencies, timezone, plan.
- TEN-02 Entitlements on the tenant: plan name, machine limit, user limit, storage limit, enabled features, trial dates, contract dates, usage counters. Enforced as warnings at launch; hard limits at Hardening.
- TEN-03 Admin invites the first Owner; Owner sets password. Owner invites Operations users. Users are deactivated, never deleted.
- TEN-04 All data is scoped to the tenant; no cross-tenant access under any circumstances.
- TEN-05 CSV import (MACHINES, DAILY_LOG, PAYMENTS, EXPENSES tabs); imported rows tagged `source = import`, no evidence.
- TEN-06 Tenant lifecycle: active, suspended (read-only), archived. Offboarding: data export to the Owner, archive, contractual retention period (default 12 months), permanent deletion after it with deletion certificate; legal hold overrides deletion.
- TEN-07 Evidence policy per tenant, per evidence type (meter readings, diesel receipts, expense receipts, receipt slips): `required` / `optional` (default) / `off`, plus amount threshold above which receipts become required. Admin may lock the policy contractually.

### 5.2 Machines and meters (MCH)
- MCH-01 Machine: code, type, make, model, year, serial/chassis, photo, attributes (jsonb), status flags.
- MCH-02 Primary meter: type (engine hours, odometer km, cycles, drill metres, tonnes, trips) and unit label; current reading. Secondary meters **Later**.
- MCH-03 Purchase date and cost live in owner-only machine financials.
- MCH-04 Status (derived, no live claims): Work reported today, Log pending, Reported stopped, Under service, In transit, Retired. Owner can pin a manual flag with a note.
- MCH-05 Crew: operator and optional helper from the tenant operator list.
- MCH-06 Machines move between sites through deployments; history retained.

### 5.3 Clients, sites, deployments (CLI)
- CLI-01 Client: name, contact, phone, WhatsApp, address, transaction currency, payment terms (days), credit limit (optional), required advance (optional).
- CLI-02 Site under a client: name, location, optional GPS, dates.
- CLI-03 Deployment: one machine on one site for a period; one active deployment per machine.
- CLI-04 Rate card, effective-dated, per deployment: strategy (hourly, daily fixed, monthly hire), rate, currency, minimum billable units per day, standby rate (optional). Rate changes create a new dated version. Owner-only.
- CLI-05 Payment due-date alerts to Owner: before due, on due, overdue.
- CLI-06 Payment hold on a deployment: manual by Owner, or automatic when any invoice is overdue beyond N days, or outstanding exceeds the credit limit, or advance balance falls below the required advance. Operations sees a "Do not run — payment on hold" banner; sessions can still be logged and are flagged.

### 5.4 Work sessions (WRK)
- WRK-01 A work session: machine, deployment (pre-filled), operator, helper, start time and meter, end time and meter, activity (optional), billable flag, notes. Several sessions per machine per day are allowed; sessions may cross midnight; the daily view is a rollup.
- WRK-02 Meter photos optional per policy. Each reading carries `evidence = photo | manual`. Manual readings show "unverified" to Owner; owner home shows evidence coverage.
- WRK-03 When a photo exists, OCR pre-fills the reading; user confirms or corrects; difference beyond a threshold flags for Owner.
- WRK-04 Validation: end ≥ start; session ≤ 24h; start ≥ previous session's end on the same machine (warn, allow with reason); overlapping sessions rejected.
- WRK-05 Diesel filled: litres, cost (currency + FX), receipt per policy. Oil top-up: litres.
- WRK-06 Downtime segment: reason (no diesel, breakdown, transport/relocation, police/permit, no work from client, weather, operator absent, other), from–to, note, photo.
- WRK-07 Entries saved locally when offline and uploaded automatically; idempotent by client id.
- WRK-08 Owner home flags active machines with no session by the tenant cut-off.

### 5.5 Maintenance (MNT)
- MNT-01 Maintenance tasks per machine: name, trigger (primary meter interval or calendar interval), warning interval, last completed value/date, next due. Default template on machine creation: General service every 250 hours, warning 20 hours. Owner adds tasks (engine oil 500h, filters 1,000h, hydraulic oil 2,000h, insurance 12 months, etc.).
- MNT-02 Alerts at warning interval and when overdue, to Owner and Operations.
- MNT-03 Maintenance visit: machine, date, mechanic, type (scheduled, breakdown repair, inspection), tasks completed (ticked from the machine's task list), checklist, parts and consumables (item, qty, cost, meter at change), labour cost, photos, meter reading at visit.
- MNT-04 Completing a visit advances `next due` for each ticked task; it never resets the machine meter.
- MNT-05 Consumable cost per 100 meter-units per machine and per site.
- MNT-06 **Hardening:** work orders with assignment and status.

### 5.6 Billing and receivables (BIL)
- BIL-01 Billing engine computes billable amounts per session/day using the deployment's rate strategy: hourly (units × rate, minimum applied per day), daily fixed, monthly hire (prorated by calendar days deployed). Standby rate applies to reported-stopped days if configured.
- BIL-02 Manual extra-charge lines on a deployment: mobilisation, demobilisation, transport, other; amount, currency, date.
- BIL-03 Billing ledger is immutable; corrections produce adjustment entries referencing the original.
- BIL-04 Client money: receipt (payment against billing), advance (held, consumed against billing), credit note/rebate. Fields: client, site, transaction currency, amount, FX rate to base, base amount, mode, reference, slip per policy, date.
- BIL-05 Outstanding receivable = billed + extra charges − credit notes − receipts applied − advances consumed. Unused advance = advances received − advances consumed. Ageing buckets current / 1–30 / 31–60 / 60+. Owner-only.
- BIL-06 Machine contribution: billed − direct costs (diesel, oil, parts, labour, consumables, allocated wages, allocated overhead). Overhead allocation per meter-unit (configurable). Owner-only.
- BIL-07 **Hardening:** invoices as documents; period closing with Owner approval and OTP.

### 5.7 Cash (CSH)
- CSH-01 Cash accounts per tenant: "Owner remittance" and "Site cash" by default; more allowed (bank, additional sites).
- CSH-02 Transfers between accounts (remittances) with currency, amount, FX, reference, photo.
- CSH-03 Every expense and cash receipt is tied to a cash account.
- CSH-04 Operations logs a physical cash count (amount per currency, photo) **without seeing the expected balance**. Owner sees expected balance, count, variance, and resolves exceptions.

### 5.8 Expenses (EXP)
- EXP-01 Expense: date, category, description, transaction currency, amount, FX, base amount, paid from (cash account), paid by, allocation (site, machine, overhead), receipt per policy, note.
- EXP-02 Default categories, editable: Salary, House rent, Camp/generator fuel (separate from machine diesel), Transport, Spare parts, Regulatory/environmental tax, Visa and permits, Food, Airtime, Security, Bonus/rebate to client, Asset purchase, Other.
- EXP-03 Duplicate warning: same month, category, amount (±1%), similar description → flag + Owner alert; write succeeds.
- EXP-04 Owner "needs verification" flag and to-verify list.
- EXP-05 Recurring expense templates posted with one tap.
- EXP-06 **Later:** purchase orders, supplier invoices, tax codes, accounting export.

### 5.9 Insights (INS)
- INS-01 Downtime by reason, machine, site, month.
- INS-02 Utilisation per machine = meter units ÷ (working units/day × working days), configurable.
- INS-03 Diesel per meter-unit per machine; alert on > 20% deviation from 30-day average.
- INS-04 Expense concentration: category above configurable share (default 35%) → Owner alert.
- INS-05 Consumables per 100 units by site.
- INS-06 Owner notes on insights.

### 5.10 Home, projections, reports (RPT)
- RPT-01 Owner home: Total billed, Receipts, Outstanding receivable, Unused advances, Total expenses, Net cash position, Expense ratio, Total meter units, Utilisation, Evidence coverage — Today / Month / Year / All; machine cards; overdue collections; alerts; log-pending machines; site cash expected balance.
- RPT-02 Operations home: today's machines and session status, maintenance due, my entries. No financial fields.
- RPT-03 Machine detail: meter trend, utilisation, diesel per unit, maintenance tasks and due, downtime, consumables, contribution (owner-only).
- RPT-04 Billing and contribution report by machine, site, client, month; Excel export.
- RPT-05 Projections: working days, units/day, rate → projected billing and contribution.
- RPT-06 **Hardening:** PDF export.

### 5.11 Alerts (ALT)
- ALT-01 Channels: in-app, WhatsApp at launch; push with the mobile app. Per-user channel choice.
- ALT-02 Types: maintenance warning/overdue, reported stopped > N hours, no session by cut-off, payment due/overdue/hold, OCR mismatch, diesel anomaly, duplicate expense, concentration, cash variance, entry edited.
- ALT-03 Owner-configurable thresholds.
- ALT-04 **Hardening:** daily digest.

### 5.12 Security and audit (SEC)
- SEC-01 Append-only records; edits create versions referencing the original.
- SEC-02 Operations edits own entries within 24 hours; every edit logged and Owner notified. Older or others' entries are read-only for Operations; Owner can correct.
- SEC-03 Photos immutable; a photo may be added later to a manual entry (logged).
- SEC-04 Owner audit list filterable by user, machine, date, type.
- SEC-05 No deletes; Owner voids with reason.
- SEC-06 Operations has no access to financial fields at the database level.
- SEC-07 Tenant users: password login; sessions 30 days mobile, 8 hours web. Platform admins: separate identity provider, MFA mandatory, 1-hour sessions.
- SEC-08 **Hardening:** approval queue, WhatsApp OTP on sensitive changes, site-restricted Operations users, audited support access.

### 5.13 Admin and support (ADM)
- ADM-01 Tenant list with plan, limits, usage, last activity, logging compliance, status.
- ADM-02 Create/edit/suspend/archive tenant; invites; entitlements; CSV import trigger.
- ADM-03 Tenant health: upload failures, OCR failures, notification failures, storage, app errors — metadata only.
- ADM-04 In-app "Report a problem" with screenshot → ticket → WhatsApp to Perceptiqx; status on admin page.
- ADM-05 Announcements to tenants.
- ADM-06 **Hardening:** support access to tenant records only with Owner approval, read-only, time-limited, reason + ticket mandatory, fully audited, financial data masked unless separately authorised.

## 6. Non-functional requirements

| Area | Pilot | Commercial (gate before tenant #3 / first paid contract) |
|---|---|---|
| Availability | best effort, maintenance windows announced | 99.5% monthly |
| Connectivity | field entry works offline; upload within 2 min of reconnect | same |
| Performance | owner home < 2s on 3G; API p95 < 500ms | same |
| Data | single region; daily backups 7 days | Multi-AZ; 35-day backups; restore tested quarterly |
| Security | encryption at rest/in transit; RLS isolation tests in CI; separate admin auth | + penetration test |
| Devices | web on current browsers; responsive ops screens on Android Chrome | + Android 9+, iOS 15+ apps |
| Localisation | English, French; any ISO base currency; per-row FX | same |
| Scale | 1–2 tenants | 50 tenants, 2,000 machines, 200k sessions/year; design allows 500 tenants |

## 7. Business rules
1. Sessions are the unit of work; daily figures are rollups. Overlapping sessions on one machine are invalid.
2. Billable units per day = max(actual, minimum) where a minimum is set; strategy per rate card.
3. Billing is recognised on the session date; receipts on receipt date; advances consumed in date order against billing.
4. Machine diesel allocates to the machine; camp/generator fuel is overhead.
5. Maintenance completion advances the ticked tasks' next-due values only.
6. Base amount = transaction amount × FX rate on the row; FX defaults from the tenant's latest rate, editable per row.
7. Contribution = billed − direct costs − allocated overhead.
8. Payment hold triggers per CLI-06 and is released by Owner only.
9. Operations never sees expected cash, variance, or any billing figure.

## 8. Phasing and acceptance

| Phase | Content | Duration |
|---|---|---|
| Web launch | Everything unmarked; pilot live on web | 8–10 weeks |
| Mobile | Flutter Android, then iOS; push | +4–5 weeks |
| Hardening | Hardening items; commercial infrastructure gate; pen test | before tenant #3 / first paid contract |
| Later | Later items; telematics; AI | after 10 tenants |

**Launch acceptance**
- 30 consecutive days of sessions for every active pilot machine, ≥ 90% same-day compliance.
- Monthly billing, receipts and cash match the pilot's parallel spreadsheet within 2%.
- One month-end physical cash count reconciled against expected balance within tolerance.
- Zero cross-tenant exposure in the isolation suite; zero unaudited edits.
- Maintenance alert fires for at least one task crossing its warning interval.
- Evidence coverage reported correctly.

## 9. AI roadmap (after launch, same data)
Meter OCR (launch) → weekly owner brief on WhatsApp → anomaly explanations → predictive maintenance flags → collections assistant → ask-your-fleet chat → anonymised benchmarks.

## 10. Open decisions

| # | Decision | Needed by |
|---|---|---|
| 1 | Overhead allocation default | Sprint 1 |
| 2 | Operator wages per session vs monthly salary | Sprint 1 |
| 3 | WhatsApp provider | Sprint 0 |
| 4 | Tenant retention period default (12 months proposed) | before first contract |
