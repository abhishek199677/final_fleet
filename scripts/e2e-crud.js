#!/usr/bin/env node
/**
 * Fleet OS edit/delete suite — the CRUD stage of `pnpm pipeline`.
 *
 * `e2e-pipeline.js` proves a workspace can be *built*; this suite proves it can
 * be *maintained*: every resource a fresh tenant can create can also be edited
 * and removed, and nothing silently 500s on the way.
 *
 * Two record families, two guarantees:
 *
 *   config  (categories, tasks, accounts, rate cards, alert rules, tickets)
 *           plain UPDATE/DELETE — 409 while referenced, 400 on unknown or
 *           empty fields, 404 when already gone.
 *   money   (expenses, sessions, fuel, downtime, visits, counts, charges,
 *           receipts)  never edited in place: a correction mints a NEW id and
 *           retires the old one, a void retires the current version and
 *           stamps the reason. Both must vanish from every `is_current` read.
 *
 * Usage:  E2E_BASE_URL=http://localhost:3011 node scripts/e2e-crud.js
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

const EMAIL = `crud-${STAMP}@fleetos.test`;
const TENANT = `CRUD Co ${STAMP}`;
const PASSWORD = 'Pipeline!1234';

/**
 * Full lifecycle for a versioned (money/ops) record:
 * create → listed → corrections mints a new id → old gone / new present →
 * void needs a reason → void retires it → it leaves the list.
 */
async function versionedFlow(T, { label, list, createPath, createBody, existingId, correctBody, verify }) {
  let id = existingId;
  if (!id) {
    const created = await step(`${label}: create`, ok2xx, () => api('POST', createPath, createBody, T));
    id = created.data && created.data.id;
    if (!id) return null;
  }

  await step(`${label}: listed while current`, (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((x) => x.id === id),
    () => api('GET', list, undefined, T));

  const corrPath = `${createPath}/${id}/corrections`;
  const corr = await step(`${label}: correction mints a NEW id`, (r) =>
    ok2xx(r) && r.data && typeof r.data.id === 'string' && r.data.id !== id,
    () => api('POST', corrPath, { client_uuid: uuid(), ...(correctBody || {}) }, T));
  const corrId = corr.data && corr.data.id;
  if (!corrId) return id;

  await step(`${label}: list shows new version, hides superseded one`, (r) =>
    ok2xx(r) && r.data.some((x) => x.id === corrId) && !r.data.some((x) => x.id === id),
    () => api('GET', list, undefined, T));

  if (verify) {
    await step(`${label}: corrected value is what the list serves`, verify,
      () => api('GET', list, undefined, T));
  }

  const voidPath = `${createPath}/${corrId}/void`;
  await step(`${label}: void without a reason is rejected (400)`, (r) => r.status === 400,
    () => api('POST', voidPath, {}, T));

  const voided = await step(`${label}: void retires the current version`, (r) =>
    ok2xx(r) && r.data && r.data.id === corrId && r.data.is_current === false,
    () => api('POST', voidPath, { reason: 'CRUD suite cleanup' }, T));
  if (!ok2xx(voided)) return corrId;

  await step(`${label}: voided row leaves the list`, (r) =>
    ok2xx(r) && Array.isArray(r.data) && !r.data.some((x) => x.id === corrId),
    () => api('GET', list, undefined, T));

  return corrId;
}

(async () => {
  // ── provision ───────────────────────────────────────────────────────
  await step('GET /v1/health', ok2xx, () => api('GET', '/v1/health'));
  const reg = await step('POST /v1/auth/register (own tenant)', (r) => ok2xx(r) && !!r.data.token, () =>
    api('POST', '/v1/auth/register', { email: EMAIL, password: PASSWORD, tenant_name: TENANT }));
  const login = await step('POST /v1/auth/login', (r) => ok2xx(r) && !!r.data.token, () =>
    api('POST', '/v1/auth/login', { email: EMAIL, password: PASSWORD }));
  const T = login.data && login.data.token;
  if (!T) { report(); return; }

  // ── master data (everything below hangs off these) ──────────────────
  section = 'master data';
  const client = await step('POST /v1/clients', ok2xx, () =>
    api('POST', '/v1/clients', { name: `CRUD Client ${STAMP}`, currency: 'INR', payment_terms_days: 30, client_uuid: uuid() }, T));
  ids.client = client.data && client.data.id;

  const site = await step('POST /v1/sites', ok2xx, () =>
    api('POST', '/v1/sites', { name: `CRUD Site ${STAMP}`, client_id: ids.client, start_date: day(-30), client_uuid: uuid() }, T));
  ids.site = site.data && site.data.id;

  const mach = await step('POST /v1/machines', ok2xx, () =>
    api('POST', '/v1/machines', { code: `CR-EXC-${STAMP}`, type: 'excavator', make: 'Caterpillar', model: '320', year: 2022, primary_meter_type: 'hours', meter_unit_label: 'hrs', client_uuid: uuid() }, T));
  ids.m1 = mach.data && mach.data.id;

  // A second machine is deployed purely so its DELETE can be refused as in-use.
  const mach2 = await step('POST /v1/machines (deployed one, for the FK refusal)', ok2xx, () =>
    api('POST', '/v1/machines', { code: `CR-JCB-${STAMP}`, type: 'backhoe', make: 'JCB', model: '3DX', year: 2021, primary_meter_type: 'hours', meter_unit_label: 'hrs', client_uuid: uuid() }, T));
  ids.m2 = mach2.data && mach2.data.id;

  const op = await step('POST /v1/operators', ok2xx, () =>
    api('POST', '/v1/operators', { name: 'CRUD Operator', phone: '+91 98000 00011', client_uuid: uuid() }, T));
  ids.op = op.data && op.data.id;

  const dep = await step('POST /v1/deployments', ok2xx, () =>
    api('POST', '/v1/deployments', { machine_id: ids.m1, site_id: ids.site, start_date: day(-20), client_uuid: uuid() }, T));
  ids.dep = dep.data && dep.data.id;

  const dep2 = await step('POST /v1/deployments (on the FK-check machine)', ok2xx, () =>
    api('POST', '/v1/deployments', { machine_id: ids.m2, site_id: ids.site, start_date: day(-20), client_uuid: uuid() }, T));
  ids.dep2 = dep2.data && dep2.data.id;

  const cats = await step('GET /v1/expenses/categories (seeded)', nonEmpty, () => api('GET', '/v1/expenses/categories', undefined, T));
  ids.cat = Array.isArray(cats.data) && cats.data.length ? cats.data[0].id : null;

  const accts = await step('GET /v1/cash/accounts (seeded)', nonEmpty, () => api('GET', '/v1/cash/accounts', undefined, T));
  ids.acct = Array.isArray(accts.data) && accts.data.length ? accts.data[0].id : null;

  // ── config CRUD ─────────────────────────────────────────────────────
  section = 'config › expense category';

  const a = await step('create', ok2xx, () =>
    api('POST', '/v1/expenses/categories', { name: `CRUD Cat ${STAMP}` }, T));
  ids.catA = a.data && a.data.id;

  await step('create rejects a duplicate name (409)', (r) => r.status === 409, () =>
    api('POST', '/v1/expenses/categories', { name: `CRUD Cat ${STAMP}` }, T));

  await step('PATCH renames it', (r) =>
    ok2xx(r) && String(r.data.name) === `CRUD Cat Renamed ${STAMP}`, () =>
    api('PATCH', `/v1/expenses/categories/${ids.catA}`, { name: `CRUD Cat Renamed ${STAMP}` }, T));

  await step('rename is visible in the list', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((c) => c.id === ids.catA && c.name === `CRUD Cat Renamed ${STAMP}`),
    () => api('GET', '/v1/expenses/categories', undefined, T));

  await step('PATCH unknown field → 400 (not 500)', (r) => r.status === 400,
    () => api('PATCH', `/v1/expenses/categories/${ids.catA}`, { nope: 'x' }, T));

  await step('PATCH id → 400 (system column)', (r) => r.status === 400,
    () => api('PATCH', `/v1/expenses/categories/${ids.catA}`, { id: uuid() }, T));

  await step('PATCH name=null on NOT NULL → 400', (r) => r.status === 400,
    () => api('PATCH', `/v1/expenses/categories/${ids.catA}`, { name: null }, T));

  await step('PATCH malformed uuid → 400 (not 500)', (r) => r.status === 400,
    () => api('PATCH', '/v1/expenses/categories/not-a-uuid', { name: 'x' }, T));

  await step('PATCH unknown id → 404', (r) => r.status === 404,
    () => api('PATCH', `/v1/expenses/categories/${uuid()}`, { name: 'x' }, T));

  await step('DELETE unknown id → 404', (r) => r.status === 404,
    () => api('DELETE', `/v1/expenses/categories/${uuid()}`, undefined, T));

  await step('DELETE removes it', ok2xx, () =>
    api('DELETE', `/v1/expenses/categories/${ids.catA}`, undefined, T));

  await step('DELETE twice → 404', (r) => r.status === 404, () =>
    api('DELETE', `/v1/expenses/categories/${ids.catA}`, undefined, T));

  await step('deleted name is gone from the list', (r) =>
    ok2xx(r) && Array.isArray(r.data) && !r.data.some((c) => c.id === ids.catA),
    () => api('GET', '/v1/expenses/categories', undefined, T));

  // Referenced config refuses the delete instead of orphaning the expense.
  section = 'config › referenced rows';
  const b = await step('create a category an expense will use', ok2xx, () =>
    api('POST', '/v1/expenses/categories', { name: `CRUD InUse ${STAMP}` }, T));
  ids.catB = b.data && b.data.id;
  await step('expense referencing it', ok2xx, () =>
    api('POST', '/v1/expenses', {
      date: day(-1), category_id: ids.catB, description: 'references CRUD category', currency: 'INR',
      amount_minor: 10000, base_minor: 10000, paid_by: 'owner', allocation_type: 'site',
      site_id: ids.site, client_uuid: uuid(),
    }, T));
  await step('DELETE category still in use → 409 (FK)', (r) => r.status === 409, () =>
    api('DELETE', `/v1/expenses/categories/${ids.catB}`, undefined, T));
  await step('category survives the refused delete', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((c) => c.id === ids.catB),
    () => api('GET', '/v1/expenses/categories', undefined, T));

  // Deployments and rate cards fall away with the machine; financial history
  // does not (asserted at the end, once m1 has some).
  await step('DELETE deployed machine with no money history → 200', (r) =>
    ok2xx(r) && r.data && r.data.deleted === true, () =>
    api('DELETE', `/v1/machines/${ids.m2}`, undefined, T));
  await step('its deployment went with it', (r) =>
    ok2xx(r) && Array.isArray(r.data) && !r.data.some((d) => d.id === ids.dep2), () =>
    api('GET', '/v1/deployments', undefined, T));

  section = 'config › maintenance task';
  const task = await step('create', ok2xx, () =>
    api('POST', '/v1/maintenance/tasks', { machine_id: ids.m1, name: `CRUD Oil ${STAMP}`, trigger: 'meter', interval_value: 250, warning_value: 20, client_uuid: uuid() }, T));
  ids.task = task.data && task.data.id;

  await step('PATCH retunes the interval', (r) =>
    ok2xx(r) && Number(r.data.interval_value) === 300, () =>
    api('PATCH', `/v1/maintenance/tasks/${ids.task}`, { interval_value: 300 }, T));

  await step('PATCH trigger outside CHECK → 400 (23514)', (r) => r.status === 400,
    () => api('PATCH', `/v1/maintenance/tasks/${ids.task}`, { trigger: 'whenever' }, T));

  await step('DELETE removes it', ok2xx, () =>
    api('DELETE', `/v1/maintenance/tasks/${ids.task}`, undefined, T));

  section = 'config › cash account';
  const acct = await step('create', ok2xx, () =>
    api('POST', '/v1/cash/accounts', { name: `CRUD Bank ${STAMP}`, type: 'bank', currency: 'INR' }, T));
  ids.acctNew = acct.data && acct.data.id;

  await step('PATCH renames it', (r) =>
    ok2xx(r) && String(r.data.name) === `CRUD Bank Renamed ${STAMP}`, () =>
    api('PATCH', `/v1/cash/accounts/${ids.acctNew}`, { name: `CRUD Bank Renamed ${STAMP}` }, T));

  await step('DELETE removes it', ok2xx, () =>
    api('DELETE', `/v1/cash/accounts/${ids.acctNew}`, undefined, T));

  section = 'config › rate card';
  const rc = await step('create', ok2xx, () =>
    api('POST', '/v1/billing/rate-cards', { deployment_id: ids.dep, effective_from: day(-20), strategy: 'hourly', rate_minor: 1500, currency: 'INR', min_units_per_day: 0, client_uuid: uuid() }, T));
  ids.rc = rc.data && rc.data.id;

  await step('PATCH reprices it', (r) =>
    ok2xx(r) && Number(r.data.rate_minor) === 1750, () =>
    api('PATCH', `/v1/billing/rate-cards/${ids.rc}`, { rate_minor: 1750 }, T));

  await step('PATCH strategy outside CHECK → 400', (r) => r.status === 400,
    () => api('PATCH', `/v1/billing/rate-cards/${ids.rc}`, { strategy: 'fortnightly' }, T));

  await step('DELETE removes it', ok2xx, () =>
    api('DELETE', `/v1/billing/rate-cards/${ids.rc}`, undefined, T));

  section = 'config › alert rule';
  const rule = await step('create', ok2xx, () =>
    api('POST', '/v1/alerts/rules', { rule_type: 'ocr_mismatch', threshold: 5, threshold_unit: 'percent', is_active: true, client_uuid: uuid() }, T));
  ids.rule = rule.data && rule.data.id;

  await step('duplicate rule_type → 409 (unique per tenant)', (r) => r.status === 409,
    () => api('POST', '/v1/alerts/rules', { rule_type: 'ocr_mismatch', threshold: 9, client_uuid: uuid() }, T));

  await step('PATCH threshold', (r) =>
    ok2xx(r) && Number(r.data.threshold) === 12, () =>
    api('PATCH', `/v1/alerts/rules/${ids.rule}`, { threshold: 12 }, T));

  await step('DELETE removes it', ok2xx, () =>
    api('DELETE', `/v1/alerts/rules/${ids.rule}`, undefined, T));

  section = 'config › support ticket';
  const tk = await step('create', ok2xx, () =>
    api('POST', '/v1/support/tickets', { subject: `CRUD ticket ${STAMP}`, description: 'created by the CRUD suite' }, T));
  ids.tk = tk.data && tk.data.id;

  await step('PATCH resolves it', (r) =>
    ok2xx(r) && r.data.status === 'resolved', () =>
    api('PATCH', `/v1/support/tickets/${ids.tk}`, { status: 'resolved' }, T));

  await step('PATCH bad status → 400', (r) => r.status === 400,
    () => api('PATCH', `/v1/support/tickets/${ids.tk}`, { status: 'supercalifragilistic' }, T));

  await step('DELETE removes it', ok2xx, () =>
    api('DELETE', `/v1/support/tickets/${ids.tk}`, undefined, T));

  // ── users (invite → edit → deactivate → reactivate) ─────────────────
  section = 'config › users';
  const inv = await step('POST /v1/users/invite (with a password)', (r) => ok2xx(r) && !!r.data.id && !!r.data.invite_token, () =>
    api('POST', '/v1/users/invite', { email: `crud-user-${STAMP}@fleetos.test`, name: 'CRUD Invitee', role: 'ops', password: PASSWORD }, T));
  ids.user = inv.data && inv.data.id;

  await step('invitee appears in GET /v1/users', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((u) => u.id === ids.user),
    () => api('GET', '/v1/users', undefined, T));

  await step('invitee can sign in before any edit', (r) => ok2xx(r) && !!r.data.token, () =>
    api('POST', '/v1/auth/login', { email: `crud-user-${STAMP}@fleetos.test`, password: PASSWORD }));

  await step('PUT renames and re-roles the invitee', (r) =>
    ok2xx(r) && String(r.data.name) === 'CRUD Invitee Renamed' && r.data.role === 'owner', () =>
    api('PUT', `/v1/users/${ids.user}`, { name: 'CRUD Invitee Renamed', role: 'owner' }, T));

  await step('PUT role outside owner|ops → 400 (users_role_check)', (r) => r.status === 400, () =>
    api('PUT', `/v1/users/${ids.user}`, { role: 'admin' }, T));

  await step('PUT blank name → 400', (r) => r.status === 400, () =>
    api('PUT', `/v1/users/${ids.user}`, { name: '   ' }, T));

  await step('PUT /users/:id/deactivate', (r) =>
    ok2xx(r) && r.data.is_active === false, () =>
    api('PUT', `/v1/users/${ids.user}/deactivate`, {}, T));

  await step('deactivated invitee cannot sign in', (r) => r.status === 401 || r.status === 403, () =>
    api('POST', '/v1/auth/login', { email: `crud-user-${STAMP}@fleetos.test`, password: PASSWORD }));

  await step('PUT /users/:id/reactivate', (r) =>
    ok2xx(r) && r.data.is_active === true, () =>
    api('PUT', `/v1/users/${ids.user}/reactivate`, {}, T));

  await step('reactivated invitee can sign in again', (r) => ok2xx(r) && !!r.data.token, () =>
    api('POST', '/v1/auth/login', { email: `crud-user-${STAMP}@fleetos.test`, password: PASSWORD }));

  await step('PUT unknown user → 404', (r) => r.status === 404, () =>
    api('PUT', `/v1/users/${uuid()}`, { name: 'ghost' }, T));

  // ── money records: correct + void ───────────────────────────────────
  section = 'money › expenses';
  await versionedFlow(T, {
    label: 'expense',
    list: '/v1/expenses',
    createPath: '/v1/expenses',
    createBody: {
      date: day(-1), category_id: ids.cat, description: 'CRUD suite expense', currency: 'INR',
      amount_minor: 50000, base_minor: 50000, paid_by: 'owner', allocation_type: 'site',
      site_id: ids.site, client_uuid: uuid(),
    },
    correctBody: { amount_minor: 51000, base_minor: 51000 },
    verify: (r) => ok2xx(r) && Array.isArray(r.data) &&
      r.data.filter((x) => x.description === 'CRUD suite expense').every((x) => Number(x.amount_minor) === 51000),
  });

  section = 'money › work session';
  const ws = await step('start session', ok2xx, () =>
    api('POST', '/v1/work-sessions', {
      machine_id: ids.m1, deployment_id: ids.dep, operator_id: ids.op,
      start_at: iso(-1, 8), start_meter: 2000, client_uuid: uuid(),
    }, T));
  const wsId = ws.data && ws.data.id;
  await step('end session', ok2xx, () =>
    api('POST', `/v1/work-sessions/${wsId}/end`, { end_at: iso(-1, 17), end_meter: 2080, units_run: 80 }, T));
  const cur = await step('resolve current version after /end', nonEmpty, () =>
    api('GET', '/v1/work-sessions', undefined, T));
  // /end supersedes and issues a NEW current id — resolve it the way the UI list does.
  const current = Array.isArray(cur.data) && cur.data[0];
  await versionedFlow(T, {
    label: 'work session',
    list: '/v1/work-sessions',
    createPath: '/v1/work-sessions',
    existingId: current && current.id,
    correctBody: { notes: 'CRUD suite correction' },
  });

  section = 'money › fuel log';
  await versionedFlow(T, {
    label: 'fuel log',
    list: '/v1/fuel-downtime/fuel-logs',
    createPath: '/v1/fuel-downtime/fuel-logs',
    createBody: { machine_id: ids.m1, work_session_id: current && current.id, litres: 30, cost_minor: 3150, currency: 'INR', client_uuid: uuid() },
  });

  section = 'money › downtime';
  await versionedFlow(T, {
    label: 'downtime segment',
    list: '/v1/fuel-downtime/downtime',
    createPath: '/v1/fuel-downtime/downtime',
    createBody: { machine_id: ids.m1, started_at: iso(-3, 11), ended_at: iso(-3, 13), reason_code: 'breakdown', note: 'CRUD suite downtime', client_uuid: uuid() },
  });

  section = 'money › maintenance visit';
  await versionedFlow(T, {
    label: 'maintenance visit',
    list: `/v1/maintenance/machines/${ids.m1}/visits`,
    createPath: '/v1/maintenance/visits',
    createBody: { machine_id: ids.m1, visit_date: day(-5), visit_type: 'scheduled', mechanic: 'In-house', meter_at_visit: 2050, client_uuid: uuid() },
  });

  section = 'money › cash count';
  await versionedFlow(T, {
    label: 'cash count',
    list: `/v1/cash/accounts/${ids.acct}/counts`,
    createPath: '/v1/cash/counts',
    createBody: { cash_account_id: ids.acct, count_date: day(-1), counted: { notes: 200, coins: 50 }, client_uuid: uuid() },
  });

  section = 'money › extra charge';
  await versionedFlow(T, {
    label: 'extra charge',
    list: '/v1/billing/extra-charges',
    createPath: '/v1/billing/extra-charges',
    createBody: { deployment_id: ids.dep, kind: 'other', date: day(-2), currency: 'INR', amount_minor: 25000, note: 'CRUD suite charge', client_uuid: uuid() },
  });

  section = 'money › client money event';
  await versionedFlow(T, {
    label: 'client money event',
    list: '/v1/client-money/events',
    createPath: '/v1/client-money/events',
    createBody: { client_id: ids.client, site_id: ids.site, event_type: 'receipt', currency: 'INR', amount_minor: 75000, base_minor: 75000, mode: 'bank', event_date: day(-2), client_uuid: uuid() },
  });

  section = 'money › guards';
  const guard = await step('expense for the guards', ok2xx, () =>
    api('POST', '/v1/expenses', {
      date: day(-2), category_id: ids.cat, description: 'CRUD guard expense', currency: 'INR',
      amount_minor: 1000, base_minor: 1000, paid_by: 'owner', allocation_type: 'site',
      site_id: ids.site, client_uuid: uuid(),
    }, T));
  const guardId = guard.data && guard.data.id;

  await step('corrections with unknown field → 400', (r) => r.status === 400, () =>
    api('POST', `/v1/expenses/${guardId}/corrections`, { nope: 'x', client_uuid: uuid() }, T));
  await step('corrections with null on NOT NULL → 400', (r) => r.status === 400, () =>
    api('POST', `/v1/expenses/${guardId}/corrections`, { date: null, client_uuid: uuid() }, T));
  await step('corrections on unknown id → 404', (r) => r.status === 404, () =>
    api('POST', `/v1/expenses/${uuid()}/corrections`, { client_uuid: uuid() }, T));
  await step('corrections with malformed id → 400 (not 500)', (r) => r.status === 400, () =>
    api('POST', '/v1/expenses/not-a-uuid/corrections', { client_uuid: uuid() }, T));
  await step('void with malformed id → 400 (not 500)', (r) => r.status === 400, () =>
    api('POST', '/v1/expenses/not-a-uuid/void', { reason: 'x' }, T));
  await step('void on unknown id → 404', (r) => r.status === 404, () =>
    api('POST', `/v1/expenses/${uuid()}/void`, { reason: 'x' }, T));
  await step('void with a blank reason → 400', (r) => r.status === 400, () =>
    api('POST', `/v1/expenses/${guardId}/void`, { reason: '   ' }, T));

  // ── deleting a machine must not take its financial history with it ───
  section = 'guards › machine delete';
  // A live (non-voided) row, so "survived" is observable through the API.
  const live = await step('a live fuel log exists', ok2xx, () =>
    api('POST', '/v1/fuel-downtime/fuel-logs', {
      machine_id: ids.m1, work_session_id: current && current.id,
      litres: 10, cost_minor: 1050, currency: 'INR', client_uuid: uuid(),
    }, T));
  const liveId = live.data && live.data.id;

  await step('DELETE machine that has history → 409', (r) => r.status === 409, () =>
    api('DELETE', `/v1/machines/${ids.m1}`, undefined, T));
  await step('the refusal names what would be lost', (r) =>
    r.status === 409 && typeof r.data?.detail === 'string' &&
      r.data.detail.includes('financial history') &&
      ['fuel logs', 'work sessions', 'maintenance visits'].some((l) => r.data.detail.includes(l)),
    () => api('DELETE', `/v1/machines/${ids.m1}`, undefined, T));
  await step('the machine survived the refused delete', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((m) => m.id === ids.m1), () =>
    api('GET', '/v1/machines', undefined, T));
  await step('its fuel history survived too', (r) =>
    ok2xx(r) && Array.isArray(r.data) && r.data.some((f) => f.id === liveId), () =>
    api('GET', '/v1/fuel-downtime/fuel-logs', undefined, T));

  report();
})();

function report() {
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(96)}`);
  console.log(`CRUD SUITE: ${pass}/${results.length} passed   (tenant: ${TENANT})`);
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
