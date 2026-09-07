'use client';

import { OwnerShell } from '@/components/nav/owner-shell';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !['owner', 'admin'].includes(user.role)) {
      if (user.role === 'ops') {
        router.push('/today');
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

  if (!user || !['owner', 'admin'].includes(user.role)) {
    return null;
  }

  return <OwnerShell>{children}</OwnerShell>;
}
