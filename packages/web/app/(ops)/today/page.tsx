'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowDown, ArrowUp, Bell, ClipboardCheck, Fuel,
  Gauge, Pause, Play, Receipt, RefreshCw, Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { sampleMachines, sampleSessions, sampleFuelLogs, sampleDowntime, sampleExpenses, sampleAlerts } from '@/lib/sample-data';

type RangeKey = '1d' | '7d';

interface Row extends Record<string, unknown> {
  id?: string;
}

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '1d', label: 'Today', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
];

const AMBER = '#F59E0B';
const INK = '#1F2937';
const GRAY = '#9CA3AF';
const RED = '#EF4444';

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

function ts(v: unknown): number {
  const t = new Date(String(v ?? '')).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function getMyId(): string | null {
  try {
    const token = localStorage.getItem('fleetos_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return String(payload.sub ?? payload.id ?? '');
  } catch {
    return null;
  }
}

function dayLabel(d: Date): string {
  const day = d.getDate();
  const suf = day % 10 === 1 && day % 100 !== 11 ? 'st'
    : day % 10 === 2 && day % 100 !== 12 ? 'nd'
    : day % 10 === 3 && day % 100 !== 13 ? 'rd' : 'th';
  return `${day}${suf} ${d.toLocaleString('en', { month: 'short' })}`;
}

function sessionHours(s: Row, now: number): number {
  const a = ts(s.start_at);
  const b = s.end_at ? ts(s.end_at) : now;
  if (!a || !b || b < a) return 0;
  return Math.min((b - a) / 3_600_000, 24);
}

function downtimeHours(d: Row, now: number): number {
  const a = ts(d.started_at);
  const b = d.ended_at ? ts(d.ended_at) : now;
  if (!a || !b || b < a) return 0;
  return Math.min((b - a) / 3_600_000, 24);
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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    working: 'bg-green-100 text-green-700',
    log_pending: 'bg-amber-100 text-amber-700',
    stopped: 'bg-red-100 text-red-700',
    service: 'bg-blue-100 text-blue-700',
    transit: 'bg-violet-100 text-violet-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Delta({ value, format, invert }: { value: number; format: (n: number) => string; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value < 0 ? ArrowDown : ArrowUp;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${good ? 'text-green-700' : 'text-red-600'}`}>
      <Icon className="h-4 w-4" />
      {value < 0 ? '−' : '+'}{format(Math.abs(value))}
    </span>
  );
}

export default function OpsToday() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const [range, setRange] = useState<RangeKey>('1d');
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const [machines, setMachines] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [fuelLogs, setFuelLogs] = useState<Row[]>([]);
  const [downtime, setDowntime] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [maintenance, setMaintenance] = useState<Row[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    setMyId(getMyId());
    setLoading(true);
    void Promise.all([
      fetchList<Row>('/api/v1/machines'),
      fetchList<Row>('/api/v1/work-sessions'),
      fetchList<Row>('/api/v1/fuel-downtime/fuel-logs'),
      fetchList<Row>('/api/v1/fuel-downtime/downtime'),
      fetchList<Row>('/api/v1/expenses'),
      fetchList<Row>('/api/v1/alerts?status=unread'),
    ]).then(([m, s, f, d, e, al]) => {
      setMachines(m.length > 0 ? m : sampleMachines);
      setSessions(s.length > 0 ? s : sampleSessions);
      setFuelLogs(f.length > 0 ? f : sampleFuelLogs);
      setDowntime(d.length > 0 ? d : sampleDowntime);
      setExpenses(e.length > 0 ? e : sampleExpenses);
      setAlerts(al.length > 0 ? al.slice(0, 4) : sampleAlerts);
      // Maintenance status per machine (shared ops-readable view)
      void Promise.all(m.map((mm) => fetchList<Row>(`/api/v1/maintenance/machines/${mm.id}/status`)))
        .then((lists) => {
          const codeById = new Map(m.map((mm) => [String(mm.id), String(mm.code ?? '')]));
          setMaintenance(
            lists.flatMap((list, i) =>
              list.map((t) => ({ ...t, _machine: codeById.get(String(m[i].id)) ?? '' })),
            ),
          );
        })
        .catch(() => undefined);
    }).finally(() => setLoading(false));
  }, [nonce]);

  const now = useMemo(() => Date.now(), [nonce]);
  const days = RANGES.find((r) => r.key === range)?.days ?? 1;
  const winStart = now - days * 86_400_000;
  const prevStart = winStart - days * 86_400_000;
  const inWin = (t: number, from: number, to: number) => t >= from && t < to;

  const agg = useMemo(() => {
    const calc = (from: number, to: number) => {
      const ses = sessions.filter((s) => inWin(ts(s.start_at ?? s.created_at), from, to));
      const fuel = fuelLogs.filter((f) => inWin(ts(f.created_at), from, to));
      const dt = downtime.filter((d) => inWin(ts(d.started_at ?? d.created_at), from, to));
      return {
        reporting: new Set(ses.map((s) => String(s.machine_id))).size,
        mySessions: myId ? ses.filter((s) => String(s.created_by ?? '') === myId).length : 0,
        opHrs: ses.reduce((a, s) => a + sessionHours(s, now), 0),
        litres: fuel.reduce((a, f) => a + num(f.litres), 0),
        dtHrs: dt.reduce((a, d) => a + downtimeHours(d, now), 0),
      };
    };
    return { cur: calc(winStart, now), prev: calc(prevStart, winStart) };
  }, [sessions, fuelLogs, downtime, myId, winStart, prevStart, now]);

  const dueTasks = useMemo(
    () => maintenance.filter((t) => ['warning', 'overdue'].includes(String(t.status ?? '').toLowerCase())),
    [maintenance],
  );

  const kpiCards = [
    { title: 'Machines reporting', value: String(agg.cur.reporting), unit: `of ${machines.length}`, prev: `${agg.prev.reporting}`, delta: agg.cur.reporting - agg.prev.reporting, deltaFmt: (n: number) => `${fmtInt(n)}`, dot: '#65A30D', metricKey: 'machines_reporting' },
    { title: 'My sessions', value: String(agg.cur.mySessions), unit: 'logged', prev: `${agg.prev.mySessions}`, delta: agg.cur.mySessions - agg.prev.mySessions, deltaFmt: (n: number) => `${fmtInt(n)}`, dot: AMBER, metricKey: 'my_sessions_logged' },
    { title: 'Operating hours', value: fmt2(agg.cur.opHrs), unit: 'hrs', prev: `${fmt2(agg.prev.opHrs)} hrs`, delta: agg.cur.opHrs - agg.prev.opHrs, deltaFmt: (n: number) => `${fmt2(n)}`, dot: '#4F46E5', metricKey: 'time_operating_in_hours' },
    { title: 'Fuel logged', value: fmtInt(agg.cur.litres), unit: 'L', prev: `${fmtInt(agg.prev.litres)} L`, delta: agg.cur.litres - agg.prev.litres, deltaFmt: (n: number) => `${fmtInt(n)} L`, dot: '#0D9488', metricKey: 'fuel_logged_in_litres' },
    { title: 'Downtime', value: fmt2(agg.cur.dtHrs), unit: 'hrs', prev: `${fmt2(agg.prev.dtHrs)} hrs`, delta: agg.cur.dtHrs - agg.prev.dtHrs, deltaFmt: (n: number) => `${fmt2(n)}`, invert: true, dot: GRAY, metricKey: 'time_idle_in_hours' },
    { title: 'Maintenance due', value: String(dueTasks.length), unit: 'tasks', prev: '', delta: 0, deltaFmt: (_n: number) => '', dot: RED, metricKey: 'maintenance_due_tasks' },
  ];

  // Sessions per machine (current window)
  const perMachine = useMemo(
    () =>
      machines.map((m) => {
        const ses = sessions.filter(
          (s) => String(s.machine_id) === String(m.id) && inWin(ts(s.start_at ?? s.created_at), winStart, now),
        );
        return {
          name: String(m.code ?? '—'),
          billable: ses.filter((s) => s.billable !== false).length,
          nonBillable: ses.filter((s) => s.billable === false).length,
        };
      }),
    [machines, sessions, winStart, now],
  );

  // Reporting compliance — last 7 days
  const compliance = useMemo(() => {
    const out = [];
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const s = today.getTime() - i * 86_400_000;
      const ids = new Set(
        sessions.filter((x) => inWin(ts(x.start_at ?? x.created_at), s, s + 86_400_000)).map((x) => String(x.machine_id)),
      );
      const reporting = machines.filter((m) => ids.has(String(m.id))).length;
      out.push({ label: dayLabel(new Date(s)), reporting, silent: Math.max(machines.length - reporting, 0) });
    }
    return out;
  }, [sessions, machines, now]);

  // Fuel litres + operating hours per day (current window, daily buckets)
  const dailyOps = useMemo(() => {
    const out = [];
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const s = today.getTime() - i * 86_400_000;
      const e = s + 86_400_000;
      const ses = sessions.filter((x) => inWin(ts(x.start_at ?? x.created_at), s, e));
      const fuel = fuelLogs.filter((x) => inWin(ts(x.created_at), s, e));
      out.push({
        label: dayLabel(new Date(s)),
        litres: Math.round(fuel.reduce((a, f) => a + num(f.litres), 0)),
        opHrs: Math.round(ses.reduce((a, x) => a + sessionHours(x, now), 0) * 10) / 10,
      });
    }
    return out;
  }, [sessions, fuelLogs, days, now]);

  // Downtime by reason (current window)
  const byReason = useMemo(() => {
    const map = new Map<string, number>();
    downtime
      .filter((d) => inWin(ts(d.started_at ?? d.created_at), winStart, now))
      .forEach((d) => {
        const k = String(d.reason_code ?? d.reason ?? 'other').replace(/_/g, ' ');
        map.set(k, (map.get(k) ?? 0) + downtimeHours(d, now));
      });
    return [...map.entries()]
      .map(([reason, hours]) => ({ reason, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);
  }, [downtime, winStart, now]);

  const activeIds = useMemo(
    () => new Set(sessions.filter((s) => inWin(ts(s.start_at ?? s.created_at), winStart, now)).map((s) => String(s.machine_id))),
    [sessions, winStart, now],
  );

  const fleetRows: Row[] = useMemo(
    () =>
      machines.map((m): Row => {
        const ses = sessions.filter(
          (s) => String(s.machine_id) === String(m.id) && inWin(ts(s.start_at ?? s.created_at), winStart, now),
        );
        return {
          ...m,
          _status: statusOf(m, activeIds),
          _sessions: ses.length,
          _hours: ses.reduce((a, s) => a + sessionHours(s, now), 0),
          _running: ses.some((s) => !s.end_at),
        };
      }),
    [machines, sessions, activeIds, winStart, now],
  );

  const myEntries = useMemo(() => {
    if (!myId) return [];
    const mine = [
      ...sessions
        .filter((s) => String(s.created_by ?? '') === myId && inWin(ts(s.start_at ?? s.created_at), winStart, now))
        .map((s) => ({ id: String(s.id), text: `Session · ${String(s.machine_id).slice(0, 8)} · ${fmt2(sessionHours(s, now))} hrs`, t: ts(s.start_at ?? s.created_at) })),
      ...fuelLogs
        .filter((f) => String(f.created_by ?? '') === myId && inWin(ts(f.created_at), winStart, now))
        .map((f) => ({ id: String(f.id), text: `Fuel · ${fmtInt(num(f.litres))} L`, t: ts(f.created_at) })),
      ...expenses
        .filter((e) => String(e.created_by ?? '') === myId && inWin(ts(e.date ?? e.created_at), winStart, now))
        .map((e) => ({ id: String(e.id), text: `Expense · ${String(e.category_name ?? e.category ?? 'Other')}`, t: ts(e.date ?? e.created_at) })),
    ];
    return mine.sort((a, b) => b.t - a.t).slice(0, 5);
  }, [sessions, fuelLogs, expenses, myId, winStart, now]);

  const axisTick = { fontSize: 11, fill: '#6B7280' };
  const rangeSpan = range === '1d' ? dayLabel(new Date(now)) : `${dayLabel(new Date(winStart))} – ${dayLabel(new Date(now))}`;

  return (
    <div className="space-y-6">
      {/* Title + quick actions */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-lg">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Fleet OS Today</h1>
            <p className="text-sm text-blue-100">Operations overview · {rangeSpan}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
              <>
                <Link href="/work-session/new">
                  <Button size="sm" className="bg-white text-blue-600 hover:bg-blue-50">
                    <Play className="mr-2 h-4 w-4" /> Start Session
                  </Button>
                </Link>
                <Link href="/fuel/new">
                  <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <Fuel className="mr-2 h-4 w-4" /> Log Fuel
                  </Button>
                </Link>
                <Link href="/expense/new">
                  <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <Receipt className="mr-2 h-4 w-4" /> Log Expense
                  </Button>
                </Link>
                <Link href="/cash-count">
                  <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <ClipboardCheck className="mr-2 h-4 w-4" /> Cash Count
                  </Button>
                </Link>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setNonce((n) => n + 1)} className="border-white/30 text-white hover:bg-white/10">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="inline-flex items-center rounded-lg bg-white/20 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${range === r.key ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">Loading dashboard...</div>
        </div>
      ) : (
        <>
          {/* KPI cards — operational only, no money */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {kpiCards.map((k, i) => {
              const gradients = [
                'from-emerald-500 to-teal-500',
                'from-amber-500 to-orange-500',
                'from-blue-500 to-indigo-500',
                'from-cyan-500 to-blue-500',
                'from-slate-500 to-gray-600',
                'from-red-500 to-rose-500',
              ];
              return (
                <div key={k.title} className={`overflow-hidden rounded-xl bg-gradient-to-br ${gradients[i]} p-4 shadow-lg`}>
                  <p className="text-sm font-medium text-white/80">{k.title}</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {k.value}
                    {k.unit && <span className="ml-1 text-sm font-normal text-white/70">{k.unit}</span>}
                  </p>
                  {k.prev !== '' ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-white/70">vs {k.prev}</span>
                      <Delta value={k.delta} format={k.deltaFmt} invert={k.invert} />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-white/70">
                      {dueTasks.filter((t) => String(t.status).toLowerCase() === 'overdue').length} overdue
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Row 1 */}
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-slate-900">Sessions per machine</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perMachine} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} interval="preserveStartEnd" />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="billable" name="billable sessions" stackId="a" fill={AMBER} />
                    <Bar dataKey="nonBillable" name="non-billable sessions" stackId="a" fill={GRAY} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[
                { color: AMBER, label: 'billable_sessions' },
                { color: GRAY, label: 'non_billable_sessions' },
              ]} />
            </div>

            <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-slate-900">Reporting — last 7 days</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compliance} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} interval="preserveStartEnd" />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="reporting" name="reporting machines" stackId="c" fill={AMBER} />
                    <Bar dataKey="silent" name="silent machines" stackId="c" fill={INK} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[
                { color: AMBER, label: 'machines_reporting' },
                { color: INK, label: 'machines_silent' },
              ]} />
            </div>
          </div>

          {/* Row 2 mixed */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-slate-900">Fuel litres & operating hours</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyOps}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} interval="preserveStartEnd" />
                    <YAxis yAxisId="l" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="r" orientation="right" tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar yAxisId="l" dataKey="litres" name="litres" fill={GRAY} />
                    <Line yAxisId="r" type="monotone" dataKey="opHrs" name="operating hours" stroke={AMBER} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[
                { color: GRAY, label: 'fuel_logged_in_litres' },
                { color: AMBER, label: 'time_operating_in_hours' },
              ]} />
            </div>

            <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-base font-semibold text-slate-900">Downtime by reason</h3>
              <p className="text-xs text-slate-500 mt-1">Hours in selected range</p>
              {byReason.length === 0 ? (
                <p className="text-sm text-slate-500 mt-4">No downtime recorded — good shift.</p>
              ) : (
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byReason} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="reason" tick={axisTick} tickLine={false} axisLine={false} width={110} />
                      <Tooltip />
                      <Bar dataKey="hours" name="hours" fill={AMBER} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: fleet status + maintenance / my entries / alerts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Gauge className="h-4 w-4 text-slate-500" /> Machine status
              </h3>
              {fleetRows.length === 0 ? (
                <p className="text-sm text-slate-500 mt-4">No machines yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E2DB] text-left text-slate-500">
                        <th className="py-2 pr-2 font-medium">Machine</th>
                        <th className="py-2 pr-2 font-medium">Sessions</th>
                        <th className="py-2 pr-2 font-medium">Hours</th>
                        <th className="py-2 pr-2 font-medium">Status</th>
                        <th className="py-2 text-right font-medium">Log</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fleetRows.slice(0, 10).map((m) => (
                        <tr key={String(m.id)} className="border-b border-[#E5E2DB] last:border-0 hover:bg-slate-50">
                          <td className="py-2 pr-2 font-medium">
                            {String(m.code ?? '—')}
                            {m._running === true && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">running</span>}
                          </td>
                          <td className="py-2 pr-2">{num(m._sessions)}</td>
                          <td className="py-2 pr-2">{fmt2(num(m._hours))}</td>
                          <td className="py-2 pr-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(String(m._status))}`}>
                              {String(m._status).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {!isReadOnly && (
                              <Link href="/work-session/new" className="text-xs font-medium text-blue-600 hover:text-blue-800">
                                + Entry
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Wrench className="h-4 w-4 text-slate-500" /> Maintenance due
                </h3>
                {dueTasks.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-4">Nothing due — fleet is healthy.</p>
                ) : (
                  <ul className="mt-4 space-y-2 text-sm">
                    {dueTasks.slice(0, 5).map((t, i) => (
                      <li key={String(t.task_id ?? t.id ?? i)} className="flex items-center justify-between rounded-lg border border-[#E5E2DB] p-3">
                        <span className="font-medium text-slate-800">{String(t._machine ?? '')} · {String(t.task_name ?? t.name ?? 'Task')}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${String(t.status).toLowerCase() === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {String(t.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <ClipboardCheck className="h-4 w-4 text-slate-500" /> My entries
                </h3>
                {myEntries.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-4">Nothing logged by you in this range yet.</p>
                ) : (
                  <ul className="mt-4 space-y-2 text-sm">
                    {myEntries.map((e) => (
                      <li key={e.id} className="rounded-lg bg-slate-50 p-3 text-slate-700">{e.text}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Bell className="h-4 w-4 text-slate-500" /> Alerts
                </h3>
                {alerts.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-4">No new alerts.</p>
                ) : (
                  <ul className="mt-4 space-y-2 text-sm">
                    {alerts.map((a) => (
                      <li key={String(a.id)} className="flex gap-3 rounded-lg border border-[#E5E2DB] p-3">
                        {String(a.severity ?? '').toLowerCase() === 'critical'
                          ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          : <Pause className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                        <span className="text-slate-700">{String(a.message ?? a.type ?? 'Alert')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
