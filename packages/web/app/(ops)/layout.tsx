'use client';

import Link from 'next/link';
import { OpsNav } from '@/components/nav/ops-nav';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Settings, LogOut } from 'lucide-react';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'ops' && user.role !== 'owner' && user.role !== 'admin') {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <p className="text-sm text-slate-500">Loading Fleet OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isReadOnly = user.role === 'owner' || user.role === 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-white border-b border-[#E5E2DB] shadow-sm">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/home" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">FS</span>
            </div>
            <span className="text-lg font-bold text-slate-900 hidden sm:block">Fleet OS</span>
          </Link>
          
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <OpsNav />
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {isReadOnly && (
              <Link 
                href="/home" 
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Owner Portal</span>
              </Link>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-3 py-1.5">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user.email?.charAt(0).toUpperCase() || 'O'}
                </span>
              </div>
              <span className="text-xs font-medium text-blue-700 hidden sm:block">
                {isReadOnly ? 'View Only' : 'Operations'}
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 container px-4 py-6">{children}</main>
    </div>
  );
}
