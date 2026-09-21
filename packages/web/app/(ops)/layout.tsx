'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, PlayCircle, PauseCircle, Droplets, Receipt,
  Banknote, Calculator, Wrench, History, Truck, Menu, X, Bell, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const OPS_NAV = [
  { href: '/today', label: 'Today', icon: LayoutDashboard },
  { href: '/work-session', label: 'Work Session', icon: PlayCircle },
  { href: '/downtime', label: 'Downtime', icon: PauseCircle },
  { href: '/fuel', label: 'Fuel', icon: Droplets },
  { href: '/expense', label: 'Expense', icon: Receipt },
  { href: '/receipt', label: 'Receipt', icon: Banknote },
  { href: '/cash-count', label: 'Cash Count', icon: Calculator },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/history', label: 'History', icon: History },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && user && user.role === 'owner') {
      router.push('/home');
    } else if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
      </div>
    );
  }

  if (!user || user.role === 'owner') return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-gray-100 px-5">
            <Link href="/today" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 shadow-sm shadow-gray-900/20">
                <Truck className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-gray-900">
                Fleet<span className="text-gray-700">OS</span>
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Operations
            </p>
            {OPS_NAV.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast',
                    isActive
                      ? 'bg-gray-100 text-gray-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <item.icon className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive ? 'text-gray-700' : 'text-gray-400',
                  )} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-gray-700">
                OP
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">Operations</p>
                <p className="truncate text-xs text-gray-500">Fleet OS</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gray-900 to-gray-800">
              <Truck className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">FleetOS</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-gray-700">
              OP
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-[280px] bg-white shadow-xl animate-slide-in-right">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex h-16 items-center border-b border-gray-100 px-5">
                <span className="text-base font-bold text-gray-900">FleetOS</span>
              </div>
              <nav className="space-y-1 p-3">
                {OPS_NAV.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        isActive ? 'bg-gray-100 text-gray-700' : 'text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Horizontal scroll nav (desktop) */}
        <div className="hidden border-b border-gray-200 bg-white lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 py-2">
            {OPS_NAV.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gray-900 text-white shadow-sm shadow-gray-900/20'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
