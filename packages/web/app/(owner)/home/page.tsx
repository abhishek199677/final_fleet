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
  Anchor, ArrowDown, ArrowUp, Bell, Container, Download,
  Filter, Fuel, Gauge, MapPin, Pause, RefreshCw, Route,
  Ship, Timer, TriangleAlert, Wrench,
} from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

const BLUE = '#3B82F6';
const GREEN = '#22C55E';
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

const DOT: Record<string, string> = {
  working: GREEN,
  log_pending: AMBER,
  stopped: RED,
  service: BLUE,
  transit: PURPLE,
};

function statusPill(status: string): string {
  const map: Record<string, string> = {
    working: 'bg-green-500/15 text-green-400',
    log_pending: 'bg-amber-500/15 text-amber-400',
    stopped: 'bg-red-500/15 text-red-400',
    service: 'bg-blue-500/15 text-blue-400',
    transit: 'bg-purple-500/15 text-purple-400',
  };
  return map[status] ?? 'bg-white/10 text-night-muted';
}

function NightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-night-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function DashboardInner() {
  const t = useTranslations('dashboard');
  const searchParams = useSearchParams();
  void searchParams;
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

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
  const [riskByMachine, setRiskByMachine] = useState<Map<string, string>>(new Map());

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
    Promise.all([
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
      setAlerts(al.filter((x) => x.is_resolved !== true).slice(0, 4));
      // Maintenance risk per machine (shared ops-readable view)
      Promise.all(m.map((mm) => fetchList<Row>(`/api/v1/maintenance/machines/${mm.id}/status`)))
        .then((lists) => {
          const map = new Map<string, string>();
          lists.forEach((list, i) => {
            if (list.length === 0) return;
            const st8 = list.map((t) => String(t.status ?? 'ok').toLowerCase());
            map.set(
              String(m[i].id),
              st8.includes('overdue') ? 'High' : st8.includes('warning') ? 'Medium' : 'Low',
            );
          });
          setRiskByMachine(map);
        })
        .catch(() => undefined);
    }).finally(() => setLoading(false));
  }, [nonce]);

  const now = useMemo(() => Date.now(), [nonce]);
  const todayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);
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

  const liveMachines = useMemo(() => withStatus.filter((m) => String(m._status) !== 'stopped' || activeIdsToday.has(String(m.id))), [withStatus, activeIdsToday]);
  const fleetActive = machines.filter((m) => !['retired', 'inactive'].includes(String(m.status_flag ?? '').toLowerCase()));
  const reportingToday = activeIdsToday.size;
  const onSite = deployments.filter((d) => ['active', 'on_hold_payment'].includes(String(d.status ?? 'active').toLowerCase())).length || deployments.length;
  const underService = withStatus.filter((m) => m._status === 'service').length;
  const logPending = withStatus.filter((m) => m._status === 'log_pending').length;

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

  const stats = [
    { title: t('activeMachines'), value: String(fleetActive.length), caption: `+${reportingToday} today`, delta: null as string | null, icon: Ship },
    { title: t('onSite'), value: String(onSite), caption: `${deployments.length} deployments`, delta: null, icon: Anchor },
    { title: t('underService'), value: String(underService), caption: 'in workshop', delta: null, icon: Wrench },
    { title: t('logPending'), value: String(logPending), caption: 'no session today', delta: null, icon: Pause },
    { title: t('downtime'), value: `${fmt2(cur14.dtPct)}%`, caption: null, delta: `${cur14.dtPct - prv14.dtPct >= 0 ? '+' : ''}${fmt2(cur14.dtPct - prv14.dtPct)}pp`, down: cur14.dtPct - prv14.dtPct <= 0, icon: Timer },
    { title: t('utilisation'), value: `${fmt2(cur14.util)}%`, caption: null, delta: `${cur14.util - prv14.util >= 0 ? '+' : ''}${fmt2(cur14.util - prv14.util)}pp`, down: cur14.util - prv14.util < 0, icon: Gauge },
  ];

  // Finance strip (RPT-01)
  const totalBilled = num(kpis?.total_billed_minor);
  const totalReceipts = num(kpis?.total_receipts_minor);
  const outstanding = receivables.reduce(
    (a, r) => a + num(r.balance_minor ?? (num(r.billed_minor) + num(r.extras_minor) - num(r.credits_minor) - num(r.receipts_minor) - num(r.advances_consumed_minor))),
    0,
  );
  const unusedAdv = advances.reduce((a, x) => a + num(x.remaining_minor), 0);

  // Deployment board grouped by site
  const siteById = useMemo(() => new Map(sites.map((s) => [String(s.id), s])), [sites]);
  const clientById = useMemo(() => new Map(clients.map((c) => [String(c.id), String(c.name ?? '')])), [clients]);
  const board = useMemo(() => {
    const groups = new Map<string, { site: string; client: string; machines: Row[] }>();
    const deps: Row[] = deployments.length > 0 ? deployments : machines.map((m): Row => ({ machine_id: m.id, site_id: null }));
    deps.forEach((d) => {
      const site = siteById.get(String(d.site_id ?? ''));
      const key = String(d.site_id ?? d.site_name ?? 'undeployed');
      const name = String(d.site_name ?? site?.name ?? 'Undeployed');
      const client = String(d.client_name ?? clientById.get(String(site?.client_id ?? '')) ?? '');
      if (!groups.has(key)) groups.set(key, { site: name, client, machines: [] });
      const m = machines.find((x) => String(x.id) === String(d.machine_id ?? d.id));
      if (m) groups.get(key)!.machines.push(withStatus.find((x) => String(x.id) === String(m.id)) ?? m);
    });
    // Machines without any deployment row
    machines.forEach((m) => {
      const covered = [...groups.values()].some((g) => g.machines.some((x) => String(x.id) === String(m.id)));
      if (!covered) {
        if (!groups.has('undeployed')) groups.set('undeployed', { site: 'Undeployed', client: '', machines: [] });
        groups.get('undeployed')!.machines.push(withStatus.find((x) => String(x.id) === String(m.id)) ?? m);
      }
    });
    return [...groups.values()].sort((a, b) => b.machines.length - a.machines.length).slice(0, 6);
  }, [deployments, machines, withStatus, siteById, clientById]);
  const topSite = board[0];

  // 14-day meter units + average
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
  const unitsTotal14 = units14.reduce((a, x) => a + x.units, 0);
  const chartData = units14.map((x) => ({ ...x, avg: Math.round(avgUnits * 10) / 10 }));

  // Current deployments table
  const tableRows: Row[] = useMemo(() => {
    const rows: Row[] = deployments.length > 0 ? deployments : machines.map((m): Row => ({ machine_id: m.id }));
    return rows.slice(0, 6).map((d): Row => {
      const m = machines.find((x) => String(x.id) === String(d.machine_id ?? d.id));
      const site = siteById.get(String(d.site_id ?? ''));
      const unitsToday = sessions
        .filter((x) => String(x.machine_id) === String(m?.id) && ts(x.start_at ?? x.created_at) >= todayStart)
        .reduce((a, x) => a + sessionUnits(x), 0);
      return {
        ...d,
        _code: String(m?.code ?? '—'),
        _mid: String(m?.id ?? ''),
        _site: String(d.site_name ?? site?.name ?? '—'),
        _client: String(d.client_name ?? clientById.get(String(site?.client_id ?? '')) ?? '—'),
        _status: m ? statusOf(m, activeIdsToday) : 'log_pending',
        _units: Math.round(unitsToday * 10) / 10,
        _risk: riskByMachine.get(String(m?.id ?? '')) ?? '—',
      };
    });
  }, [deployments, machines, sessions, siteById, clientById, activeIdsToday, riskByMachine, todayStart]);

  const acknowledge = async (alertId: string) => {
    try {
      await authFetch(`/api/v1/alerts/${alertId}/acknowledge`, { method: 'POST', body: JSON.stringify({}) });
    } catch {
      /* optimistic */
    }
    setAlerts((a) => a.filter((x) => String(x.id) !== alertId));
  };

  const downloadCsv = () => {
    const rows = tableRows.map((r) => [r._code, r._site, r._client, r._status, r._units, r._risk].join(','));
    const blob = new Blob([`machine,site,client,status,units_today,risk\n${rows.join('\n')}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'current-deployments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayStr = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  void liveMachines;

  return (
    <div className="rounded-2xl bg-night-base p-4 text-white md:p-6">
      {/* Greeting */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('welcomeBack')}</h2>
          <p className="text-sm text-night-muted">{todayStr} · {reportingToday} of {fleetActive.length} machines reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setNonce((n) => n + 1)} aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-night-card text-night-muted hover:text-white">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={downloadCsv} className="flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-4 text-sm font-semibold text-white hover:bg-blue-600">
            <Download className="h-4 w-4" /> {t('downloadReport')}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-night-muted">Loading...</p>
      ) : (
        <>
          {/* Finance strip */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: t('totalBilled'), value: minorToMoney(totalBilled) },
              { label: t('receipts'), value: minorToMoney(totalReceipts) },
              { label: t('outstanding'), value: minorToMoney(outstanding) },
              { label: t('unusedAdvances'), value: minorToMoney(unusedAdv) },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-night-card px-4 py-3">
                <p className="text-sm text-night-muted">{f.label}</p>
                <p className="text-lg font-bold">{f.value}</p>
              </div>
            ))}
          </div>

          {/* Stats + board + alerts */}
          <div className="mt-4 grid gap-4 xl:grid-cols-12">
            <div className="grid grid-cols-2 gap-4 xl:col-span-3">
              {stats.map((s) => (
                <NightCard key={s.title} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs text-night-muted">
                      <s.icon className="h-3.5 w-3.5" /> {s.title}
                    </p>
                    <Link href="/machines" className="text-night-muted hover:text-white">···</Link>
                  </div>
                  <p className="mt-2 text-3xl font-bold">{s.value}</p>
                  {s.delta !== null ? (
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.down ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {s.down ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}{s.delta}
                    </span>
                  ) : (
                    <p className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-night-muted">{s.caption}</p>
                  )}
                </NightCard>
              ))}
            </div>

            {/* Deployment board (map panel analogue) */}
            <NightCard className="xl:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('siteDeployments')}</h3>
                <div className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-night-muted">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
              </div>
              {board.length === 0 || machines.length === 0 ? (
                <p className="mt-4 text-sm text-night-muted">{t('noDeployments')}</p>
              ) : (
                <>
                  {topSite && (
                    <div className="mt-3 rounded-xl border border-blue-500/60 bg-blue-500/10 p-3 text-center text-sm">
                      <p className="font-semibold">{topSite.site}</p>
                      <p className="text-xs text-night-muted">{topSite.client || 'No client'} · {topSite.machines.length} machines on site</p>
                    </div>
                  )}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {board.map((g) => (
                      <div key={g.site} className="rounded-xl bg-night-raised p-3">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold">{g.site}</p>
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-night-muted">{g.machines.length}</span>
                        </div>
                        <p className="truncate text-[11px] text-night-muted">{g.client || '—'}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {g.machines.slice(0, 12).map((m) => (
                            <Link
                              key={String(m.id)}
                              href={`/machines/${m.id}`}
                              title={`${String(m.code)} · ${String(m._status).replace('_', ' ')}`}
                              className="h-3.5 w-3.5 rounded-full border border-white/20"
                              style={{ background: DOT[String(m._status)] ?? '#6B7280' }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-[11px] text-night-muted">
                {[
                  { c: GREEN, l: 'Working' },
                  { c: AMBER, l: 'Log pending' },
                  { c: RED, l: 'Stopped' },
                  { c: BLUE, l: 'Under service' },
                  { c: PURPLE, l: 'In transit' },
                ].map((it) => (
                  <span key={it.l} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: it.c }} /> {it.l}
                  </span>
                ))}
              </div>
            </NightCard>

            {/* Alerts */}
            <NightCard className="xl:col-span-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-night-muted" /> {t('alerts')}</h3>
                <span className="text-night-muted">···</span>
              </div>
              {alerts.length === 0 ? (
                <p className="mt-4 text-sm text-night-muted">{t('noAlerts')}</p>
              ) : (
                <div className="mt-3 max-h-96 space-y-4 overflow-y-auto">
                  {alerts.map((a) => {
                    const sev = String(a.severity ?? a.type ?? '').toLowerCase();
                    const critical = sev.includes('critical') || sev.includes('overdue') || sev.includes('hold');
                    return (
                      <div key={String(a.id)} className="border-b border-white/10 pb-4 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${critical ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                              <TriangleAlert className="h-3.5 w-3.5" />
                            </span>
                            {String(a.title ?? a.type ?? 'Alert')}
                          </p>
                          <span className="shrink-0 text-[11px] text-night-muted">
                            {a.created_at ? new Date(String(a.created_at)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="ml-9 text-xs text-night-muted">{String(a.message ?? a.machine_code ?? '')}</p>
                        <div className="ml-9 mt-2 flex gap-4 text-xs font-medium">
                          <button onClick={() => acknowledge(String(a.id))} className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20">
                            {t('acknowledge')}
                          </button>
                          <Link href="/machines" className="px-1 py-1.5 text-night-muted hover:text-white">
                            {t('viewFleet')}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </NightCard>
          </div>

          {/* Chart + table */}
          <div className="mt-4 grid gap-4 xl:grid-cols-12">
            <NightCard className="xl:col-span-7">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('meterUnitsPerDay')}</h3>
                <span className="text-night-muted">···</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-3xl font-bold">{fmtInt(unitsTotal14)}</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-night-muted">14 days</span>
              </div>
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={{ background: '#26262E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="units" name="meter units" fill={BLUE} radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="avg" name="average" stroke="#A1A1AA" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </NightCard>

            <NightCard className="xl:col-span-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('currentDeployments')}</h3>
                <Filter className="h-4 w-4 text-night-muted" />
              </div>
              {tableRows.length === 0 ? (
                <p className="mt-4 text-sm text-night-muted">{t('nothingDeployed')}</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs text-night-muted">
                        <th className="py-2 pr-2 font-medium">{t('machine')}</th>
                        <th className="py-2 pr-2 font-medium">{t('deployment')}</th>
                        <th className="py-2 pr-2 font-medium">{t('status')}</th>
                        <th className="py-2 pr-2 text-right font-medium">{t('units')}</th>
                        <th className="py-2 text-right font-medium">{t('risk')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r, i) => (
                        <tr key={`${String(r._mid)}-${i}`} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 pr-2">
                            {r._mid ? (
                              <Link href={`/machines/${r._mid}`} className="font-medium hover:underline">{String(r._code)}</Link>
                            ) : (
                              <span className="font-medium">{String(r._code)}</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-2 text-night-muted">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {String(r._site)} <span className="text-white/30">→</span> {String(r._client || '—')}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusPill(String(r._status))}`}>
                              {String(r._status).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2 text-right">{num(r._units)}</td>
                          <td className="py-2.5 text-right">
                            <span className="flex items-center justify-end gap-1.5 text-xs">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: String(r._risk) === 'High' ? RED : String(r._risk) === 'Medium' ? AMBER : String(r._risk) === 'Low' ? GREEN : '#6B7280' }}
                              />
                              {String(r._risk)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-night-muted">
                <Fuel className="h-3.5 w-3.5" /> Diesel efficiency and contribution live on each machine page
                <Route className="ml-2 h-3.5 w-3.5" /> <Container className="h-3.5 w-3.5" />
              </div>
            </NightCard>
          </div>
        </>
      )}
    </div>
  );
}

export default function OwnerHome() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <DashboardInner />
    </Suspense>
  );
}
