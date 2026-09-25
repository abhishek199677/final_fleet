#!/usr/bin/env node
/**
 * One-command local end-to-end pipeline:      pnpm pipeline
 *
 * Proves the whole product works without touching your demo data. Every run
 * uses a DISPOSABLE database (`fleetos_e2e`) — your `fleetos` database and
 * the running dev stack on :3000/:3001 are never modified.
 *
 * Stages:
 *   1  typecheck    repo-wide tsc
 *   2  lint         eslint (errors fail, warnings reported)
 *   3  reset-db     drop + recreate fleetos_e2e
 *   4  migrate      all migrations -> fleetos_e2e
 *   5  seed         demo tenant, categories, cash account, sample rows
 *   6  unit-tests   vitest unit + integration (read-only DB assertions)
 *   7  db-lint      migration linter (WARN-only until the known finance-grant
 *                   debt is closed — same policy as ci.yml continue-on-error)
 *   8  build-api    nest build
 *   9  start-api    API on :3011 against fleetos_e2e (log: .pipeline-api.log)
 *  10  e2e-api      scripts/e2e-pipeline.js — registers its own tenant and
 *                   walks provision -> ops -> billing -> audit (~65 checks,
 *                   includes all seven wiring-fix assertions)
 *  11  error-log    the forced 500 must be visible in the API log
 *  12  teardown     stop the pipeline API
 *
 * Exit code 0 only when no stage FAILed.
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const E2E_DB = 'fleetos_e2e';
const E2E_URL = `postgresql://postgres:postgres@localhost:5432/${E2E_DB}`;
const API_PORT = process.env.PIPELINE_API_PORT || '3011';
const API_LOG = path.join(ROOT, '.pipeline-api.log');

const stages = [];
let apiProc = null;

function sh(cmd, args, env) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: env || process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  return { code: r.status === null ? 1 : r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function tail(text, n = 30) {
  return text.split('\n').filter(Boolean).slice(-n).join('\n');
}

/** Run a (possibly async) stage fn returning { ok, note, warn, output }. Never throws. */
async function stage(name, fn) {
  const t0 = Date.now();
  process.stdout.write(`\n━━ ${name}\n`);
  let res;
  try {
    res = (await fn()) || {};
  } catch (e) {
    res = { ok: false, output: e.stack || String(e) };
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const status = res.ok ? (res.warn ? 'WARN' : 'PASS') : 'FAIL';
  stages.push({ name, status, secs, note: res.note || '' });
  console.log(`   ${status} ${name} (${secs}s)${res.note ? ` — ${res.note}` : ''}`);
  if (!res.ok && res.output) console.log(tail(res.output));
  return res.ok;
}

function loadPg() {
  // pg is a dependency of the workspace packages, not of the repo root.
  const resolved = require.resolve('pg', {
    paths: [path.join(ROOT, 'packages/db'), path.join(ROOT, 'packages/api'), ROOT],
  });
  return require(resolved);
}

async function resetDatabase() {
  const { Client } = loadPg();
  let lastErr;
  for (const dbName of ['postgres', 'fleetos']) {
    const c = new Client({
      host: 'localhost', port: 5432, database: dbName, user: 'postgres', password: 'postgres',
    });
    try {
      await c.connect();
      await c.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [E2E_DB],
      );
      await c.query(`DROP DATABASE IF EXISTS ${E2E_DB}`);
      await c.query(`CREATE DATABASE ${E2E_DB}`);
      await c.end();
      return { ok: true, note: `${E2E_DB} recreated (fleetos untouched)` };
    } catch (e) {
      lastErr = e;
      try { await c.end(); } catch { /* ignore */ }
    }
  }
  return { ok: false, output: String(lastErr) };
}

async function waitForHealth(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startApi() {
  fs.writeFileSync(API_LOG, `# pipeline API log ${new Date().toISOString()}\n`);
  const out = fs.openSync(API_LOG, 'a');
  const env = { ...process.env, PORT: API_PORT, DB_NAME: E2E_DB, JWT_SECRET: 'pipeline-secret', DATABASE_URL: E2E_URL };
  // DATABASE_URL must win: .env points at the demo (Neon) database and
  // load-env only fills unset vars. E2E_URL is local with no sslmode, so
  // DatabaseService's SSL branch stays off.
  apiProc = spawn('node', ['dist/main'], {
    cwd: path.join(ROOT, 'packages/api'),
    env,
    stdio: ['ignore', out, out],
  });
  apiProc.on('error', (e) => console.log(`   API spawn error: ${e.message}`));
}

function stopApi() {
  if (!apiProc || apiProc.exitCode !== null) { apiProc = null; return; }
  apiProc.kill('SIGTERM');
  const killer = setTimeout(() => {
    if (apiProc && apiProc.exitCode === null) apiProc.kill('SIGKILL');
  }, 3000);
  killer.unref();
}

process.on('SIGINT', () => { stopApi(); process.exit(130); });
process.on('SIGTERM', () => { stopApi(); process.exit(143); });

(async function main() {
  console.log(`Fleet OS pipeline — disposable DB: ${E2E_DB}  API port: ${API_PORT}`);

  let ok = true;

  ok = await stage('typecheck', () => {
    const r = sh('pnpm', ['typecheck']);
    return { ok: r.code === 0, output: r.out };
  }) && ok;

  ok = await stage('lint', () => {
    const r = sh('pnpm', ['lint']);
    const m = r.out.match(/(\d+) problems \((\d+) errors?, (\d+) warnings?\)/);
    const note = m ? `${m[2]} errors, ${m[3]} warnings` : '';
    return { ok: r.code === 0, note, output: r.out };
  }) && ok;

  // No point building/testing on a broken tree.
  if (!ok) return report(1);

  ok = await stage('reset-db', () => resetDatabase()) && ok;
  if (!ok) return report(1);

  ok = await stage('migrate', () => {
    const r = sh('pnpm', ['--filter', '@fleetos/db', 'migrate'], { ...process.env, DATABASE_URL: E2E_URL });
    return { ok: r.code === 0, output: r.out };
  }) && ok;

  ok = await stage('seed', () => {
    const env = { ...process.env, DB_NAME: E2E_DB, DATABASE_URL: E2E_URL };
    const r = sh('node', ['packages/db/seed.js'], env);
    return { ok: r.code === 0, output: r.out };
  }) && ok;

  ok = await stage('unit-tests', () => {
    const r = sh('pnpm', ['test'], { ...process.env, DATABASE_URL: E2E_URL });
    const m = r.out.match(/Tests\s+(.+)/);
    return { ok: r.code === 0, note: m ? m[1].trim() : '', output: r.out };
  }) && ok;

  await stage('db-lint', () => {
    // WARN-only: the finance-grant violations are known, accepted debt
    // (mirrors continue-on-error in ci.yml). Prints a reminder, never fails.
    const r = sh('node', ['packages/db/linters/migration-linter.js'], {
      ...process.env,
      DATABASE_URL: E2E_URL,
    });
    if (r.code === 0) return { ok: true, note: 'clean' };
    const count = (r.out.match(/•/g) || []).length || 'some';
    return {
      ok: true,
      warn: true,
      note: `${count} finding(s) — accepted finance-grant debt (see ci.yml TODO)`,
    };
  });

  ok = await stage('build-api', () => {
    const r = sh('pnpm', ['--filter', '@fleetos/api', 'build']);
    return { ok: r.code === 0, output: r.out };
  }) && ok;
  if (!ok) return report(1);

  ok = await stage('start-api', async () => {
    startApi();
    const healthy = await waitForHealth(`http://localhost:${API_PORT}/v1/health`);
    if (healthy) return { ok: true, note: `:${API_PORT} healthy, log: .pipeline-api.log` };
    try { apiProc.kill('SIGKILL'); } catch { /* ignore */ }
    return {
      ok: false,
      note: 'did not become healthy',
      output: fs.existsSync(API_LOG) ? fs.readFileSync(API_LOG, 'utf8') : 'no log',
    };
  }) && ok;
  if (!ok) return report(1);

  ok = await stage('e2e-api', () => {
    const r = sh('node', ['scripts/e2e-pipeline.js'], {
      ...process.env,
      E2E_BASE_URL: `http://localhost:${API_PORT}`,
    });
    console.log(r.out.replace(/\s+$/, ''));
    const m = r.out.match(/E2E SUITE: (\d+)\/(\d+) passed/);
    return { ok: r.code === 0, note: m ? `${m[1]}/${m[2]} checks` : '', output: r.out };
  }) && ok;

  ok = await stage('error-log', () => {
    const log = fs.existsSync(API_LOG) ? fs.readFileSync(API_LOG, 'utf8') : '';
    const logged = log.includes('Unhandled exception');
    return {
      ok: logged,
      note: logged ? 'forced 500 visible in API log (fix #6)' : 'no "Unhandled exception" line found',
      output: logged ? '' : log.slice(-2000),
    };
  }) && ok;

  await stage('teardown', () => {
    stopApi();
    return { ok: true, note: 'pipeline API stopped; fleetos_e2e kept for inspection' };
  });

  return report(ok ? 0 : 1);
})();

function report(code) {
  stopApi();
  console.log(`\n${'='.repeat(72)}`);
  console.log('PIPELINE REPORT');
  console.log('='.repeat(72));
  for (const s of stages) {
    const icon = s.status === 'PASS' ? '[ok]' : s.status === 'WARN' ? '[warn]' : '[FAIL]';
    console.log(`${icon} ${s.name.padEnd(14)} ${s.status.padEnd(5)} ${String(s.secs).padStart(6)}s${s.note ? `  ${s.note}` : ''}`);
  }
  const failed = stages.filter((s) => s.status === 'FAIL').length;
  const warned = stages.filter((s) => s.status === 'WARN').length;
  console.log('-'.repeat(72));
  console.log(
    code === 0
      ? `PIPELINE PASS${warned ? ` (${warned} warning stage)` : ''} — demo DB "fleetos" was never touched`
      : `PIPELINE FAIL — ${failed} stage(s) failed; see .pipeline-api.log for API output`,
  );
  process.exitCode = code;
}
