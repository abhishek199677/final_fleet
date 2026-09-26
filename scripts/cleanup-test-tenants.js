#!/usr/bin/env node
/**
 * Delete throwaway tenants from a database — the cleanup stage of a live run.
 *
 * `e2e-pipeline.js`, `e2e-crud.js` and `invite-test.js` each register their
 * own tenant so they can run against production without touching anyone's
 * data. That is exactly why they leave those tenants behind afterwards; this
 * script is what puts the database back to "only the tenants you meant to
 * keep".
 *
 * Rows are deleted in FK dependency order (children first) inside a single
 * transaction, and `tenant.audit_log` is drained last — `fn_audit` logs every
 * DELETE, so emptying it early would only refill it as the cleanup continues.
 *
 * Usage:
 *   node scripts/run-with-env.js node scripts/cleanup-test-tenants.js           # dry run
 *   node scripts/run-with-env.js node scripts/cleanup-test-tenants.js --yes     # commit
 *   KEEP_TENANTS='Demo Fleet Co,Acme' node ... cleanup-test-tenants.js --yes
 *
 * Exit code 0 only when the transaction completed (or nothing was pending).
 */
// pg lives in packages/db; scripts/ sits outside every package's node_modules.
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { Client } = require(require.resolve('pg', { paths: [path.join(ROOT, 'packages/db'), ROOT] }));

const KEEP = (process.env.KEEP_TENANTS || 'Demo Fleet Co')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const APPLY = process.argv.includes('--yes');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — run this through scripts/run-with-env.js');
    process.exit(1);
  }

  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=') ? { rejectUnauthorized: false } : false,
  });
  await c.connect();

  try {
    const all = (await c.query('SELECT id, name FROM platform.tenants ORDER BY created_at')).rows;
    const drop = all.filter((t) => !KEEP.includes(t.name));
    const keep = all.filter((t) => KEEP.includes(t.name));
    console.log(`tenants: ${all.length} — keep ${keep.length}, drop ${drop.length}`);
    for (const t of drop) console.log(`  DROP ${t.id}  ${t.name}`);
    for (const t of keep) console.log(`  KEEP ${t.id}  ${t.name}`);
    if (drop.length === 0) return;
    const ids = drop.map((t) => t.id);

    // Base tables carrying a tenant_id can all be scoped by one predicate.
    // (information_schema.columns also covers views — DELETE on those fails.)
    const tables = (await c.query(`
        SELECT c.table_schema||'.'||c.table_name AS t
          FROM information_schema.columns c
          JOIN information_schema.tables tb
            ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
         WHERE c.table_schema IN ('tenant','platform') AND c.column_name = 'tenant_id'
           AND tb.table_type = 'BASE TABLE'
         GROUP BY 1`))
      .rows.map((r) => r.t)
      .filter((t) => t !== 'platform.tenants');
    const set = new Set(tables);

    // child -> parent edges: the child must be emptied before its parent.
    const edges = (await c.query(`
        SELECT ch.conrelid::regclass::text AS child, ch.confrelid::regclass::text AS parent
          FROM pg_constraint ch
          JOIN pg_class cc ON cc.oid = ch.conrelid
          JOIN pg_namespace cn ON cn.oid = cc.relnamespace
          JOIN pg_class pc ON pc.oid = ch.confrelid
          JOIN pg_namespace pn ON pn.oid = pc.relnamespace
         WHERE ch.contype = 'f'
           AND cn.nspname IN ('tenant','platform') AND pn.nspname IN ('tenant','platform')`))
      .rows.map((r) => ({ child: r.child.replace(/"/g, ''), parent: r.parent.replace(/"/g, '') }))
      .filter((e) => set.has(e.child) && set.has(e.parent) && e.child !== e.parent);

    const after = new Map(tables.map((t) => [t, new Set()]));
    const indegree = new Map(tables.map((t) => [t, 0]));
    for (const e of edges) {
      if (!after.get(e.child).has(e.parent)) {
        after.get(e.child).add(e.parent);
        indegree.set(e.parent, indegree.get(e.parent) + 1);
      }
    }
    const ready = tables.filter((t) => indegree.get(t) === 0);
    const order = [];
    while (ready.length) {
      const t = ready.shift();
      order.push(t);
      for (const nxt of after.get(t)) {
        indegree.set(nxt, indegree.get(nxt) - 1);
        if (indegree.get(nxt) === 0) ready.push(nxt);
      }
    }
    if (order.length !== tables.length) {
      console.error(`FK cycle among: ${tables.filter((t) => !order.includes(t)).join(', ')}`);
      process.exit(1);
    }
    // fn_audit logs these deletes, so audit_log is drained last, right before
    // the tenant rows everything else hangs off.
    const auditAt = order.indexOf('tenant.audit_log');
    if (auditAt >= 0) {
      order.splice(auditAt, 1);
      order.push('tenant.audit_log');
    }
    order.push('platform.tenants');

    await c.query('BEGIN');
    try {
      const summary = [];
      for (const t of order) {
        const pred = t === 'platform.tenants' ? 'id' : 'tenant_id';
        const r = await c.query(`DELETE FROM ${t} WHERE ${pred} = ANY($1::uuid[])`, [ids]);
        if (r.rowCount) summary.push([t, r.rowCount]);
      }
      const ann = await c.query(
        'DELETE FROM platform.announcements WHERE target_tenant_id = ANY($1::uuid[])',
        [ids],
      );
      if (ann.rowCount) summary.push(['platform.announcements', ann.rowCount]);

      console.log('\nrows removed:');
      let total = 0;
      for (const [t, n] of summary) {
        console.log(`  ${String(n).padStart(6)}  ${t}`);
        total += n;
      }
      console.log(`  ${String(total).padStart(6)}  TOTAL`);

      const left = (await c.query('SELECT name FROM platform.tenants ORDER BY name')).rows;
      console.log(`\ntenants remaining: ${left.length} (${left.map((r) => r.name).join(', ')})`);

      if (APPLY) {
        await c.query('COMMIT');
        console.log('COMMITTED');
      } else {
        await c.query('ROLLBACK');
        console.log('dry run — rolled back (re-run with --yes)');
      }
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    }
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error('FAILED, rolled back:', e.message);
  process.exit(1);
});
