import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export async function proxy(request: NextRequest, path: string) {
  const url = new URL(request.url);
  const apiUrl = new URL(`${API_URL}${path}${url.search}`);

  // Forward headers (except host)
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
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

    // Forward response
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const responseBody = await response.arrayBuffer();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { detail: 'API server unavailable' },
      { status: 502 }
    );
  }
}
