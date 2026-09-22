'use client';

import { authFetch } from './auth-fetch';

/**
 * Delete a resource via the API.
 * Returns true on success, throws on failure.
 */
export async function apiDelete(path: string): Promise<boolean> {
  const res = await authFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Delete failed (${res.status})`);
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
    throw new Error(body?.detail || `Update failed (${res.status})`);
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
