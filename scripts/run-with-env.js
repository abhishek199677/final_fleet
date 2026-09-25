#!/usr/bin/env node
/**
 * Run a command with the repo-root .env loaded into the environment.
 *
 * - Existing process env always wins (CI job-level DATABASE_URL keeps working).
 * - If DATABASE_URL_DIRECT is set, the child's DATABASE_URL points at the
 *   direct (non-pooler) endpoint: CLI tools — migrations, seeds, linters,
 *   one-shot test scripts — should not go through pgBouncer transaction
 *   pooling, while the long-running API uses the pooler via DATABASE_URL.
 *
 * Usage: node scripts/run-with-env.js <command> [...args]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
// Capture BEFORE .env load: a caller-provided DATABASE_URL (pipeline's
// disposable e2e DB, CI job env) must win completely — no direct-endpoint swap.
const callerDbUrl = process.env.DATABASE_URL;
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

if (process.env.DATABASE_URL_DIRECT && !callerDbUrl) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_DIRECT;
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: run-with-env.js <command> [...args]');
  process.exit(2);
}

const child = spawn(cmd, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
child.on('error', (err) => {
  console.error(`failed to run ${cmd}: ${err.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : code ?? 0);
});
