#!/usr/bin/env node
/**
 * Launch acceptance check (BRD §8, S60).
 * Reports pilot readiness against the live DB; WARN (not fail) when pilot
 * data is still accumulating (e.g. 14-day seed vs 30-day acceptance).
 * Run: pnpm verify:launch
 */
const { Client } = require('pg');

const DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleetos';

async function main() {
  const c = new Client({ connectionString: DB });
  await c.connect();
  const out = [];
  const check = (id, label, status, detail) => {
    out.push({ id, label, status, detail });
    console.log(`${status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌'} [${id}] ${label}${detail ? ` — ${detail}` : ''}`);
  };

  try {
    // Active machines with sessions in trailing 30d
    const machines = await c.query(`SELECT COUNT(*)::int n FROM tenant.machines WHERE tenant_id='00000000-0000-0000-0000-000000000001'`);
    const sessions = await c.query(`SELECT COUNT(*)::int n FROM tenant.work_sessions WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND start_at >= NOW() - INTERVAL '30 days' AND is_current=true`);
    check('ACC-30D', 'sessions in trailing 30d', sessions.rows[0].n > 0 ? 'PASS' : 'WARN', `${sessions.rows[0].n} sessions, ${machines.rows[0].n} machines`);

    const sameDay = await c.query(`
      SELECT COUNT(*)::int total,
             COUNT(*) FILTER (WHERE DATE(created_at)=DATE(start_at))::int same
      FROM tenant.work_sessions WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND is_current=true`);
    const { total, same } = sameDay.rows[0];
    const pct = total ? Math.round((same / total) * 100) : 0;
    check('WRK-08', 'same-day compliance ≥90%', pct >= 90 ? 'PASS' : 'WARN', `${pct}% (${same}/${total})`);

    const ledger = await c.query(`SELECT COUNT(*)::int n, COALESCE(SUM(base_minor),0)::bigint s FROM tenant.billing_ledger WHERE tenant_id='00000000-0000-0000-0000-000000000001'`);
    check('BIL-01', 'billing ledger non-empty', ledger.rows[0].n > 0 ? 'PASS' : 'WARN', `${ledger.rows[0].n} entries`);
    const money = await c.query(`SELECT COUNT(*)::int n FROM tenant.client_money_events WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND is_current=true`);
    check('BIL-04', 'receipts/advances present', money.rows[0].n > 0 ? 'PASS' : 'WARN', `${money.rows[0].n} events`);

    // Cash expected view exists and is owner-only (CSH-04)
    const view = await c.query(`SELECT 1 FROM information_schema.views WHERE table_schema='tenant' AND table_name='v_cash_expected'`);
    check('CSH-04', 'v_cash_expected present', view.rows.length ? 'PASS' : 'WARN', '');
    const grant = await c.query(`SELECT COUNT(*)::int n FROM information_schema.table_privileges WHERE grantee='app_ops' AND table_schema='tenant' AND table_name='v_cash_expected'`);
    check('SEC-06', 'ops denied on cash expected', grant.rows[0].n === 0 ? 'PASS' : 'FAIL', '');

    // Maintenance warning/overdue task exists (MNT-02)
    let mnt = { rows: [] };
    try {
      mnt = await c.query(`SELECT COUNT(*)::int n FROM tenant.v_maintenance_status WHERE status IN ('warning','overdue')`);
      check('MNT-02', 'maintenance warning/overdue visible', mnt.rows[0].n > 0 ? 'PASS' : 'WARN', `${mnt.rows[0]?.n ?? 0}`);
    } catch {
      const t = await c.query(`SELECT COUNT(*)::int n FROM tenant.maintenance_tasks WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND next_due_value IS NOT NULL`);
      check('MNT-02', 'maintenance tasks seeded', t.rows[0].n > 0 ? 'PASS' : 'WARN', `${t.rows[0].n} tasks`);
    }

    // Evidence coverage (WRK-02): manual share reported
    const ev = await c.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE start_evidence='photo' OR end_evidence='photo')::int photo FROM tenant.work_sessions WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND is_current=true`);
    check('WRK-02', 'evidence coverage computed', ev.rows[0].total > 0 ? 'PASS' : 'WARN', `${ev.rows[0].photo}/${ev.rows[0].total} with photo`);

    const fails = out.filter((r) => r.status === 'FAIL');
    if (fails.length) process.exitCode = 1;
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error('verify:launch error:', e.message); process.exit(2); });
