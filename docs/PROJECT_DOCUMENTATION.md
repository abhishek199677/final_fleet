# Fleet OS — Project Documentation

## 1. Executive Summary

Fleet OS is a **multi-tenant SaaS platform** for heavy-equipment fleet operators (excavators, drilling rigs, loaders, cranes, tippers, etc.). It manages the entire lifecycle of equipment rental — from work logging and billing to cash tracking and maintenance.

**Vendor:** Perceptiqx  
**Version:** 3.0  
**Status:** Pilot deployment (Africa, 1-2 tenants)  
**Target:** Scale to 5-10 tenants within 12 months  
**Live Demo:** https://fleetos-web-hh42.onrender.com

---

## 2. Core Problem Solved

| Problem | Solution |
|---------|----------|
| Unbilled work, unrecorded diesel | Append-only records with audit trails |
| No daily visibility into billing/cash | Real-time dashboards per machine |
| Missed maintenance tasks | Automated alerts before due dates |
| Overdue payments untracked | Receivables flagged within 24 hours |
| Slow tenant onboarding | Zero-code onboarding in under 1 day |

---

## 3. Key Features

### Operations (Site Staff)
- **Work Sessions** — Daily work logging with meter readings, photo evidence, overlap prevention
- **Fuel & Downtime** — Diesel logs (litres, cost, receipt), downtime tracking by reason
- **Expenses** — Categorised with duplicate detection, receipt policy enforcement
- **Cash Management** — Multiple accounts, transfers, blind physical counts
- **Maintenance** — Meter/calendar-based scheduling, parts tracking, auto next-due

### Finance (Owner Only)
- **Billing Engine** — Hourly, daily, monthly, standby rate strategies with insert-only ledger
- **Client Money Events** — Receipts, advances, credit notes, multi-currency support
- **Receivables & Advances** — Outstanding calculations, ageing buckets
- **Machine Contribution** — Billed minus direct costs minus allocated overhead

### Reporting & Insights
- **Owner Dashboard** — KPIs (billed, receivables, expenses, utilisation, evidence coverage)
- **Projections** — Working days × units/day × rate = projected billing
- **Insights** — Downtime analysis, utilisation metrics, diesel per unit, expense concentration

### Automated Alerts (11 Types, 9 Check Methods)
| Alert | Severity | Trigger |
|-------|----------|---------|
| maintenance_overdue | Critical | Machine past service interval |
| payment_overdue | Critical | Client billing past payment terms |
| maintenance_warning | Warning | Machine approaching service interval |
| payment_due | Warning | Client billing approaching due date |
| diesel_anomaly | Warning | >500L consumption in 7 days |
| cash_variance | Warning | Expected vs counted mismatch >₹10,000 |
| duplicate_expense | Warning | Same category/month/amount ±1% |
| concentration | Warning | Single category >35% of total |
| stopped_long | Warning | Machine idle >8 hours |
| log_pending | Warning | No work session logged today |
| entry_edited | Info | Entry corrected in last hour |
| ocr_mismatch | — | Defined, check pending |
| auto_hold | — | Defined, check pending |

### Platform Administration
- Tenant onboarding with entitlements
- Health monitoring and support tickets
- Audit trail with full change history
- CSV import/export for bulk operations

---

## 4. Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces, TypeScript strict |
| API | NestJS (25 modules, 27 controllers), Postgres (raw SQL, no ORM) |
| Database | PostgreSQL 16 with Row-Level Security (RLS) |
| Web | Next.js 15 (App Router), Tailwind, shadcn/ui, Recharts |
| Auth | JWT-based with dual roles (owner/ops) |
| Infrastructure | AWS CDK (RDS, S3, Cognito, SQS, Lambda) |
| Hosting | Render (API + Web + PostgreSQL) |
| Testing | Vitest (unit), Playwright (e2e), Postgres testcontainer |
| CI/CD | GitHub Actions (lint, typecheck, RLS isolation, finance denial, append-only, e2e) |
| Locales | 24 languages (English, French, + 22 South Asian languages) |

---

## 5. Architecture

### Multi-Tenancy
- Every table has `tenant_id` with Row-Level Security (RLS)
- Three database roles: `app_owner` (full), `app_ops` (operational only), `app_platform` (metadata)
- Finance tables are strictly isolated — ops screens cannot access them

### Data Integrity
- **Append-only** — No UPDATE/DELETE on transactional tables; corrections create new rows with `supersedes_id`
- **Idempotent writes** — Every write endpoint accepts `client_uuid` for deduplication
- **Money stored as bigint** — Never floats; currency + amount_minor + fx_rate + base_minor

### API Design
- REST API with OpenAPI/Swagger auto-documentation
- RFC 7807 error format with 12 standardised error codes
- 25 feature modules covering all business operations

### Database
- **42 tables** across 3 schemas (platform, tenant, ref)
- **10 views** for KPIs, maintenance status, evidence coverage, receivables, cash expected
- **22 migrations** with RLS, grants, indexes, constraints

---

## 6. Deployment

### Live URLs
| Service | URL |
|---------|-----|
| Web App | https://fleetos-web-hh42.onrender.com |
| API | https://fleetos-api-rdwp.onrender.com |
| API Docs (Swagger) | https://fleetos-api-rdwp.onrender.com/docs |

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Owner | demo@fleetos.com | demo1234 |
| Ops | ops@fleetos.com | demo1234 |

### Environment
- **Database:** Render PostgreSQL 18 (free tier)
- **API:** Render Docker (Node.js 22, port 3001)
- **Web:** Render Docker (Next.js standalone, port 3000)
- Auto-deploys on every push to `main` branch

---

## 7. Project Structure

```
fleetos/
├── packages/
│   ├── api/              # NestJS REST API (25 modules, 27 controllers)
│   │   └── src/modules/  # alerts, audit, auth, billing, cash, client-money,
│   │                     # clients, deployments, expenses, export, fuel-downtime,
│   │                     # health, import, insights, machines, maintenance, notify,
│   │                     # operators, photos, reports, sites, support, tenants,
│   │                     # users, work-sessions
│   ├── web/              # Next.js frontend (44 pages)
│   │   ├── app/(owner)/  # 23 owner pages (home, machines, clients, billing, etc.)
│   │   ├── app/(ops)/    # 14 operations pages (today, work-session, fuel, etc.)
│   │   ├── app/(admin)/  # 4 admin pages (tenants, health, tickets, announcements)
│   │   └── e2e/          # 3 Playwright e2e test files
│   ├── db/               # SQL migrations (22), seeds, generators, linters
│   ├── shared/           # OpenAPI types, 12 error codes, finance utils
│   └── infra/            # AWS CDK infrastructure
├── docs/
│   ├── BRD.md            # Business Requirements (80 requirement IDs across 13 groups)
│   ├── TSD.md            # Technical Specification
│   └── BACKLOG.md        # Development roadmap
├── .github/workflows/    # CI/CD (lint, typecheck, RLS isolation, finance denial, e2e)
└── .claude/skills/       # Agent development recipes
```

---

## 8. Security

- **RLS on every table** — Database-level tenant isolation
- **FORCE ROW LEVEL SECURITY** — Even table owners cannot bypass RLS
- **Append-only audit trail** — Every write is logged
- **Finance/ops separation** — Enforced at database and code level
- **JWT authentication** — With role-based access control
- **No secrets in code** — All credentials via environment variables
- **12 standardised error codes** — RFC 7807 format

---

## 9. Testing

| Type | Framework | Files | Coverage |
|------|-----------|-------|----------|
| Unit | Vitest | 5 files | Billing strategies, money utils, fleet rules, hardening, error codes |
| Integration | Vitest + testcontainer | 3 files | Billing, work sessions, expenses (require running Postgres) |
| E2E | Playwright | 3 files | Navigation, forms, load testing |
| Generated | Custom generators | 3 suites | RLS isolation, finance denial, append-only |

**CI Pipeline (4 jobs):**
1. `checks` — lint, typecheck, boundaries, migrate, isolation tests, finance denial, OpenAPI drift
2. `e2e` — Playwright end-to-end tests
3. `cdk-diff` — AWS infrastructure diff (informational)
4. `deploy-dev` — Auto-deploy to dev on main branch

---

## 10. Development Workflow

1. Read task from `docs/BACKLOG.md`
2. Write failing tests from requirements
3. Implement feature
4. Run `pnpm test` and `pnpm test:isolation` until green
5. Open PR with requirement IDs (e.g. WRK-01, BIL-03)
6. Auto-deploys to Render on merge to `main`

### Available Scripts (19)
| Script | Purpose |
|--------|---------|
| `pnpm dev` | Run API + Web concurrently |
| `pnpm test` | Run all unit tests |
| `pnpm test:isolation` | RLS isolation test generator |
| `pnpm test:finance-denial` | Finance denial test suite |
| `pnpm test:append-only` | Append-only and edit-window tests |
| `pnpm test:e2e` | Playwright e2e tests |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type checking |

---

## 11. Current Status

### Completed
- [x] Database schema with 42 tables, 10 views, RLS, grants
- [x] API with 25 fully implemented modules (27 controllers)
- [x] Web with 44 pages and full UI
- [x] Billing engine with multiple rate strategies
- [x] Alert engine with 11 alert types (9 check methods)
- [x] Seed data with 14 days of demo history + alert trigger data
- [x] Production deployment on Render
- [x] CI/CD pipeline with 4 jobs
- [x] 24 language locales

### In Progress
- [ ] Mobile app (Flutter — planned after web launch)
- [ ] WhatsApp notifications integration
- [ ] OCR for meter readings and receipts
- [ ] Excel export for reports

### Known Limitations
- Free tier hosting (may sleep after inactivity)
- Single-region deployment (Ohio)
- No automated backups configured
- Basic auth (JWT only, no MFA yet)

---

## 12. Cost Estimate (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Render PostgreSQL | Free | $0 |
| Render Web | Free | $0 |
| Render API | Free | $0 |
| **Total** | | **$0** |

*Free tier includes 750 hours/month compute, 1GB database storage.*

---

## 13. Next Steps

1. **Pilot Launch** — Onboard 1-2 African tenants with real equipment data
2. **Production Hardening** — Add MFA, automated backups, monitoring
3. **Mobile App** — Flutter app for field staff (offline-first)
4. **WhatsApp Integration** — Automated alerts via WhatsApp Business API
5. **Scaling** — Move to paid Render plans as tenant count grows

---

*Document generated: September 2026*
