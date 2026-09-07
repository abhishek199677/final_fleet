'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Logged in as owner → go to owner dashboard
  if (user?.role === 'owner' || user?.role === 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Fleet OS</h1>
          <p className="text-xl text-muted-foreground">
            Welcome back, {user.email}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/home"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Owner Portal
            </Link>
            <Link
              href="/today"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Operations Portal (read-only)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in as ops → go to ops dashboard
  if (user?.role === 'ops') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Fleet OS</h1>
          <p className="text-xl text-muted-foreground">
            Welcome back, {user.email}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/today"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Operations Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Fleet OS</h1>
        <p className="text-xl text-muted-foreground">
          Multi-tenant SaaS for heavy-equipment operators
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
