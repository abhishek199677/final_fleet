import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export async function proxy(request: NextRequest, path: string) {
  const url = new URL(request.url);
  const apiUrl = new URL(`${API_URL}${path}${url.search}`);

  // Forward headers (except host + conditionals). Conditional headers are
  // stripped because a 304 from upstream cannot carry a body, and the API
  // must always return full fresh data — forwarding them made warm-browser
  // revalidation crash the proxy into a 502.
  const STRIP_REQUEST = new Set(['host', 'if-none-match', 'if-modified-since', 'if-range']);
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Get request body if present
  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      method: request.method,
      headers,
      body,
    });

    // Forward response. Validators are dropped and caching disabled so the
    // browser never stores/revalidates API responses (fresh data only).
    const responseHeaders = new Headers();
    const STRIP_RESPONSE = new Set([
      'transfer-encoding',
      'content-encoding',
      'etag',
      'last-modified',
      'cache-control',
      'expires',
      'vary',
    ]);
    response.headers.forEach((value, key) => {
      if (!STRIP_RESPONSE.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    responseHeaders.set('cache-control', 'no-store');

    const responseBody = await response.arrayBuffer();

    // 204/205/304 are null-body statuses — passing a body throws a TypeError
    // (which previously got caught below and reported as a bogus 502).
    const NULL_BODY = new Set([204, 205, 304]);
    return new NextResponse(
      NULL_BODY.has(response.status) ? null : responseBody,
      {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { detail: 'API server unavailable' },
      { status: 502 }
    );
  }
}
