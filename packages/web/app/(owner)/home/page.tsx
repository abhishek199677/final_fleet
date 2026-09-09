'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Bar, CartesianGrid, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Download, RefreshCw, Calendar,
} from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/dashboard/kpi-card';
import { FleetStatus } from '@/components/dashboard/fleet-status';
import { ActivityTable } from '@/components/dashboard/activity-table';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { GlassCard } from '@/components/dashboard/glass-card';

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

function fmt2(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const searchParams = useSearchParams();
  void searchParams;
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [period, setPeriod] = useState<'today' | 'month' | 'year'>('today');

  const [kpis, setKpis] = useState<Row | null>(null);
  const [machines, setMachines] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [deployments, setDeployments] = useState<Row[]>([]);
  const [sites, setSites] = useState<Row[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [receivables, setReceivables] = useState<Row[]>([]);
  const [advances, setAdvances] = useState<Row[]>([]);
  const [downtime, setDowntime] = useState<Row[]>([]);
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
      fetchList<Row>('/api/v1/fuel-downtime/downtime'),
      fetchList<Row>('/api/v1/alerts'),
    ]).then(([k, m, s, d, st, c, r, a, dt, al]) => {
      setKpis(k);
      setMachines(m);
      setSessions(s);
      setDeployments(d);
      setSites(st);
      setClients(c);
      setReceivables(r);
      setAdvances(a);
      setDowntime(dt);
      setAlerts(al.filter((x) => x.is_resolved !== true).slice(0, 5));
    }).finally(() => setLoading(false));
  }, [nonce]);

  const now = useMemo(() => Date.now(), [nonce]);
  const todayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);

  // Period-based date ranges
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
  const win14 = todayStart - 13 * 86_400_000;
  const prev14 = win14 - 14 * 86_400_000;

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

  // Period-filtered data for KPIs and charts
  const periodSessions = useMemo(
    () => sessions.filter((s) => {
      const t = ts(s.start_at ?? s.created_at);
      return t >= periodRange.from && t < periodRange.to;
    }),
    [sessions, periodRange],
  );

  const periodDowntime = useMemo(
    () => downtime.filter((d) => {
      const t = ts(d.started_at ?? d.created_at);
      return t >= periodRange.from && t < periodRange.to;
    }),
    [downtime, periodRange],
  );

  // 14d windows for downtime % + utilisation deltas
  const calc14 = (from: number, to: number) => {
    const ses = sessions.filter((s) => ts(s.start_at ?? s.created_at) >= from && ts(s.start_at ?? s.created_at) < to);
    const dt = downtime.filter((d) => ts(d.started_at ?? d.created_at) >= from && ts(d.started_at ?? d.created_at) < to);
    const op = ses.reduce((a, s) => a + sessionHours(s, now), 0);
    const dh = dt.reduce((a, d) => a + Math.min(Math.max((ts(d.ended_at ?? now) - ts(d.started_at)) / 3_600_000, 0), 24), 0);
    return {
      dtPct: op + dh > 0 ? (dh / (op + dh)) * 100 : 0,
      util: fleetActive.length > 0 ? (new Set(ses.map((s) => String(s.machine_id))).size / fleetActive.length) * 100 : 0,
    };
  };
  const cur14 = calc14(win14, now);
  const prv14 = calc14(prev14, win14);

  // Finance strip
  const totalBilled = num(kpis?.total_billed_minor);
  const totalReceipts = num(kpis?.total_receipts_minor);
  const outstanding = receivables.reduce(
    (a, r) => a + num(r.balance_minor ?? (num(r.billed_minor) + num(r.extras_minor) - num(r.credits_minor) - num(r.receipts_minor) - num(r.advances_consumed_minor))),
    0,
  );
  const unusedAdv = advances.reduce((a, x) => a + num(x.remaining_minor), 0);

  // Fleet status counts
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

  // Machine activity data
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
        status: (String(m._status) as 'working' | 'idle' | 'breakdown' | 'transit' | 'service' | 'log_pending') || 'log_pending',
        site: String(site?.name ?? '—'),
        todayHours: Math.round(unitsToday * 10) / 10,
      };
    });
  }, [withStatus, sites, sessions, todayStart]);

  // Alerts data
  const alertsData = useMemo(() => {
    return alerts.map((a) => {
      const sev = String(a.severity ?? a.type ?? '').toLowerCase();
      const isUrgent = sev.includes('critical') || sev.includes('overdue') || sev.includes('hold');
      const isSoon = sev.includes('warning') || sev.includes('due');
      return {
        id: String(a.id),
        type: 'maintenance' as const,
        message: String(a.title ?? a.type ?? 'Alert'),
        detail: String(a.message ?? a.machine_code ?? ''),
        severity: isUrgent ? 'action' as const : isSoon ? 'urgent' as const : 'soon' as const,
        icon: 'maintenance' as const,
      };
    });
  }, [alerts]);

  // 14-day meter units chart
  const units14 = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const s = todayStart - i * 86_400_000;
      const units = sessions
        .filter((x) => ts(x.start_at ?? x.created_at) >= s && ts(x.start_at ?? x.created_at) < s + 86_400_000)
        .reduce((a, x) => a + sessionUnits(x), 0);
      out.push({ label: dayLabel(new Date(s)), units: Math.round(units * 10) / 10 });
    }
    return out;
  }, [sessions, todayStart]);
  const avgUnits = units14.length > 0 ? units14.reduce((a, x) => a + x.units, 0) / units14.length : 0;
  const chartData = units14.map((x) => ({ ...x, avg: Math.round(avgUnits * 10) / 10 }));

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
  const userName = 'there';

  return (
    <div className="min-w-0 space-y-6">
      {/* Greeting + Period Selector */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">
            Good morning, {userName}
          </h1>
          <p className="truncate text-slate-500">
            Your fleet at a glance · {todayStr}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(['today', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  period === p
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={downloadCsv}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:from-slate-800 hover:to-slate-700"
          >
            <Download className="h-4 w-4" /> Export report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">Loading dashboard...</div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label={period === 'today' ? 'Working now' : `Active ${periodRange.label}`}
              value={period === 'today' ? `${reportingToday}/${fleetActive.length}` : fmtInt(periodSessions.length)}
              statusDot="#10b981"
              sparkline={[3, 4, 3, 5, 4, 3, reportingToday]}
              sparklineColor="#10b981"
            />
            <KPICard
              label={period === 'today' ? 'Billable hours today' : `Hours ${periodRange.label}`}
              value={fmtInt(periodSessions.reduce((a, s) => a + sessionUnits(s), 0))}
              suffix="hrs"
              trend={12}
              sparkline={units14.map((x) => x.units)}
              sparklineColor="#3b82f6"
            />
            <KPICard
              label={`Revenue ${periodRange.label}`}
              value={minorToMoney(totalBilled)}
              trend={15}
              sparkline={[totalBilled * 0.8, totalBilled * 0.85, totalBilled * 0.9, totalBilled * 0.95, totalBilled]}
              sparklineColor="#10b981"
            />
            <KPICard
              label={`Downtime ${periodRange.label}`}
              value={`${Math.round(periodDowntime.length > 0 ? (periodDowntime.reduce((a, d) => a + Math.min(Math.max((ts(d.ended_at ?? now) - ts(d.started_at)) / 3_600_000, 0), 24), 0) / Math.max(periodSessions.reduce((a, s) => a + sessionHours(s, now), 0) + periodDowntime.reduce((a, d) => a + Math.min(Math.max((ts(d.ended_at ?? now) - ts(d.started_at)) / 3_600_000, 0), 24), 0), 1)) * 100 : 0)}%`}
              trend={cur14.util - prv14.util}
              sparkline={[cur14.util * 0.9, cur14.util * 0.95, cur14.util, cur14.util * 1.02, cur14.util * 1.05]}
              sparklineColor="#3b82f6"
            />
          </div>

          {/* Main Content + Right Sidebar */}
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Chart + Activity */}
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <GlassCard className="overflow-hidden">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">Revenue vs Operating Cost</h3>
                    <p className="text-sm text-slate-500">{periodRange.label} · USD thousands</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
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
                      <Bar dataKey="units" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Line type="monotone" dataKey="avg" name="Operating cost" stroke="#f59e0b" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <ActivityTable machines={machineActivity} />
            </div>

            {/* Right: Fleet Status + Alerts */}
            <div className="min-w-0 space-y-6">
              <FleetStatus
                statuses={[
                  { label: 'Working', count: statusCounts.working, color: GREEN },
                  { label: 'Idle / waiting', count: statusCounts.idle, color: AMBER },
                  { label: 'Breakdown', count: statusCounts.breakdown, color: RED },
                  { label: 'In transit', count: statusCounts.transit, color: PURPLE },
                  { label: 'In service', count: statusCounts.service, color: BLUE },
                ]}
                total={fleetActive.length}
              />
              <AlertsPanel alerts={alertsData} />
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
