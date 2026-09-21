'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bell, Building2, ChevronsLeft, CircleDollarSign, LayoutDashboard, LifeBuoy, Menu,
  Receipt, Scale, ScrollText, Search, Settings, Tractor, Users, X, BarChart3,
  MapPin, Rocket, Moon, Sun, LogOut, ChevronDown, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';

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
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('fleetos_dark', next ? '1' : '0');
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-gray-100 px-5', collapsed && 'justify-center px-3')}>
        <Link href="/home" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 shadow-sm shadow-gray-900/20">
            <Truck className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-gray-900">
              Fleet<span className="text-gray-900">OS</span>
            </span>
          )}
        </Link>
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
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <entry.icon className={cn(
                'h-[18px] w-[18px] shrink-0',
                isActive(pathname, entry.href!) ? 'text-gray-900' : 'text-gray-400',
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
      <div className="border-t border-gray-100 p-3 space-y-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900',
            collapsed && 'justify-center px-2',
          )}
        >
          {darkMode ? <Sun className="h-[18px] w-[18px] shrink-0 text-gray-400" /> : <Moon className="h-[18px] w-[18px] shrink-0 text-gray-400" />}
          {!collapsed && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* User */}
        <div className={cn(
          'flex items-center gap-3 rounded-lg bg-gray-50 p-2.5',
          collapsed && 'justify-center',
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
            OW
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{t('role')}</p>
              <p className="truncate text-xs text-gray-500">Fleet OS</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="rounded-md p-1 text-gray-400 hover:text-gray-600">
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
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/alerts')
      .then((alerts) => {
        setAlertCount(alerts.filter((a) => a.is_resolved !== true).length);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
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
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-white shadow-xl animate-slide-in-right">
            <button
              aria-label={t('closeMenu')}
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6">
          <button
            aria-label={t('openMenu')}
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:block"
          >
            <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>

          {/* Search */}
          <form
            className="relative hidden w-full max-w-md sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(search.trim() ? `/home?q=${encodeURIComponent(search.trim())}` : '/home');
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchMachines')}
              className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-12 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500/20 transition-all"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
              ⌘K
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {/* Alert bell */}
            <Link
              href="/home#alerts"
              aria-label={t('alerts')}
              className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <Bell className="h-5 w-5" />
              {alertCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>

            {/* Divider */}
            <div className="hidden h-6 w-px bg-gray-200 sm:block" />

            {/* User menu */}
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                  OW
                </div>
                <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
              </button>
              {/* Dropdown */}
              <div className="invisible group-hover:visible absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Owner</p>
                  <p className="text-xs text-gray-500">demo@fleetos.com</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
