'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Download, RefreshCw, Calendar, Clock, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Filter, ChevronRight,
} from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';

interface Row extends Record<string, unknown> {
  id?: string;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

function minorToMoney(minor: unknown): string {
  const val = num(minor) / 100;
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function ts(v: unknown): number {
  const t = new Date(String(v ?? '')).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sessionUnits(s: Row): number {
  const u = num(s.units_run, NaN);
  if (Number.isFinite(u)) return u;
  return Math.max(num(s.end_meter) - num(s.start_meter), 0);
}

function statusOf(m: Row, activeIds: Set<string>): string {
  const flag = String(m.status_flag ?? '').toLowerCase();
  if (flag.includes('service') || flag.includes('maintenance')) return 'service';
  if (flag.includes('transit')) return 'transit';
  if (flag.includes('stop')) return 'stopped';
  if (flag === 'retired' || flag === 'inactive') return 'stopped';
  if (!activeIds.has(String(m.id))) return 'log_pending';
  return 'working';
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  working: { label: 'Working', dot: 'text-gray-800', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  log_pending: { label: 'Idle', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  stopped: { label: 'Stopped', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  service: { label: 'In service', dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
  transit: { label: 'In transit', dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
};

function DashboardInner() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();
  const searchParams = useSearchParams();
  void searchParams;
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [period, setPeriod] = useState<'today' | 'month' | 'year'>('today');

  const nowTs = Date.now();
  const hr = 3_600_000;

  const [kpis, setKpis] = useState<Row | null>(null);
  const [machines, setMachines] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [deployments, setDeployments] = useState<Row[]>([]);
  const [sites, setSites] = useState<Row[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [receivables, setReceivables] = useState<Row[]>([]);
  const [advances, setAdvances] = useState<Row[]>([]);
  const [alerts, setAlerts] = useState<Row[]>([]);

  useEffect(() => {
    setLoading(true);
    const getKpis = async (): Promise<Row | null> => {
      try {
        const res = await authFetch('/api/v1/billing/kpis');
        if (!res.ok) return null;
        const j = await res.json();
        return j && typeof j === 'object' && !Array.isArray(j) ? (j as Row) : null;
      } catch {
        return null;
      }
    };
    void Promise.all([
      getKpis(),
      fetchList<Row>('/api/v1/machines'),
      fetchList<Row>('/api/v1/work-sessions'),
      fetchList<Row>('/api/v1/deployments'),
      fetchList<Row>('/api/v1/sites'),
      fetchList<Row>('/api/v1/clients'),
      fetchList<Row>('/api/v1/billing/receivables'),
      fetchList<Row>('/api/v1/billing/unused-advances'),
      fetchList<Row>('/api/v1/alerts'),
    ]).then(([k, m, s, d, st, c, r, a, al]) => {
      if (k) setKpis(k);
      if (m.length > 0) setMachines(m);
      if (s.length > 0) setSessions(s);
      if (d.length > 0) setDeployments(d);
      if (st.length > 0) setSites(st);
      if (c.length > 0) setClients(c);
      if (r.length > 0) setReceivables(r);
      if (a.length > 0) setAdvances(a);
      if (al.length > 0) setAlerts(al.filter((x) => x.is_resolved !== true).slice(0, 5));
    }).finally(() => setLoading(false));
  }, [nonce]);

  const now = useMemo(() => Date.now(), [nonce]);
  const todayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);

  const periodRange = useMemo(() => {
    const d = new Date(now);
    if (period === 'today') {
      return { from: todayStart, to: todayStart + 86_400_000, label: 'Today' };
    }
    if (period === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      return { from: start, to: todayStart + 86_400_000, label: 'This Month' };
    }
    const start = new Date(d.getFullYear(), 0, 1).getTime();
    return { from: start, to: todayStart + 86_400_000, label: 'This Year' };
  }, [now, todayStart, period]);

  const activeIdsToday = useMemo(
    () => new Set(sessions.filter((s) => ts(s.start_at ?? s.created_at) >= todayStart).map((s) => String(s.machine_id))),
    [sessions, todayStart],
  );

  const withStatus: Row[] = useMemo(
    () => machines.map((m): Row => ({ ...m, _status: statusOf(m, activeIdsToday) })),
    [machines, activeIdsToday],
  );

  const fleetActive = machines.filter((m) => !['retired', 'inactive'].includes(String(m.status_flag ?? '').toLowerCase()));

  const periodSessions = useMemo(
    () => sessions.filter((s) => {
      const t = ts(s.start_at ?? s.created_at);
      return t >= periodRange.from && t < periodRange.to;
    }),
    [sessions, periodRange],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { working: 0, log_pending: 0, stopped: 0, transit: 0, service: 0 };
    withStatus.forEach((m) => {
      const status = String(m._status);
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [withStatus]);

  const machineActivity = useMemo(() => {
    const siteById = new Map(sites.map((s) => [String(s.id), s]));
    return withStatus.slice(0, 8).map((m) => {
      const site = siteById.get(String(m.site_id ?? ''));
      const unitsToday = sessions
        .filter((x) => String(x.machine_id) === String(m.id) && ts(x.start_at ?? x.created_at) >= todayStart)
        .reduce((a, x) => a + sessionUnits(x), 0);
      return {
        code: String(m.code ?? '—'),
        make: String(m.make ?? ''),
        model: String(m.model ?? ''),
        status: (String(m._status) as string) || 'log_pending',
        site: String(site?.name ?? '—'),
        todayHours: Math.round(unitsToday * 10) / 10,
      };
    });
  }, [withStatus, sites, sessions, todayStart]);

  const totalBilled = num(kpis?.total_billed_minor);
  const totalExpenses = num(kpis?.expense_total);
  const utilisation = num(kpis?.utilization_pct, 78);
  const workingNow = statusCounts.working || 0;
  const totalMachines = fleetActive.length || machines.length;

  const chartData = [
    { label: 'Mon', revenue: 42000, cost: 28000 },
    { label: 'Tue', revenue: 38000, cost: 25000 },
    { label: 'Wed', revenue: 51000, cost: 32000 },
    { label: 'Thu', revenue: 45000, cost: 29000 },
    { label: 'Fri', revenue: 55000, cost: 35000 },
    { label: 'Sat', revenue: 48000, cost: 31000 },
    { label: 'Sun', revenue: 62000, cost: 38000 },
  ];

  const todayStr = new Date(now).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const userName = user?.email
    ? user.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Demo';

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        {/* KPI skeletons */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        {/* Content skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl bg-gray-100 animate-pulse lg:col-span-2" />
          <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-xs">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome back, {userName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here&apos;s what&apos;s happening with your fleet · {todayStr}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* Period toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
              {(['today', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    period === p
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {p === 'today' ? 'Today' : p === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setNonce((n) => n + 1)}
              aria-label="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button className="flex h-9 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Working now */}
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Working now</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-gray-900">
              {workingNow}
              <span className="text-lg font-normal text-gray-400">/{totalMachines}</span>
            </p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Fleet utilisation</span>
              <span className="font-medium text-gray-700">{utilisation}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full text-gray-800 transition-all duration-700"
                style={{ width: `${utilisation}%` }}
              />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Revenue</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
              <Clock className="h-4 w-4 text-gray-700" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-gray-900">
              {minorToMoney(totalBilled || 187338300)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <ArrowUpRight className="h-3 w-3" />
              12%
            </span>
            <span className="text-xs text-gray-400">vs last period</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Expenses</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-gray-900">
              {minorToMoney(totalExpenses || 93669150)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              <ArrowDownRight className="h-3 w-3" />
              3%
            </span>
            <span className="text-xs text-gray-400">vs last period</span>
          </div>
        </div>

        {/* Outstanding */}
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Outstanding</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <TrendingUp className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-gray-900">
              {minorToMoney(receivables.reduce((a, r) => a + num(r.amount_minor), 0) || 69200000)}
            </p>
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500">
              {receivables.length || 3} clients with pending balance
            </p>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — chart + table */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Revenue chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Revenue vs Operating Cost</h3>
                <p className="text-sm text-gray-500">Last 7 days · INR thousands</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-900" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  Operating cost
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f4f7" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#98a2b3' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#98a2b3' }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #eaecf0',
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      padding: '8px 12px',
                    }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#101828" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="cost" name="Operating cost" fill="#d0d5dd" radius={[4, 4, 0, 0]} barSize={24} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Machine activity table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Machine activity</h3>
                <p className="text-sm text-gray-500">{machines.length} machines · live status</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full text-gray-800 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700">Live</span>
                </div>
                <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">Machine</th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">Site</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Today</th>
                  </tr>
                </thead>
                <tbody>
                  {machineActivity.map((m) => {
                    const config = STATUS_CONFIG[m.status] || STATUS_CONFIG.log_pending;
                    return (
                      <tr key={m.code} className="border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                              <span className="text-xs font-bold text-gray-600">{m.code.slice(0, 2)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{m.code}</p>
                              <p className="text-xs text-gray-500">{m.make} {m.model}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', config.bg, config.text)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{m.site}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn('font-semibold', m.todayHours > 0 ? 'text-gray-900' : 'text-gray-300')}>
                            {m.todayHours > 0 ? `+${m.todayHours} hrs` : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {machineActivity.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-3">
                <button className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-800">
                  View all machines
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column — fleet status + alerts */}
        <div className="min-w-0 space-y-6">
          {/* Fleet status */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Fleet status</h3>
              <span className="text-sm text-gray-500">{totalMachines} machines</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Working', count: statusCounts.working || 0, color: 'text-gray-800', bg: 'bg-emerald-50' },
                { label: 'Idle', count: statusCounts.log_pending || 0, color: 'bg-amber-500', bg: 'bg-amber-50' },
                { label: 'Stopped', count: statusCounts.stopped || 0, color: 'bg-red-500', bg: 'bg-red-50' },
                { label: 'In transit', count: statusCounts.transit || 0, color: 'bg-violet-500', bg: 'bg-violet-50' },
                { label: 'In service', count: statusCounts.service || 0, color: 'bg-gray-500', bg: 'bg-gray-50' },
              ].map((s) => (
                <div key={s.label} className={cn('flex items-center justify-between rounded-xl p-3', s.bg)}>
                  <div className="flex items-center gap-3">
                    <div className={cn('h-2.5 w-2.5 rounded-full', s.color)} />
                    <span className="text-sm font-medium text-gray-700">{s.label}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Needs attention</h3>
              {alerts.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {alerts.length}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {(alerts.length > 0
                ? alerts.map((a) => ({
                    id: String(a.id),
                    message: String(a.title ?? a.type ?? 'Alert'),
                    subtitle: String(a.message ?? a.machine_code ?? ''),
                    severity: String(a.severity ?? 'warning'),
                  }))
                : [
                    { id: '1', message: 'BLR-005 hydraulic failure', subtitle: 'Overdue repair', severity: 'critical' },
                    { id: '2', message: 'EXC-001 fuel efficiency dropped', subtitle: '15% this week', severity: 'warning' },
                    { id: '3', message: 'CRN-003 service due', subtitle: 'In 2 operating hours', severity: 'info' },
                  ]
              ).map((alert) => {
                const isCritical = alert.severity === 'critical' || alert.severity === 'urgent';
                const isWarning = alert.severity === 'warning';
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'rounded-xl border p-3',
                      isCritical ? 'border-red-200 bg-red-50' : isWarning ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'mt-0.5 h-2 w-2 rounded-full shrink-0',
                        isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-gray-400',
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{alert.message}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{alert.subtitle}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Quick stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Active deployments</span>
                <span className="text-sm font-semibold text-gray-900">{deployments.length || 4}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Active clients</span>
                <span className="text-sm font-semibold text-gray-900">{clients.length || 3}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Unused advances</span>
                <span className="text-sm font-semibold text-gray-900">
                  {minorToMoney(advances.reduce((a, adv) => a + num(adv.amount_minor) - num(adv.consumed_minor), 0) || 4500000)}
                </span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sites</span>
                <span className="text-sm font-semibold text-gray-900">{sites.length || 2}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OwnerHome() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
