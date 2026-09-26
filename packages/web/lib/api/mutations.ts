'use client';

import { authFetch } from './auth-fetch';

/**
 * Nest and Fastify both answer with a JSON error body, but the shape differs
 * (`message` vs `detail`, and Nest packs field errors into an array). Pull the
 * most useful string out of either so the user never sees a bare
 * "Update failed (400)" when the API already explained what went wrong.
 */
function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as Record<string, unknown>;
  const raw = b.message ?? b.detail ?? b.error;
  if (Array.isArray(raw)) return raw.filter(Boolean).join(', ');
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
}

/**
 * Delete a resource via the API.
 * Returns true on success, throws on failure.
 */
export async function apiDelete(path: string): Promise<boolean> {
  const res = await authFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, `Delete failed (${res.status})`));
  }
  return true;
}

/**
 * Patch a resource via the API.
 * Returns the updated resource.
 */
export async function apiPatch<T = Record<string, unknown>>(path: string, data: Record<string, unknown>): Promise<T> {
  const res = await authFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, `Update failed (${res.status})`));
  }
  return res.json() as Promise<T>;
}

/** POST a JSON body, throwing the API's own message when it fails. */
export async function apiPost<T = Record<string, unknown>>(path: string, data: Record<string, unknown>): Promise<T> {
  const res = await authFetch(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, `Request failed (${res.status})`));
  }
  return res.json() as Promise<T>;
}

/**
 * PUT a JSON body — a few endpoints (users, notification prefs) are full
 * replacements rather than merges, so PATCH is not interchangeable there.
 */
export async function apiPut<T = Record<string, unknown>>(path: string, data: Record<string, unknown>): Promise<T> {
  const res = await authFetch(path, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, `Update failed (${res.status})`));
  }
  return res.json() as Promise<T>;
}

/**
 * Confirm with the user, then delete.
 * Returns true if deleted, false if cancelled.
 */
export function confirmDelete(label: string): boolean {
  if (!window.confirm(`Are you sure you want to delete "${label}"? This cannot be undone.`)) {
    return false;
  }
  return true;
}
