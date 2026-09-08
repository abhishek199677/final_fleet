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
  return fetch(url, { ...options, headers });
}
