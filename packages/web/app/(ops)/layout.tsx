'use client';

import Link from 'next/link';
import { OpsNav } from '@/components/nav/ops-nav';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'ops' && user.role !== 'owner' && user.role !== 'admin') {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isReadOnly = user.role === 'owner' || user.role === 'admin';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/home" className="text-xl font-bold">
              Fleet OS
            </Link>
            <OpsNav />
          </div>
          <div className="flex items-center gap-4">
            {isReadOnly && (
              <Link href="/home" className="text-sm text-primary hover:underline">
                ← Back to Owner Portal
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              {isReadOnly ? 'Operations (view only)' : 'Operations'}
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-4 py-6">{children}</main>
    </div>
  );
}
