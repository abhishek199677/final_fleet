'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  Bar, CartesianGrid, ComposedChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Download, RefreshCw, Calendar, Users, Truck, TrendingUp, AlertCircle, Clock, CheckCircle,
} from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/dashboard/kpi-card';
import { FleetStatus } from '@/components/dashboard/fleet-status';
import { ActivityTable } from '@/components/dashboard/activity-table';
import { NeedsAttention } from '@/components/dashboard/needs-attention';
import { sampleMachines, sampleSessions, sampleDeployments, sampleSites, sampleClients } from '@/lib/sample-data';

interface Row extends Record<string, unknown> {
  id?: string;
}

const BLUE = '#3B82F6';
const GREEN = '#10b981';
const AMBER = '#F59E0B';
const RED = '#EF4444';
const PURPLE = '#8B5CF6';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

function minorToMoney(minor: unknown): string {
  return `₹${(num(minor) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function ts(v: unknown): number {
  const t = new Date(String(v ?? '')).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function dayLabel(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en', { month: 'short' })}`;
}

function sessionHours(s: Row, now: number): number {
  const a = ts(s.start_at);
  const b = s.end_at ? ts(s.end_at) : now;
  if (!a || !b || b < a) return 0;
  return Math.min((b - a) / 3_600_000, 24);
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

  const [kpis, setKpis] = useState<Row | null>({
    revenue_total: 187338300,
    expense_total: 93669150,
    utilization_pct: 83,
    active_machines: 4,
    total_machines: 6,
  });
  
  const [machines, setMachines] = useState<Row[]>(sampleMachines);
  const [sessions, setSessions] = useState<Row[]>(sampleSessions);
  const [deployments, setDeployments] = useState<Row[]>(sampleDeployments);
  const [sites, setSites] = useState<Row[]>(sampleSites);
  const [clients, setClients] = useState<Row[]>(sampleClients);
  const [receivables, setReceivables] = useState<Row[]>([
    { id: 'r1', client_id: 'c1', amount_minor: 25500000, currency: 'INR', status: 'pending' },
    { id: 'r2', client_id: 'c2', amount_minor: 33200000, currency: 'INR', status: 'pending' },
    { id: 'r3', client_id: 'c3', amount_minor: 10500000, currency: 'INR', status: 'overdue' },
  ]);
  const [advances, setAdvances] = useState<Row[]>([
    { id: 'a1', client_id: 'c1', amount_minor: 5000000, consumed_minor: 2500000, currency: 'INR' },
    { id: 'a2', client_id: 'c2', amount_minor: 3000000, consumed_minor: 1000000, currency: 'INR' },
  ]);
  const [downtime, setDowntime] = useState<Row[]>([
    { id: 'dt1', machine_id: 'm3', started_at: new Date(nowTs - 48 * hr).toISOString(), ended_at: new Date(nowTs - 36 * hr).toISOString(), reason: 'Transport to Site B' },
    { id: 'dt2', machine_id: 'm5', started_at: new Date(nowTs - 10 * hr).toISOString(), ended_at: new Date(nowTs - 6 * hr).toISOString(), reason: 'Hydraulic pump failure' },
  ]);
  const [alerts, setAlerts] = useState<Row[]>([
    { id: 'al1', machine_id: 'm5', type: 'breakdown', message: 'BLR-005 hydraulic failure — overdue repair', created_at: new Date(nowTs - 2 * hr).toISOString(), is_resolved: false },
    { id: 'al2', machine_id: 'm1', type: 'performance', message: 'EXC-001 fuel efficiency dropped 15% this week', created_at: new Date(nowTs - 5 * hr).toISOString(), is_resolved: false },
    { id: 'al3', machine_id: 'm3', type: 'maintenance', message: 'CRN-003 service due in 2 operating hours', created_at: new Date(nowTs - 1 * hr).toISOString(), is_resolved: false },
  ]);

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
      fetchList<Row>('/api/v1/fuel-downtime/downtime'),
      fetchList<Row>('/api/v1/alerts'),
    ]).then(([k, m, s, d, st, c, r, a, dt, al]) => {
      if (k) setKpis(k);
      if (m.length > 0) setMachines(m);
      if (s.length > 0) setSessions(s);
      if (d.length > 0) setDeployments(d);
      if (st.length > 0) setSites(st);
      if (c.length > 0) setClients(c);
      if (r.length > 0) setReceivables(r);
      if (a.length > 0) setAdvances(a);
      if (dt.length > 0) setDowntime(dt);
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
  const reportingToday = activeIdsToday.size;

  const periodSessions = useMemo(
    () => sessions.filter((s) => {
      const t = ts(s.start_at ?? s.created_at);
      return t >= periodRange.from && t < periodRange.to;
    }),
    [sessions, periodRange],
  );

  const statusCounts = useMemo(() => {
    const counts = { working: 0, idle: 0, breakdown: 0, transit: 0, service: 0 };
    withStatus.forEach((m) => {
      const status = String(m._status);
      if (status === 'working') counts.working++;
      else if (status === 'log_pending') counts.idle++;
      else if (status === 'stopped') counts.breakdown++;
      else if (status === 'transit') counts.transit++;
      else if (status === 'service') counts.service++;
    });
    return counts;
  }, [withStatus]);

  const machineActivity = useMemo(() => {
    const siteById = new Map(sites.map((s) => [String(s.id), s]));
    return withStatus.slice(0, 7).map((m) => {
      const site = siteById.get(String(m.site_id ?? ''));
      const unitsToday = sessions
        .filter((x) => String(x.machine_id) === String(m.id) && ts(x.start_at ?? x.created_at) >= todayStart)
        .reduce((a, x) => a + sessionUnits(x), 0);
      return {
        code: String(m.code ?? '—'),
        make: String(m.make ?? ''),
        model: String(m.model ?? ''),
        status: (String(m._status) as 'working' | 'idle' | 'stopped' | 'breakdown' | 'transit' | 'service' | 'log_pending') || 'log_pending',
        site: String(site?.name ?? '—'),
        todayHours: Math.round(unitsToday * 10) / 10,
      };
    });
  }, [withStatus, sites, sessions, todayStart]);

  const alertsData = useMemo(() => {
    return alerts.map((a) => {
      const sev = String(a.severity ?? a.type ?? '').toLowerCase();
      const isUrgent = sev.includes('critical') || sev.includes('overdue') || sev.includes('hold');
      const isSoon = sev.includes('warning') || sev.includes('due');
      return {
        id: String(a.id),
        type: 'maintenance' as const,
        message: String(a.title ?? a.type ?? 'Alert'),
        subtitle: String(a.message ?? a.machine_code ?? ''),
        urgency: isUrgent ? 'action' as const : isSoon ? 'urgent' as const : 'soon' as const,
      };
    });
  }, [alerts]);

  const chartData = [
    { label: '04 Sep', units: 42000, avg: 28000 },
    { label: '05 Sep', units: 38000, avg: 25000 },
    { label: '06 Sep', units: 51000, avg: 32000 },
    { label: '07 Sep', units: 45000, avg: 29000 },
    { label: '08 Sep', units: 55000, avg: 35000 },
    { label: '09 Sep', units: 48000, avg: 31000 },
    { label: '10 Sep', units: 62000, avg: 38000 },
  ];

  // Period-based KPI values
  const periodKpis = useMemo(() => {
    if (period === 'today') {
      return {
        billableHours: 33,
        revenue: 187338300,
        profit: 93669150,
        workingNow: '4/6',
        utilisation: 83,
      };
    } else if (period === 'month') {
      return {
        billableHours: 858,
        revenue: 485000000,
        profit: 242500000,
        workingNow: '12',
        utilisation: 78,
      };
    } else {
      return {
        billableHours: 10296,
        revenue: 5820000000,
        profit: 2910000000,
        workingNow: '15',
        utilisation: 75,
      };
    }
  }, [period]);

  const totalBilled = num(kpis?.total_billed_minor) || periodKpis.revenue;
  const totalExpenses = num(kpis?.expense_total) || periodKpis.profit;

  const downloadCsv = () => {
    const rows = machineActivity.map((r) => [r.code, r.site, r.status, r.todayHours].join(','));
    const blob = new Blob([`machine,site,status,today_hours\n${rows.join('\n')}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'machine-activity.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayStr = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const userName = user?.email ? user.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Demo';

  return (
    <div className="min-w-0 space-y-6">
      {/* Header with gradient */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-white">
              Good morning, {userName}
            </h1>
            <p className="mt-1 truncate text-slate-300">
              Your fleet at a glance · {todayStr}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center rounded-xl bg-white/10 p-1 backdrop-blur-sm">
              {(['today', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                    period === p
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {p === 'today' ? 'Today' : p === 'month' ? 'This Month' : 'This Year'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setNonce((n) => n + 1)}
              aria-label="Refresh"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={downloadCsv}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-lg transition-all hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Export report
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            <p className="text-sm text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-5 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5">
              <p className="text-sm font-medium text-emerald-100">Working now</p>
              <p className="mt-2 text-4xl font-bold text-white">{periodKpis.workingNow}<span className="text-lg font-normal text-emerald-200">/{machines.length}</span></p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-900/30">
                  <div className="h-full bg-white/80 rounded-full" style={{ width: `${periodKpis.utilisation}%` }}></div>
                </div>
                <span className="text-sm font-medium text-emerald-100">{periodKpis.utilisation}%</span>
              </div>
              <p className="mt-2 text-xs text-emerald-200">fleet utilisation</p>
            </div>

            <div className="group overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 p-5 shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
              <p className="text-sm font-medium text-blue-100">{period === 'today' ? 'Billable hours today' : `Hours ${periodRange.label}`}</p>
              <p className="mt-2 text-4xl font-bold text-white">{fmtInt(periodSessions.reduce((a, s) => a + sessionUnits(s), 0) || periodKpis.billableHours)}<span className="text-lg font-normal text-blue-200"> hrs</span></p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs text-blue-200">Approved work logs</p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5">
              <p className="text-sm font-medium text-amber-100">Revenue {periodRange.label}</p>
              <p className="mt-2 text-4xl font-bold text-white">{minorToMoney(totalBilled)}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs text-amber-200">Approved work logs</p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 p-5 shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5">
              <p className="text-sm font-medium text-violet-100">Estimated profit</p>
              <p className="mt-2 text-4xl font-bold text-white">{minorToMoney(periodKpis.profit)}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-900/30">
                  <div className="h-full bg-white/80 rounded-full" style={{ width: `${Math.round((periodKpis.profit / Math.max(periodKpis.revenue, 1)) * 100)}%` }}></div>
                </div>
                <span className="text-sm font-medium text-violet-100">{Math.round((periodKpis.profit / Math.max(periodKpis.revenue, 1)) * 100)}%</span>
              </div>
              <p className="mt-2 text-xs text-violet-200">contribution margin</p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              {/* Chart */}
              <div className="rounded-2xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">Revenue and operating cost</h3>
                    <p className="text-sm text-slate-500">Last 7 days · INR thousands</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                      Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      Operating cost
                    </span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.slice(-7)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255,255,255,0.95)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: 12,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                        }}
                      />
                      <Bar dataKey="units" name="Revenue" fill="#1e293b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg" name="Operating cost" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Machine Activity */}
              <div className="rounded-2xl border border-[#E5E2DB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Machine activity</h3>
                      <p className="text-sm text-slate-300">{machines.length} machines · live operating board</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-xs text-slate-300">Live</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E2DB] text-left">
                        <th className="px-4 py-3 font-medium text-slate-500">Machine</th>
                        <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                        <th className="px-4 py-3 font-medium text-slate-500">Site</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">Today</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machineActivity.map((m, i) => (
                        <tr key={m.code} className="border-b border-[#E5E2DB] last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-600">{m.code.slice(0, 2)}</span>
                              </div>
                              <span className="font-semibold text-slate-900">{m.code}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              m.status === 'working' ? 'bg-green-100 text-green-700' :
                              m.status === 'log_pending' ? 'bg-amber-100 text-amber-700' :
                              m.status === 'stopped' ? 'bg-red-100 text-red-700' :
                              m.status === 'service' ? 'bg-blue-100 text-blue-700' :
                              'bg-violet-100 text-violet-700'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                m.status === 'working' ? 'bg-green-500' :
                                m.status === 'log_pending' ? 'bg-amber-500' :
                                m.status === 'stopped' ? 'bg-red-500' :
                                m.status === 'service' ? 'bg-blue-500' :
                                'bg-violet-500'
                              }`}></span>
                              {m.status === 'working' ? 'Working' :
                               m.status === 'log_pending' ? 'Idle' :
                               m.status === 'stopped' ? 'Stopped' :
                               m.status === 'service' ? 'In service' :
                               'In transit'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{m.site}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${m.todayHours > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {m.todayHours > 0 ? `+${m.todayHours} hrs` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-6">
              {/* Fleet Status */}
              <div className="rounded-2xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Fleet status</h3>
                  <span className="text-sm text-slate-500">{fleetActive.length} machines</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Working', count: statusCounts.working, color: 'bg-green-500', bg: 'bg-green-50' },
                    { label: 'Idle / waiting', count: statusCounts.idle, color: 'bg-amber-500', bg: 'bg-amber-50' },
                    { label: 'Breakdown', count: statusCounts.breakdown, color: 'bg-red-500', bg: 'bg-red-50' },
                    { label: 'In transit', count: statusCounts.transit, color: 'bg-violet-500', bg: 'bg-violet-50' },
                    { label: 'In service', count: statusCounts.service, color: 'bg-blue-500', bg: 'bg-blue-50' },
                  ].map((s) => (
                    <div key={s.label} className={`flex items-center justify-between rounded-xl ${s.bg} p-3`}>
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${s.color}`}></div>
                        <span className="text-sm font-medium text-slate-700">{s.label}</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Needs Attention */}
              <div className="rounded-2xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Needs attention</h3>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-xs font-bold text-red-600">
                    {alertsData.length || 3}
                  </span>
                </div>
                <div className="space-y-3">
                  {(alertsData.length > 0 ? alertsData : [
                    { id: '1', type: 'maintenance' as const, message: 'BLR-005 hydraulic failure', subtitle: 'Overdue repair', urgency: 'action' as const },
                    { id: '2', type: 'maintenance' as const, message: 'EXC-001 fuel efficiency dropped', subtitle: '15% this week', urgency: 'urgent' as const },
                    { id: '3', type: 'maintenance' as const, message: 'CRN-003 service due', subtitle: 'In 2 operating hours', urgency: 'soon' as const },
                  ]).map((alert) => (
                    <div key={alert.id} className={`rounded-xl p-3 border ${
                      alert.urgency === 'action' ? 'bg-red-50 border-red-100' :
                      alert.urgency === 'urgent' ? 'bg-amber-50 border-amber-100' :
                      'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-2 w-2 rounded-full ${
                          alert.urgency === 'action' ? 'bg-red-500' :
                          alert.urgency === 'urgent' ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{alert.message}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{alert.subtitle}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          alert.urgency === 'action' ? 'bg-red-100 text-red-700' :
                          alert.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {alert.urgency === 'action' ? 'Action' : alert.urgency === 'urgent' ? 'Urgent' : 'Soon'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OwnerHome() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
