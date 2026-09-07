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
    if (!loading && user && user.role !== 'ops') {
      if (user.role === 'owner' || user.role === 'admin') {
        router.push('/');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'ops') {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/today" className="text-xl font-bold">
              Fleet OS
            </Link>
            <OpsNav />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Operations</span>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-4 py-6">{children}</main>
    </div>
  );
}
