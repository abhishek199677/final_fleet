#!/usr/bin/env node
/**
 * Fleet OS API end-to-end suite — the e2e stage of `pnpm pipeline`.
 *
 * Self-provisioning: registers its own tenant so it runs against a fresh
 * migrate+seed database without touching anyone's data, then walks the full
 * journey a real operator takes:
 *
 *   provision → master data → deployment + rate card → daily ops →
 *   money → billing → dashboard reads → edits → import/export → negative paths
 *
 * It also asserts the seven wiring fixes found in the 2026-09 audit:
 *   FIX1 billing run succeeds with a client advance present, advance consumed
 *   FIX2 audit trail populated with the acting user attributed
 *   FIX3 GET /v1/users (audit page user filter) responds
 *   FIX4 cash accounts readable and creatable
 *   FIX5 maintenance task without warning_value accepted (column nullable)
 *   FIX6 forced 500 returns the generic envelope (log side checked by pipeline)
 *   FIX7 fake-success alerts removed (web-side; asserted by tsc/lint)
 *
 * Usage:  E2E_BASE_URL=http://localhost:3011 node scripts/e2e-pipeline.js
 * Exit code 0 only when every step passes.
 */
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';
const STAMP = Date.now().toString(36).toUpperCase();

const results = [];
let section = 'provision';
const ids = {};

const S = (name) => `${section} › ${name}`;

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
  return { status: res.status, data };
}

async function step(name, expect, fn) {
  try {
    const r = await fn();
    const ok = expect(r);
    results.push({ name: S(name), status: r.status, ok, detail: ok ? '' : JSON.stringify(r.data).slice(0, 220) });
    return r;
  } catch (e) {
    results.push({ name: S(name), status: 'ERR', ok: false, detail: String(e).slice(0, 220) });
    return { status: 'ERR', data: null };
  }
}

const ok2xx = (r) => r.status >= 200 && r.status < 300;
const nonEmpty = (r) => ok2xx(r) && Array.isArray(r.data) && r.data.length > 0;
const uuid = () => crypto.randomUUID();
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const iso = (offset, h = 9) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 11) + String(h).padStart(2, '0') + ':00:00.000Z';

const EMAIL = `pipeline-${STAMP}@fleetos.test`;
const TENANT = `Pipeline Co ${STAMP}`;
const PASSWORD = 'Pipeline!1234';

(async () => {
  // ── provision ───────────────────────────────────────────────────────
  await step('GET /v1/health', ok2xx, () => api('GET', '/v1/health'));
  const reg = await step('POST /v1/auth/register (own tenant)', (r) => ok2xx(r) && !!r.data.token, () =>
    api('POST', '/v1/auth/register', { email: EMAIL, password: PASSWORD, tenant_name: TENANT }));
  const login = await step('POST /v1/auth/login (fresh tenant)', (r) => ok2xx(r) && !!r.data.token, () =>
    api('POST', '/v1/auth/login', { email: EMAIL, password: PASSWORD }));
  const T = login.data && login.data.token;
  if (!T) { report(); return; }
  // EMAIL embeds an uppercased STAMP; identity lookups are case-insensitive
  // and the API normalises to lowercase, so compare without case.
  await step('GET /v1/auth/me', (r) => ok2xx(r) && String(r.data.email).toLowerCase() === EMAIL.toLowerCase(),
    () => api('GET', '/v1/auth/me', undefined, T));
  await step('register seeds categories + cash account (FIX4 seed)', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.length >= 1, () => api('GET', '/v1/cash/accounts', undefined, T));

  // ── master data ─────────────────────────────────────────────────────
  section = 'master data';
  const client = await step('POST /v1/clients', ok2xx, () =>
    api('POST', '/v1/clients', { name: `Pipeline Client ${STAMP}`, contact: 'Ravi Kumar', phone: '+91 98000 00001', currency: 'INR', payment_terms_days: 30, client_uuid: uuid() }, T));
  ids.client = client.data && client.data.id;

  const site = await step('POST /v1/sites', ok2xx, () =>
    api('POST', '/v1/sites', { name: `Pipeline Site ${STAMP} — Block A`, client_id: ids.client, location: 'Pune, MH', start_date: day(-30), client_uuid: uuid() }, T));
  ids.site = site.data && site.data.id;

  const mach1 = await step('POST /v1/machines (excavator)', ok2xx, () =>
    api('POST', '/v1/machines', { code: `PL-EXC-${STAMP}`, type: 'excavator', make: 'Caterpillar', model: '320', year: 2022, primary_meter_type: 'hours', meter_unit_label: 'hrs', client_uuid: uuid() }, T));
  ids.m1 = mach1.data && mach1.data.id;

  const mach2 = await step('POST /v1/machines (backhoe)', ok2xx, () =>
    api('POST', '/v1/machines', { code: `PL-JCB-${STAMP}`, type: 'backhoe', make: 'JCB', model: '3DX', year: 2021, primary_meter_type: 'hours', meter_unit_label: 'hrs', client_uuid: uuid() }, T));
  ids.m2 = mach2.data && mach2.data.id;

  const op = await step('POST /v1/operators', ok2xx, () =>
    api('POST', '/v1/operators', { name: 'Suresh Patil', phone: '+91 98000 00002', client_uuid: uuid() }, T));
  ids.op = op.data && op.data.id;

  // ── deployment + commercial ─────────────────────────────────────────
  section = 'deployment';
  const dep = await step('POST /v1/deployments', ok2xx, () =>
    api('POST', '/v1/deployments', { machine_id: ids.m1, site_id: ids.site, start_date: day(-20), client_uuid: uuid() }, T));
  ids.dep = dep.data && dep.data.id;

  await step('duplicate deployment rejected (409, guardrail)', (r) => r.status === 409, () =>
    api('POST', '/v1/deployments', { machine_id: ids.m1, site_id: ids.site, start_date: day(-5), client_uuid: uuid() }, T));

  await step('POST /v1/billing/rate-cards (hourly, effective before period)', ok2xx, () =>
    api('POST', '/v1/billing/rate-cards', { deployment_id: ids.dep, effective_from: day(-20), strategy: 'hourly', rate_minor: 1500, currency: 'INR', min_units_per_day: 0, client_uuid: uuid() }, T));

  // ── daily ops ───────────────────────────────────────────────────────
  section = 'daily ops';
  const ws = await step('POST /v1/work-sessions (start)', ok2xx, () =>
    api('POST', '/v1/work-sessions', {
      machine_id: ids.m1, deployment_id: ids.dep, operator_id: ids.op,
      start_at: iso(-1, 8), start_meter: 1000, client_uuid: uuid(),
    }, T));
  ids.ws = ws.data && ws.data.id;

  await step('overlapping session rejected (409, guardrail)', (r) => r.status === 409, () =>
    api('POST', '/v1/work-sessions', {
      machine_id: ids.m1, deployment_id: ids.dep, operator_id: ids.op,
      start_at: iso(-1, 10), start_meter: 1010, client_uuid: uuid(),
    }, T));

  await step('POST /v1/work-sessions/:id/end (close session)', ok2xx, () =>
    api('POST', `/v1/work-sessions/${ids.ws}/end`, { end_at: iso(-1, 17), end_meter: 1080, units_run: 80 }, T));

  // /end supersedes and issues a NEW current id — resolve it like the UI list does.
  const curList = await step('GET /v1/work-sessions (resolve current version)', nonEmpty, () => api('GET', '/v1/work-sessions', undefined, T));
  const current = Array.isArray(curList.data) && curList.data.find((s) => s.is_current !== false);
  if (current) ids.ws = current.id;

  // The list endpoint returns current versions only (repo: WHERE is_current),
  // so prove superseding through ids instead of row counts: the correction
  // response must mint a NEW id, and the list must show it while hiding the
  // superseded one (append-only chain).
  const preCorrId = ids.ws;
  const corr = await step('POST /v1/work-sessions/:id/corrections (versioned edit)', (r) =>
    ok2xx(r) && !!r.data && !!r.data.id && r.data.id !== preCorrId, () =>
    api('POST', `/v1/work-sessions/${preCorrId}/corrections`, { end_meter: 1082, units_run: 82, override_reason: 'Pipeline correction check', client_uuid: uuid() }, T));
  const corrId = (corr.data && corr.data.id) || preCorrId;
  ids.ws = corrId;

  await step('supersede chain: list has new current id, old id superseded', (r) =>
    ok2xx(r) && Array.isArray(r.data) &&
    r.data.some((s) => s.id === corrId) && !r.data.some((s) => s.id === preCorrId),
    () => api('GET', '/v1/work-sessions', undefined, T));

  await step('POST /v1/fuel-downtime/fuel-logs', ok2xx, () =>
    api('POST', '/v1/fuel-downtime/fuel-logs', { machine_id: ids.m1, work_session_id: ids.ws, litres: 45, cost_minor: 4725, currency: 'INR', client_uuid: uuid() }, T));

  await step('POST /v1/fuel-downtime/downtime', ok2xx, () =>
    api('POST', '/v1/fuel-downtime/downtime', { machine_id: ids.m2, started_at: iso(-2, 11), ended_at: iso(-2, 14), reason_code: 'breakdown', note: 'Hydraulic leak', client_uuid: uuid() }, T));

  const cats = await step('GET /v1/expenses/categories (seeded)', nonEmpty, () => api('GET', '/v1/expenses/categories', undefined, T));
  const catId = Array.isArray(cats.data) && cats.data.length ? cats.data[0].id : null;

  await step('POST /v1/expenses', ok2xx, () =>
    api('POST', '/v1/expenses', {
      date: day(-1), category_id: catId, description: 'Diesel top-up (pipeline)', currency: 'INR',
      amount_minor: 125000, base_minor: 125000, paid_by: 'owner', allocation_type: 'site',
      site_id: ids.site, client_uuid: uuid(),
    }, T));

  await step('POST /v1/client-money/events (client advance)', ok2xx, () =>
    api('POST', '/v1/client-money/events', {
      client_id: ids.client, site_id: ids.site, event_type: 'advance', currency: 'INR',
      amount_minor: 500000, base_minor: 500000, mode: 'bank', event_date: day(-3), client_uuid: uuid(),
    }, T));

  // ── cash (FIX4) ─────────────────────────────────────────────────────
  section = 'cash';
  const accts = await step('GET /v1/cash/accounts (seeded account present)', nonEmpty, () => api('GET', '/v1/cash/accounts', undefined, T));
  const acct = Array.isArray(accts.data) && accts.data[0];
  await step('POST /v1/cash/accounts (create second account)', ok2xx, () =>
    api('POST', '/v1/cash/accounts', { name: `Pipeline Bank ${STAMP}`, type: 'bank', currency: 'INR' }, T));
  const accts2 = await step('GET /v1/cash/accounts (after create, ≥2)', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.length >= 2, () => api('GET', '/v1/cash/accounts', undefined, T));
  const fromAcct = acct || {};
  const toAcct = (accts2.data && accts2.data[1]) || {};
  await step('cash count against seeded account', ok2xx, () =>
    api('POST', '/v1/cash/counts', { cash_account_id: fromAcct.id, count_date: day(-1), counted: { notes: 500, coins: 100 }, client_uuid: uuid() }, T));
  await step('POST /v1/cash/transfers', ok2xx, () =>
    api('POST', '/v1/cash/transfers', {
      from_account_id: fromAcct.id, to_account_id: toAcct.id,
      currency: 'INR', amount_minor: 10000, transfer_date: day(-1), reference: 'pipeline seed', client_uuid: uuid(),
    }, T));
  await step('transfer rows carry fx_rate + base_minor (fx-NULL bug guard)', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((tr) => Number(tr.fx_rate) > 0 && Number(tr.base_minor) > 0), () =>
    api('GET', '/v1/cash/transfers', undefined, T));

  // ── maintenance (FIX5) ──────────────────────────────────────────────
  section = 'maintenance';
  await step('POST /v1/maintenance/tasks WITHOUT warning_value (FIX5)', ok2xx, () =>
    api('POST', '/v1/maintenance/tasks', { machine_id: ids.m1, name: 'Tyre pressure check', trigger: 'calendar', interval_value: 30, client_uuid: uuid() }, T));
  await step('POST /v1/maintenance/tasks with warning_value', ok2xx, () =>
    api('POST', '/v1/maintenance/tasks', { machine_id: ids.m1, name: 'Engine oil change', trigger: 'meter', interval_value: 250, warning_value: 20, client_uuid: uuid() }, T));
  await step('POST /v1/maintenance/visits (scheduled)', ok2xx, () =>
    api('POST', '/v1/maintenance/visits', { machine_id: ids.m1, visit_date: day(-5), visit_type: 'scheduled', mechanic: 'In-house', meter_at_visit: 1050, client_uuid: uuid() }, T));
  await step('GET /v1/maintenance/machines/:id/status', nonEmpty, () =>
    api('GET', `/v1/maintenance/machines/${ids.m1}/status`, undefined, T));
  await step('GET /v1/maintenance/tasks (tenant-wide settings list)', nonEmpty, () =>
    api('GET', '/v1/maintenance/tasks', undefined, T));

  // ── billing (FIX1) ──────────────────────────────────────────────────
  section = 'billing';
  await step('POST /v1/billing/run with advance present (FIX1)', ok2xx, () =>
    api('POST', '/v1/billing/run', { deployment_id: ids.dep, period_start: day(-7), period_end: day(0) }, T));
  await step('GET /v1/billing/ledger/:deploymentId (entries posted)', nonEmpty, () =>
    api('GET', `/v1/billing/ledger/${ids.dep}`, undefined, T));
  await step('advance consumed by the run (consumed_minor > 0)', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((a) => Number(a.consumed_minor) > 0), () =>
    api('GET', '/v1/billing/unused-advances', undefined, T));
  await step('GET /v1/billing/receivables', nonEmpty, () => api('GET', '/v1/billing/receivables', undefined, T));
  await step('GET /v1/billing/contribution (billed > 0)', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((c) => Number(c.billed_minor) > 0), () =>
    api('GET', '/v1/billing/contribution', undefined, T));
  await step('GET /v1/billing/kpis (billed total > 0)', (r) =>
    ok2xx(r) && Number(r.data.total_billed_minor) > 0, () => api('GET', '/v1/billing/kpis', undefined, T));
  const ledBefore = await step('GET /v1/billing/ledger (count before re-run)', (r) =>
    ok2xx(r) && Array.isArray(r.data), () => api('GET', `/v1/billing/ledger/${ids.dep}`, undefined, T));
  const countBefore = Array.isArray(ledBefore.data) ? ledBefore.data.length : -1;
  await step('POST /v1/billing/run (re-run)', ok2xx, () =>
    api('POST', '/v1/billing/run', { deployment_id: ids.dep, period_start: day(-7), period_end: day(0) }, T));
  await step('re-run posts no duplicate rows (delta netting)', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.length === countBefore, () =>
    api('GET', `/v1/billing/ledger/${ids.dep}`, undefined, T));

  // ── dashboard / analytics reads (what every page fetches) ───────────
  section = 'dashboard reads';
  await step('GET /v1/clients', nonEmpty, () => api('GET', '/v1/clients', undefined, T));
  await step('GET /v1/sites', nonEmpty, () => api('GET', '/v1/sites', undefined, T));
  await step('GET /v1/deployments', nonEmpty, () => api('GET', '/v1/deployments', undefined, T));
  await step('GET /v1/machines', nonEmpty, () => api('GET', '/v1/machines', undefined, T));
  await step('GET /v1/operators', nonEmpty, () => api('GET', '/v1/operators', undefined, T));
  await step('GET /v1/expenses', nonEmpty, () => api('GET', '/v1/expenses', undefined, T));
  await step('GET /v1/fuel-downtime/fuel-logs', nonEmpty, () => api('GET', '/v1/fuel-downtime/fuel-logs', undefined, T));
  await step('GET /v1/fuel-downtime/downtime', nonEmpty, () => api('GET', '/v1/fuel-downtime/downtime', undefined, T));
  await step('GET /v1/client-money/events', nonEmpty, () => api('GET', '/v1/client-money/events', undefined, T));
  await step('GET /v1/alerts', ok2xx, () => api('GET', '/v1/alerts', undefined, T));
  await step('GET /v1/insights/ai', ok2xx, () => api('GET', '/v1/insights/ai', undefined, T));
  await step('GET /v1/reports/projection-inputs', ok2xx, () => api('GET', '/v1/reports/projection-inputs', undefined, T));
  await step('GET /v1/reports/projections', ok2xx, () => api('GET', '/v1/reports/projections', undefined, T));
  await step('GET /v1/tenants/settings (object, not array)', (r) =>
    ok2xx(r) && r.data && typeof r.data === 'object' && !Array.isArray(r.data), () => api('GET', '/v1/tenants/settings', undefined, T));

  // ── audit + users (FIX2, FIX3) ──────────────────────────────────────
  section = 'audit + users';
  await step('GET /v1/audit non-empty after writes (FIX2)', nonEmpty, () => api('GET', '/v1/audit', undefined, T));
  await step('audit rows carry the acting user (FIX2)', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((row) => row.user_id), () => api('GET', '/v1/audit', undefined, T));
  await step('GET /v1/users (audit filter, FIX3)', (r) => r.status === 200 && Array.isArray(r.data) && r.data.length >= 1, () =>
    api('GET', '/v1/users', undefined, T));

  // ── edits + import/export ───────────────────────────────────────────
  section = 'edits + import/export';
  await step('PATCH /v1/clients/:id', ok2xx, () =>
    api('PATCH', `/v1/clients/${ids.client}`, { contact: 'Ravi Kumar (updated)' }, T));
  await step('PATCH /v1/machines/:id/meter', ok2xx, () =>
    api('PATCH', `/v1/machines/${ids.m1}/meter`, { meter: 1085 }, T));
  await step('POST /v1/import/clients (CSV)', ok2xx, () =>
    api('POST', '/v1/import/clients', { csv: 'name,contact,phone\nPipeline Imported Ltd,Meera,+91 90000 00003\n' }, T));
  await step('imported client visible', (r) => ok2xx(r) && Array.isArray(r.data) && r.data.length >= 2, () =>
    api('GET', '/v1/clients', undefined, T));
  await step('GET /v1/export?type=machines', ok2xx, () => api('GET', '/v1/export?type=machines', undefined, T));
  await step('GET /v1/export?type=billing', ok2xx, () => api('GET', '/v1/export?type=billing', undefined, T));

  // ── negative path (FIX6 log hookup) ─────────────────────────────────
  section = 'error handling';
  await step('unexpected DB failure returns generic 500 envelope (FIX6)', (r) => r.status === 500, () =>
    api('POST', '/v1/maintenance/tasks', { machine_id: '00000000-0000-4000-8000-000000000000', name: 'boom', trigger: 'calendar', interval_value: 1, client_uuid: uuid() }, T));
  await step('500 body has no internals leaked', (r) =>
    r.status === 500 && r.data && r.data.detail === 'An unexpected error occurred', () =>
    api('POST', '/v1/maintenance/tasks', { machine_id: '00000000-0000-4000-8000-000000000000', name: 'boom2', trigger: 'calendar', interval_value: 1, client_uuid: uuid() }, T));

  report();
})();

function report() {
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(96)}`);
  console.log(`E2E SUITE: ${pass}/${results.length} passed   (tenant: ${TENANT})`);
  console.log('='.repeat(96));
  let lastSection = '';
  for (const r of results) {
    const [sec] = r.name.split(' › ');
    if (sec !== lastSection) { console.log(`── ${sec} ──`); lastSection = sec; }
    console.log(`${r.ok ? ' PASS' : '* FAIL'}  [${String(r.status)}]  ${r.name.split(' › ')[1]}${r.detail ? `\n         → ${r.detail}` : ''}`);
  }
  if (fail.length) console.log(`\n${fail.length} failing step(s) marked with *`);
  process.exitCode = fail.length ? 1 : 0;
}
