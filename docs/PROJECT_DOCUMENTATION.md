# Fleet OS — Project Documentation

## 1. Executive Summary

Fleet OS is a **multi-tenant SaaS platform** for heavy-equipment fleet operators (excavators, drilling rigs, loaders, cranes, tippers, etc.). It manages the entire lifecycle of equipment rental — from work logging and billing to cash tracking and maintenance.

**Vendor:** Perceptiqx  
**Version:** 3.0  
**Status:** Pilot deployment (Africa, 1-2 tenants)  
**Target:** Scale to 5-10 tenants within 12 months

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

### Automated Alerts (8 Types)
| Alert | Severity | Trigger |
|-------|----------|---------|
| Maintenance overdue | Critical | Machine past service interval |
| Payment overdue | Critical | Client billing past payment terms |
| Diesel anomaly | Warning | >500L consumption in 7 days |
| Cash variance | Warning | Expected vs counted mismatch >₹10,000 |
| Duplicate expense | Warning | Same category/month/amount ±1% |
| Expense concentration | Warning | Single category >35% of total |
| Stopped long | Warning | Machine idle >8 hours |
| Log pending | Warning | No work session logged today |

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
| API | NestJS (25 modules), Postgres (raw SQL, no ORM) |
| Database | PostgreSQL 16 with Row-Level Security (RLS) |
| Web | Next.js 15 (App Router), Tailwind, shadcn/ui, Recharts |
| Auth | JWT-based with dual roles (owner/ops) |
| Infrastructure | AWS CDK (RDS, S3, Cognito, SQS, Lambda) |
| Hosting | Render (API + Web + PostgreSQL) |
| Testing | Vitest (unit), Playwright (e2e), Postgres testcontainer |
| CI/CD | GitHub Actions with migration linter, RLS isolation tests |

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
- RFC 7807 error format with standardised error codes
- 25 feature modules covering all business operations

---

## 6. Deployment

### Live URLs
| Service | URL |
|---------|-----|
| Web App | https://fleetos-web-hh42.onrender.com |
| API | https://fleetos-api-rdwp.onrender.com |
| API Docs | https://fleetos-api-rdwp.onrender.com/docs |

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Owner | demo@fleetos.com | demo1234 |
| Ops | ops@fleetos.com | demo1234 |

### Environment
- **Database:** Render PostgreSQL 18 (free tier)
- **API:** Render Docker (Node.js 22)
- **Web:** Render Docker (Next.js standalone)
- Auto-deploys on every push to `main` branch

---

## 7. Project Structure

```
fleetos/
├── packages/
│   ├── api/          # NestJS REST API (25 modules)
│   ├── web/          # Next.js frontend (40+ pages)
│   ├── db/           # SQL migrations (21), seeds, generators
│   ├── shared/       # OpenAPI types, enums, error codes
│   └── infra/        # AWS CDK infrastructure
├── docs/
│   ├── BRD.md        # Business Requirements Document
│   ├── TSD.md        # Technical Specification Document
│   └── BACKLOG.md    # Development roadmap
└── .claude/skills/   # Agent development recipes
```

---

## 8. Security

- **RLS on every table** — Database-level tenant isolation
- **FORCE ROW LEVEL SECURITY** — Even table owners cannot bypass RLS
- **Append-only audit trail** — Every write is logged
- **Finance/ops separation** — Enforced at database and code level
- **JWT authentication** — With role-based access control
- **No secrets in code** — All credentials via environment variables

---

## 9. Development Workflow

1. Read task from `docs/BACKLOG.md`
2. Write failing tests from requirements
3. Implement feature
4. Run `pnpm test` and `pnpm test:isolation` until green
5. Open PR with requirement IDs (e.g. WRK-01, BIL-03)
6. Auto-deploys to Render on merge to `main`

---

## 10. Current Status

### Completed
- [x] Database schema with 34 tables, RLS, grants
- [x] API with 25 fully implemented modules
- [x] Web with 40+ pages and full UI
- [x] Billing engine with multiple rate strategies
- [x] Alert engine with 8 automated checks
- [x] Seed data with 14 days of demo history
- [x] Production deployment on Render

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

## 11. Cost Estimate (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Render PostgreSQL | Free | $0 |
| Render Web | Free | $0 |
| Render API | Free | $0 |
| **Total** | | **$0** |

*Free tier includes 750 hours/month compute, 1GB database storage.*

---

## 12. Next Steps

1. **Pilot Launch** — Onboard 1-2 African tenants with real equipment data
2. **Production Hardening** — Add MFA, automated backups, monitoring
3. **Mobile App** — Flutter app for field staff (offline-first)
4. **WhatsApp Integration** — Automated alerts via WhatsApp Business API
5. **Scaling** — Move to paid Render plans as tenant count grows

---

*Document generated: September 2026*
