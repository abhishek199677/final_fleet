# Fleet OS

> UI generation brief for Google AI Studio

Fleet OS is a multi-tenant SaaS operations and finance-visibility platform for heavy-equipment rental businesses. It helps owners understand what every machine is doing today, what work is billable, what maintenance is due, what clients owe, and where cash or operational leakage may exist.

This README is the product, UX, and engineering handoff for generating or improving the Fleet OS web UI. Treat the existing repository as the source of truth for routes, components, APIs, tokens, and dependencies. Do not invent a different product, role model, or visual language.

**Vendor:** Perceptiqx  
**Status:** Web pilot  
**Primary users:** Owners and operations/site staff  
**Locales:** English (`en`) and French (`fr`)  
**Authoritative documents:** `docs/BRD.md`, `docs/TSD.md`, `CLAUDE.md`

## 1. Product Context

Fleet OS is the daily control center for an equipment-rental company. Field teams record work, fuel, downtime, expenses, receipts, cash counts, and maintenance. Owners see trustworthy billing, collections, cash, utilisation, machine contribution, and alerts.

The product solves:

- Unbilled machine work and unrecorded diesel.
- Missed maintenance and unexpected breakdowns.
- Unclear client payments, advances, overdue balances, and payment holds.
- Cash counts that do not match expected cash.
- Duplicate entries and quiet edits that reduce trust.
- Poor visibility across machines, sites, operators, and clients.

This is an operational business console, not a marketing landing page, generic CRM, or decorative analytics demo.

## 2. Users And Permissions

### Owner

The owner has full access to machines, meters, operators, clients, sites, deployments, billing, receivables, cash, expenses, projections, insights, maintenance configuration, alerts, evidence policy, FX defaults, users, audit, and exports.

The owner experience should prioritise fast answers, exceptions, reconciliation, and confidence in the numbers.

### Operations

Operations users work mainly from a phone or narrow laptop screen in the field. They can view today’s machines and maintenance due, and enter work sessions, meter readings, photos, fuel, downtime, expenses, receipts, advances, cash counts, and maintenance visits. They can view their own history and report problems.

Operations users must never see rates, billing totals, revenue, receivables, margins, contribution, projections, expected cash, cash variance, purchase costs, or client credit limits. Never leak a finance value through a chart, table total, tooltip, API response, URL, or shared component.

### Platform Admin

Perceptiqx platform admins use a separate admin experience to create, onboard, suspend, and archive tenants; configure entitlements; view health metadata; manage tickets and announcements; and start export/offboarding workflows. They do not browse tenant operational or financial records without a future audited support-access workflow.

## 3. Navigation And Routes

Preserve these Next.js route contracts.

### Owner routes

| Route | Purpose |
|---|---|
| `/home` | Command center: KPIs, fleet status, collections, alerts, logging gaps, cash summary |
| `/machines` | Fleet list, search, filters, status, meters, sites, maintenance signals |
| `/machines/new` | Create a machine and primary meter |
| `/machines/[id]` | Meter trend, utilisation, diesel, downtime, maintenance, consumables, contribution |
| `/sites` | Sites grouped by client with status and machine counts |
| `/sites/new` | Create a site |
| `/sites/[id]` | Site details and deployments |
| `/deployments` | Machine-to-site deployments and payment-hold status |
| `/deployments/new` | Create a deployment |
| `/deployments/[id]` | Deployment, rate card, activity, charges, hold/release controls |
| `/operators` | Operator directory, assignments, active status, contacts |
| `/operators/new` | Add an operator |
| `/clients` | Clients, receivables, payment terms, advances, hold indicators |
| `/clients/new` | Create a client |
| `/clients/[id]` | Client detail, sites, receivable ageing, receipts, advances |
| `/billing` | Billing ledger, receivables, contribution, filters, export |
| `/cash` | Cash accounts, transfers, counts, expected cash, variance |
| `/projections` | Projected billing and contribution |
| `/insights` | Downtime, utilisation, diesel efficiency, consumables, concentration |
| `/audit` | Filterable append-only activity and correction history |
| `/support` | Report a problem and track tickets |
| `/settings` | Users, machines, maintenance, categories, evidence, FX, thresholds |

Owner navigation is grouped into **Overview**, **Manage**, and **Tools**. Desktop uses a collapsible sidebar of about 260px or 72px. Mobile uses a drawer.

### Operations routes

| Route | Purpose |
|---|---|
| `/today` | Today’s machines, session status, maintenance due, quick actions |
| `/work-session` | Work-session list and active session state |
| `/work-session/new` | Start a session with machine, deployment, operator, meter, photo, notes |
| `/work-session/[id]/end` | End a session with end meter, evidence, billable flag, notes |
| `/downtime` | Record downtime segments and reasons |
| `/fuel` | Fuel and oil log list |
| `/fuel/new` | Add fuel with litres, cost, receipt, machine, date |
| `/expense` | Expense list and verification state |
| `/expense/new` | Add expense with category, amount, cash account, allocation, receipt |
| `/receipt` | Record a client receipt or advance with evidence |
| `/cash-count` | Blind physical cash count; never show expected cash or variance |
| `/maintenance` | Maintenance due list and visit entry |
| `/history` | Current user’s entries, upload state, and corrections |

Operations screens are mobile-first. Use large touch targets, short forms, camera/file capture, clear validation, offline state, and progressive disclosure.

### Admin routes

| Route | Purpose |
|---|---|
| `/tenants` | Tenant list, status, plan, limits, usage, last activity |
| `/health` | Metadata-only tenant health and failed jobs |
| `/tickets` | Support ticket queue and status |
| `/announcements` | Compose and broadcast announcements |

## 4. Owner Home Requirements

The owner home must answer “What needs my attention today?” within seconds.

Header:

- Tenant context and current date.
- Time range: Today, Month, Year, All.
- Search/global action access where useful.
- Alerts and notifications affordances.

KPI cards:

- Total billed.
- Receipts.
- Outstanding receivable.
- Unused advances.
- Total expenses.
- Net cash position.
- Expense ratio.
- Total meter units.
- Utilisation.
- Evidence coverage.

Below the KPIs, prioritise:

1. Fleet status cards with machine code, type, site, status, meter, activity, and maintenance signal.
2. Needs attention: overdue maintenance, overdue payment, payment hold, stopped machine, log pending, diesel anomaly, duplicate expense, cash variance.
3. Collections with largest outstanding balances and ageing buckets.
4. Logging compliance for active machines without a session by the tenant cut-off.
5. Recent work, fuel, expense, receipt, maintenance, and correction activity.
6. Useful trends such as billing versus expenses, fuel versus downtime, utilisation, or evidence coverage.

The page must work at desktop, tablet, and narrow mobile widths without horizontal scrolling or overlapping content.

## 5. Domain Rules For UI

### Machines

A machine has a code, type, make, model, year, serial/chassis number, photo, attributes, status flag, and one primary meter. Meter types include engine hours, odometer kilometres, cycles, drill metres, tonnes, and trips.

Operational statuses are Work reported today, Log pending, Reported stopped, Under service, In transit, and Retired. These are derived or owner-pinned statuses, not live telematics claims.

### Clients, sites, and deployments

A client has sites. A deployment places one machine at one site for a period. A machine has at most one active deployment. A deployment can be on payment hold.

When a deployment is on hold, Operations sees **“Do not run — payment on hold”** but can still log work; the session is flagged for the owner.

### Work sessions

A session contains machine, deployment, operator, optional helper, start/end time, start/end meter, optional activity, billable flag, notes, and optional meter photos/OCR.

Rules shown in the UI:

- End must be after or equal to start.
- A session cannot exceed 24 hours.
- Overlapping sessions on one machine are rejected.
- Continuity or meter anomalies warn the user and may require an override reason.
- Several sessions per machine per day are valid.
- Sessions may cross midnight.
- Manual readings show Unverified to the owner.

### Maintenance

Tasks are meter-based or calendar-based. The default machine template is general service every 250 hours with a 20-hour warning. A visit records mechanic, date, type, meter, checklist, parts, consumables, labour, photos, and completed tasks. Completing a task advances its next due value and never resets the machine meter.

### Billing and money

Owners see money. Operations may record money events but must not see balances or financial summaries.

Rate strategies are hourly, daily fixed, monthly hire, and optional standby. Billing is immutable; corrections create adjustment entries.

Every money value contains transaction currency, integer minor amount, FX rate when required, and integer base-currency amount. Never use floating-point money arithmetic. Receivables are billed plus extra charges minus credit notes, applied receipts, and consumed advances. Ageing buckets are current, 1–30, 31–60, and 60+ days.

### Cash and expenses

Owner cash screens can show expected balance, counted balance, and variance. Operations cash-count screens are blind: users submit a physical count, note, and optional photo without seeing expected cash or variance.

Expenses contain date, category, description, currency, amount, cash account, payer, allocation, receipt, and note. Duplicate warnings and Needs verification are flags, not blockers: the write succeeds and the owner is alerted.

## 6. Alerts And Status

| Severity | Meaning | Treatment |
|---|---|---|
| Critical | Immediate action or business risk | Red icon, restrained red surface, explicit action |
| Warning | Review soon | Amber icon and light amber surface |
| Success | Completed, reconciled, or healthy | Green icon and light green surface |
| Info | Context or recent activity | Blue icon and light blue surface |

Supported alert concepts: maintenance warning/overdue, payment due/overdue/hold, stopped machine, log pending, OCR mismatch, diesel anomaly, duplicate expense, expense concentration, cash variance, and entry edited.

Do not rely on colour alone. Pair colour with text, icon, and a next action.

## 7. Visual Design Direction

The existing design system is light-first, professional, dense, and operations-focused.

### Colour

- Primary brand: deep teal `#0f766e`; accent teal `#14b8a6`.
- Canvas: very light neutral gray.
- Surfaces: white with subtle neutral borders.
- Text: dark blue-gray, not pure black.
- Status: accessible green, amber, red, and blue.
- Dark mode exists but light mode is the default.
- Avoid purple-on-white, loud gradients, neon colours, excessive glassmorphism, and marketing hero treatments.

### Typography

The current system uses Inter for UI text and JetBrains Mono/SF Mono for technical values. Keep type compact and scannable: strong page titles, short context, 14px base body text, clear numerical hierarchy, and monospace only for machine codes or technical IDs.

### Layout

- Desktop shell: collapsible left sidebar and sticky top bar.
- Constrained readable content width with efficient spacing.
- Cards are for repeated data units, KPIs, alerts, and framed tools; do not nest cards inside cards.
- Use tables for comparison-heavy owner views and stacked rows for mobile.
- Use tabs for related views, segmented controls for time ranges, filters for datasets, and drawers/modals for focused edits.
- Use small radii, generally 4–12px, not oversized pill containers.
- Give KPI cards, charts, table rows, buttons, and navigation stable dimensions.

### Existing UI stack

Reuse these before adding new patterns:

- Tailwind CSS with Fleet OS CSS variables.
- Existing Radix/shadcn-style primitives.
- `lucide-react` icons.
- Recharts.
- Existing `Button`, `Card`, `Input`, `MoneyInput`, `PhotoCapture`, `PageEnter`, `Reveal`, and dashboard components.

Every unfamiliar icon button needs an accessible label and tooltip. Use text buttons for actions such as Save, Add machine, Record receipt, Export, and Resolve.

### Motion

Use restrained page-enter and reveal motion, plus small transitions for drawers, filters, status changes, and loading. Respect reduced-motion preferences. Avoid continuous decorative motion that makes field data harder to scan.

## 8. Responsive And Field Use

- Owner pages are desktop-first but must work on tablet and mobile.
- Operations pages are mobile-first for Android Chrome and intermittent connectivity.
- Use 44px touch targets where practical.
- Keep primary actions reachable on long forms; use sticky mobile action bars when useful.
- Support camera capture and file selection for evidence.
- Show saved locally, uploading, uploaded, failed, and retry states.
- Never lose a form because the network disappears.
- Every async view needs loading, empty, error, and retry states.
- Long tables need responsive row/card alternatives.
- Do not truncate machine codes, amounts, statuses, or validation messages.

## 9. Localization

All visible strings must be externalised through `packages/web/messages/en.json` and `packages/web/messages/fr.json` with `next-intl`.

- Keep English and French keys aligned.
- Format dates and numbers for the active locale.
- Use tenant base and transaction currency from data.
- Show original and base amounts when relevant.
- Allow French labels to wrap without breaking controls or tables.
- Never hard-code English-only labels in a new component.

## 10. Technical Context And Boundaries

```text
packages/api/       NestJS REST API, raw SQL query layer, /v1 and /admin
packages/db/        PostgreSQL migrations, seeds, RLS, grants, isolation tests
packages/shared/    OpenAPI-generated types, enums, error codes, money utilities
packages/web/       Next.js App Router frontend
packages/infra/     AWS CDK infrastructure
docs/               BRD, TSD, project documentation, backlog
```

The database uses three roles:

- `app_owner`: operational and finance access.
- `app_ops`: operational access only; no finance tables or views.
- `app_platform`: platform metadata only.

Every tenant table has `tenant_id`, an index, enabled and forced RLS, and tenant policies. Transactional records are append-only. Writes accept `client_uuid` for idempotency. Errors use RFC 7807 with shared error codes.

Web boundaries:

- `/owner/*` may use finance clients and types.
- `/ops/*` must not import or fetch finance clients, types, or views.
- `/admin/*` uses platform metadata only.

Use realistic mocked data only when the API is unavailable. Keep mock data behind an adapter and preserve API-compatible shapes.

## 11. Existing Web Implementation

`packages/web` uses Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS 3, `next-intl`, `lucide-react`, Recharts, React Hook Form, Zod, an IndexedDB offline queue, and Playwright.

Reusable surfaces include:

```text
components/dashboard/   KPI cards, fleet status, alerts, activity, attention panels
components/nav/         owner, operations, and admin navigation/shells
components/ui/           buttons, cards, inputs, photo capture
components/fx/           page enter, reveal, ambient background, glare card
components/money/        currency-aware money input
hooks/                   offline queue
lib/api/                 API clients, auth fetch, proxy, list helpers
lib/sample-data.ts       local demo records for UI fallback
```

## 12. UI Engineering Rules

1. Reuse existing tokens and components before adding abstractions.
2. Keep owner, operations, and admin layouts related but role-appropriate.
3. Keep financial values out of operations code paths, props, and mocks.
4. Add English and French strings with every new visible label.
5. Build loading, empty, error, success, disabled, validation, offline, and permission-safe states.
6. Preserve keyboard navigation, focus-visible states, semantic headings, labels, and accessible names.
7. Do not hide destructive or irreversible actions behind ambiguous icons.
8. Preserve route contracts and use real links.
9. Do not add a dependency without explaining why it is necessary.
10. Do not add secrets, credentials, or tenant data to code, screenshots, or documentation.

## 13. What Google AI Studio Should Produce

When creating or improving Fleet OS UI:

- Start with the working experience, not a landing page.
- Use the existing shell, brand tokens, routes, dependencies, and role boundaries.
- Make the owner home useful on first render with realistic fleet data and attention items.
- Make operations forms fast and trustworthy on a phone.
- Make finance dashboards dense enough for comparison without visual noise.
- Include loading, empty, error, offline, and permission-safe states.
- Include desktop and mobile layouts and test long French labels.
- Use Lucide icons, accessible controls, and Recharts only where a chart communicates a real trend.
- Keep copy direct and operational: “Log pending”, “Service due in 20 hours”, “Payment on hold”, “Needs verification”.
- Before creating a new pattern, identify which existing component or file should be extended.

Do not generate:

- A generic SaaS landing page.
- A purple gradient dashboard.
- A fake finance view for Operations.
- Decorative screens with no actions or data states.
- Hard-coded English-only UI.
- Floating-point money calculations.
- Screens that imply GPS or live telematics exists.

## 14. Local Development

### Prerequisites

- Node.js 22 or newer.
- pnpm 9 or newer.
- PostgreSQL (via local installation, Docker, or Neon serverless).

### Database Setup

Fleet OS requires a PostgreSQL database named `fleetos` with user `postgres` and password `postgres` (as configured in `.env`). Choose one of these methods:

**Option 1: Docker (Recommended for consistency)**
```bash
docker run -d \
  --name fleetos-postgres \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fleetos \
  postgres:16
```

**Option 2: Local Installation**
- Install PostgreSQL 14+ via your system package manager (Homebrew, apt-get, etc.)
- Ensure the `postgres` service is running on port 5432
- Create database: `createdb fleetos`
- The default `postgres` user should have password `postgres` (update `.env` if different)

**Option 3: Neon Serverless (Managed)**
- Sign up at [neon.tech](https://neon.tech)
- Create a project and database
- Update `.env` with your Neon connection string:
  ```env
  DATABASE_URL=postgres://[USER]:[PASSWORD]@[HOST]/fleetos?sslmode=require
  ```

### Install and run

```bash
pnpm install
pnpm db:migrate      # Apply database migrations
pnpm db:seed         # Seed initial data
pnpm dev             # Start both API (port 3001) and Web (port 3000)
```

Run only the web UI with:
```bash
pnpm dev:web
```

Run only the API with:
```bash
pnpm dev:api
```

### Checks

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm lint
pnpm lint:boundaries
pnpm test:isolation
pnpm test:finance-denial
pnpm test:append-only
pnpm db:lint
```

Web-only checks:
```bash
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

## 15. Deployment

### Docker Build

Build Docker images for production deployment:
```bash
# Build API image
docker build -t fleetos-api -f packages/api/Dockerfile .

# Build Web image
docker build -t fleetos-web -f packages/web/Dockerfile .
```

### Render.com Deployment

The web Dockerfile is pre-configured for Render.com deployment:
- API_URL defaults to `https://fleetos-api-seven.vercel.app`
- Set environment variables in Render dashboard:
  - `DATABASE_URL` (Neon or PostgreSQL connection string)
  - `JWT_SECRET` (strong secret for production)
  - `API_URL` (your Render API service URL)
  - `NEXT_PUBLIC_API_URL` (same as API_URL)
  - `GEMINI_API_KEY` (for OCR functionality)
  - `OPENAI_API_KEY` (for AI insights)
  - Optional: WhatsApp and SMS credentials

### Neon Database (Production)

For production deployments, consider using [Neon](https://neon.tech) serverless PostgreSQL:
1. Create a Neon project
2. Copy the connection string from Neon dashboard
3. Set as `DATABASE_URL` in your deployment environment
4. The `@neondatabase/serverless` driver is already included in dependencies

## 16. Reference Documents And Requirements

- [Business Requirements](docs/BRD.md): functional requirements and acceptance criteria.
- [Technical Specification](docs/TSD.md): architecture, data model, API, security, and delivery plan.
- [Project Documentation](docs/PROJECT_DOCUMENTATION.md): implementation inventory and deployment notes.
- [Launch Backlog](docs/BACKLOG.md): delivery slices and requirement IDs.
- [Agent Standing Orders](CLAUDE.md): repository constraints and definition of done.

UI work should cite requirement IDs. Common mappings:

| UI area | IDs |
|---|---|
| Owner home and KPIs | RPT-01, RPT-02, RPT-03 |
| Machines and detail | MCH-01 to MCH-06, RPT-03 |
| Clients, sites, deployments | CLI-01 to CLI-06 |
| Work-session entry | WRK-01 to WRK-08 |
| Maintenance | MNT-01 to MNT-05 |
| Billing and receivables | BIL-01 to BIL-07 |
| Cash | CSH-01 to CSH-04 |
| Expenses | EXP-01 to EXP-05 |
| Insights and projections | INS-01 to INS-06, RPT-05 |
| Alerts | ALT-01 to ALT-04 |
| Audit and corrections | SEC-01 to SEC-05 |
| Admin and support | ADM-01 to ADM-06 |
| Localization and evidence | TEN-05 to TEN-07, S50 |

For conflicts, follow security and role boundaries in `CLAUDE.md` and `docs/TSD.md`, product requirements in `docs/BRD.md`, then the current implementation and route tree.