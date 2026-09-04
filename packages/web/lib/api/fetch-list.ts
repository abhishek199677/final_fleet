'use client';

import { authFetch } from './auth-fetch';

const ENVELOPE_KEYS = ['data', 'items', 'rows', 'machines', 'sessions', 'alerts', 'operators', 'clients', 'accounts', 'categories'];

/**
 * Normalize an API payload to an array. The API returns bare arrays on
 * success but objects on errors (RFC 7807, proxy 502) or envelopes
 * ({data, items, ...}). Never throws; falls back to [].
 */
export function toArray<T>(v: unknown, keys: string[] = ENVELOPE_KEYS): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of keys) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

/** GET a list endpoint; returns [] on non-ok / bad JSON / envelope. */
export async function fetchList<T>(path: string, options: RequestInit = {}): Promise<T[]> {
  try {
    const res = await authFetch(path, options);
    if (!res.ok) return [];
    try {
      return toArray<T>(await res.json());
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}
