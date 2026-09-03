import { AdminNav } from '@/components/nav/admin-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/tenants" className="text-xl font-bold">
              Fleet OS
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Platform Admin</span>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-4 py-6">{children}</main>
    </div>
  );
}

import Link from 'next/link';
