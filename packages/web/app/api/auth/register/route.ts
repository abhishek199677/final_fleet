import { NextRequest } from 'next/server';
import { proxy } from '@/lib/api/proxy';

export async function POST(request: NextRequest) {
  return proxy(request, '/api/auth/register');
}
