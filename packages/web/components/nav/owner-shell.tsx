'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bell, Building2, ChevronsLeft, CircleDollarSign, LayoutDashboard, LifeBuoy, Menu,
  Receipt, Scale, ScrollText, Search, Settings, Tractor, Users, X, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchList } from '@/lib/api/fetch-list';

interface NavEntry {
  section?: 'overview' | 'manage';
  href?: string;
  labelKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
}

const NAV: NavEntry[] = [
  { section: 'overview' },
  { href: '/home', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/machines', labelKey: 'machines', icon: Tractor },
  { section: 'manage' },
  { href: '/operators', labelKey: 'operators', icon: Users },
  { href: '/clients', labelKey: 'clients', icon: Building2 },
  { href: '/billing', labelKey: 'billing', icon: Receipt },
  { href: '/cash', labelKey: 'cash', icon: CircleDollarSign },
  { href: '/projections', labelKey: 'projections', icon: Scale },
  { href: '/insights', labelKey: 'insights', icon: BarChart3 },
  { href: '/audit', labelKey: 'audit', icon: ScrollText },
  { href: '/support', labelKey: 'support', icon: LifeBuoy },
  { href: '/settings', labelKey: 'settings', icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === '/home') return pathname === '/home';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-800">
      <div className={cn('flex h-16 items-center border-b border-slate-700/50 px-4', collapsed && 'justify-center px-2')}>
        <Link href="/home" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20">
            F
          </span>
          {!collapsed && <span className="text-lg font-bold tracking-tight text-white">FleetOS</span>}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((entry, i) =>
          entry.section ? (
            <p
              key={`s-${i}`}
              className={cn(
                'px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:pt-1',
                collapsed && 'sr-only',
              )}
            >
              {t(entry.section)}
            </p>
          ) : (
            <Link
              key={entry.href}
              href={entry.href!}
              title={t(entry.labelKey!)}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                collapsed && 'justify-center px-2',
                isActive(pathname, entry.href!)
                  ? 'bg-white/10 text-white shadow-lg shadow-black/10'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )}
            >
              <entry.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(entry.labelKey!)}</span>}
            </Link>
          ),
        )}
      </nav>
      <div className="border-t border-slate-700/50 p-3">
        <div className={cn('flex items-center gap-3 rounded-lg bg-white/5 p-2', collapsed && 'justify-center')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
            OW
          </span>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-white">{t('role')}</p>
              <p className="truncate text-xs text-slate-400">Fleet OS</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('sidebar');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/alerts').then((alerts) => {
      setAlertCount(alerts.filter((a) => a.is_resolved !== true).length);
    }).catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-slate-700/50 transition-all lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-slate-900 shadow-xl">
            <button
              aria-label={t('closeMenu')}
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur">
          <button
            aria-label={t('openMenu')}
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:block"
          >
            <ChevronsLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
          </button>
          <form
            className="relative w-full max-w-sm"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(search.trim() ? `/home?q=${encodeURIComponent(search.trim())}` : '/home');
            }}
          >
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchMachines')}
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-12 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/home#alerts"
              aria-label={t('alerts')}
              className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Bell className="h-5 w-5" />
              {alertCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>
            <span className="ml-1 hidden h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground sm:flex">
              OW
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
