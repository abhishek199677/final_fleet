'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bell, Building2, ChevronsLeft, CircleDollarSign, LayoutDashboard, LifeBuoy, Menu,
  Receipt, Scale, ScrollText, Settings, Tractor, Users, X, BarChart3,
  MapPin, Rocket, LogOut, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SkipToMain } from '@/components/skip-to-main';
import { CommandMenu } from '@/components/command-menu';
import { ConfigDrawer } from '@/components/config-drawer';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { useSearch } from '@/context/search-provider';

interface NavEntry {
  section?: 'overview' | 'manage' | 'tools';
  href?: string;
  labelKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  badge?: number;
}

const NAV: NavEntry[] = [
  { section: 'overview' },
  { href: '/home', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/machines', labelKey: 'machines', icon: Tractor },
  { href: '/sites', labelKey: 'sites', icon: MapPin },
  { href: '/deployments', labelKey: 'deployments', icon: Rocket },
  { section: 'manage' },
  { href: '/operators', labelKey: 'operators', icon: Users },
  { href: '/clients', labelKey: 'clients', icon: Building2 },
  { href: '/billing', labelKey: 'billing', icon: Receipt },
  { href: '/cash', labelKey: 'cash', icon: CircleDollarSign },
  { href: '/projections', labelKey: 'projections', icon: Scale },
  { section: 'tools' },
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
  const { logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-white/80 dark:bg-white/5 backdrop-blur-xl border-r border-white/20 dark:border-white/8">
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-white/10 px-5', collapsed && 'justify-center px-3')}>
        <Link href="/home" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 dark:bg-white/90 shadow-sm shadow-gray-900/20 dark:shadow-black/20">
            <Truck className="h-4 w-4 text-white dark:text-gray-900" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-gray-50">
              Fleet<span className="text-gray-900 dark:text-gray-50">OS</span>
            </span>
          )}
        </Link>
      </div>

      {/* Theme Toggle */}
      <div
        className={cn(
          'flex w-full items-center py-2',
          collapsed ? 'justify-center' : 'justify-end px-3',
        )}
      >
        <ThemeSwitch />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((entry, i) =>
          entry.section ? (
            <p
              key={`s-${i}`}
              className={cn(
                'px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 first:pt-1',
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast',
                collapsed && 'justify-center px-2',
                isActive(pathname, entry.href!)
                  ? 'bg-white/60 dark:bg-white/10 text-gray-900 dark:text-gray-50 backdrop-blur-md shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-50',
              )}
            >
              <entry.icon className={cn(
                'h-[18px] w-[18px] shrink-0',
                isActive(pathname, entry.href!) ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400 dark:text-gray-500',
              )} />
              {!collapsed && <span>{t(entry.labelKey!)}</span>}
              {!collapsed && entry.badge && entry.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {entry.badge > 9 ? '9+' : entry.badge}
                </span>
              )}
            </Link>
          ),
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {/* User */}
        <div className={cn(
          'flex items-center gap-3 rounded-lg bg-white/40 dark:bg-white/5 p-2.5 backdrop-blur-md',
          collapsed && 'justify-center',
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200">
            OW
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">{t('role')}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">Fleet OS</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <LogOut className="h-4 w-4" />
            </button>
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
  const { setOpen: setCommandOpen } = useSearch();

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/alerts')
      .then((alerts) => {
        setAlertCount(alerts.filter((a) => a.is_resolved !== true).length);
      })
      .catch(() => undefined);
  }, []);

  // ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandOpen]);

  return (
    <SidebarProvider>
    <SkipToMain />
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-transparent">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 transition-all duration-normal lg:block',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-white/90 dark:bg-white/10 backdrop-blur-2xl shadow-xl animate-slide-in-right">
            <button
              aria-label={t('closeMenu')}
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/40 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/20 dark:border-white/8 bg-white/80 dark:bg-white/5 px-4 backdrop-blur-xl sm:px-6">
          <button
            aria-label={t('openMenu')}
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-white/40 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 text-gray-400 hover:bg-white/40 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-200 lg:block"
          >
            <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>

          {/* Search (opens the ⌘K command palette) */}
          <div className="hidden w-full max-w-md sm:block">
            <Search />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Alert bell */}
            <Link
              href="/home#alerts"
              aria-label={t('alerts')}
              className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/40 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <Bell className="h-5 w-5" />
              {alertCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white/80 dark:ring-gray-950/80">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>

            {/* Divider */}
            <div className="hidden h-6 w-px bg-white/20 dark:bg-white/10 sm:block" />

            {/* Layout config + user menu */}
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </header>

        {/* Page content */}
        <main id="content" className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
    <CommandMenu />
    </SidebarProvider>
  );
}
