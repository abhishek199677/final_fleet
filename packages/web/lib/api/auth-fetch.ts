'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('fleetos_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // When calling API directly, strip /api prefix (e.g. /api/v1/machines -> /v1/machines)
  const apiPath = API_BASE && path.startsWith('/api') ? path.slice(4) : path;
  const url = API_BASE ? `${API_BASE}${apiPath}` : path;
  const doFetch = () => fetch(url, { ...options, headers });

  const method = (options.method ?? 'GET').toUpperCase();
  if (method !== 'GET') return doFetch();

  // GETs are safe to retry: absorb transient proxy/network 5xx (e.g. cold-start
  // 502s under parallel bursts) with a single short-delay retry.
  try {
    const res = await doFetch();
    if (res.status >= 500) {
      await new Promise((r) => setTimeout(r, 500));
      return doFetch();
    }
    return res;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
    return doFetch();
  }
}
