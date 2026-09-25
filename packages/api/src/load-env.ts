import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Load the repo-root .env into process.env.
 *
 * This MUST be a standalone module that entry points import *first*
 * (`import './load-env';`). Several modules read process.env at import time —
 * auth.service throws when JWT_SECRET is missing — and import declarations are
 * hoisted above ordinary top-level statements. An inline loader in main.ts
 * therefore runs AFTER app.module has already crashed the process, leaving
 * nothing listening on the API port (browser sees ERR_CONNECTION_REFUSED).
 *
 * Existing environment variables always win, so CI / the e2e pipeline can
 * inject their own JWT_SECRET, PORT and DATABASE_URL.
 */
const envPath = resolve(__dirname, '../../../.env');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

export {};
