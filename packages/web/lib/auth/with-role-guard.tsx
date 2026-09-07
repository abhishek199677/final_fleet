'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface WithRoleGuardOptions {
  allowedRoles: string[];
  redirectTo?: string;
}

export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: WithRoleGuardOptions
) {
  return function GuardedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { allowedRoles, redirectTo = '/login' } = options;

    useEffect(() => {
      if (!loading && user && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate page based on role
        if (user.role === 'owner' || user.role === 'admin') {
          router.push('/');
        } else if (user.role === 'ops') {
          router.push('/today');
        } else {
          router.push(redirectTo);
        }
      }
    }, [user, loading, router, allowedRoles, redirectTo]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user || !allowedRoles.includes(user.role)) {
      return null;
    }

    return <Component {...props} />;
  };
}
