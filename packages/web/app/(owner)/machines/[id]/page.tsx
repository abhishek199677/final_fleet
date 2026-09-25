'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowLeft, ChevronDown, Clock, Fuel, Gauge as GaugeIcon, Star, Tractor, User, Wrench } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { apiPatch } from '@/lib/api/mutations';
import { fetchListStrict } from '@/lib/api/fetch-list';
import { ApiErrorBanner } from '@/components/api-error-banner';
import { Button } from '@/components/ui/button';

interface Row extends Record<string, unknown> {
  id?: string;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function ts(v: unknown): number {
  const t = new Date(String(v ?? '')).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

function minorToMoney(minor: unknown): string {
  return `₹${(num(minor) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '—';
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

function dayLabel(d: Date): string {
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
}

/** Semicircular gauge with needle, 0–100 scale. */
function Gauge({ value, display, sub }: { value: number; display: string; sub: string }) {
  const v = Math.max(0, Math.min(100, value));
  const cx = 100;
  const cy = 92;
  const r = 78;
  const ang = (180 - (v / 100) * 180) * (Math.PI / 180);
  const nx = cx + (r - 18) * Math.cos(ang);
  const ny = cy - (r - 18) * Math.sin(ang);
  return (
    <div>
      <svg viewBox="0 0 200 105" className="w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#F4F4F5" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#F4F4F5" />
      </svg>
      <p className="mt-1 text-center text-xl font-bold text-slate-900">{display}</p>
      <p className="text-center text-xs text-slate-500">{sub}</p>
    </div>
  );
}

/** Progress ring, 0–100 scale. */
function Ring({ pct, display, sub }: { pct: number; display: string; sub: string }) {
  const v = Math.max(0, Math.min(100, pct));
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div>
      <div className="relative mx-auto h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Fuel className="h-4 w-4 text-slate-500" />
          <p className="text-lg font-bold text-slate-900">{display}</p>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function NightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export default function MachineDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [machine, setMachine] = useState<Row | null>(null);
  const [machineList, setMachineList] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [fuelLogs, setFuelLogs] = useState<Row[]>([]);
  const [downtime, setDowntime] = useState<Row[]>([]);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [deployment, setDeployment] = useState<Row | null>(null);
  const [operators, setOperators] = useState<Row[]>([]);
  const [contrib, setContrib] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  // Editing state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Bumped by the error-banner Retry button to re-run the load effect
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({
    code: '',
    type: '',
    make: '',
    model: '',
    year: '',
    chassis_no: '',
    primary_meter_type: 'hours',
    status_flag: 'active',
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const getOne = async (path: string): Promise<Row | null | 'not-found'> => {
      try {
        const res = await authFetch(path);
        if (res.status === 404) return 'not-found';
        if (!res.ok) return null;
        const j = await res.json();
        return j && typeof j === 'object' && !Array.isArray(j) ? (j as Row) : null;
      } catch {
        return null;
      }
    };
    setApiError(false);
    void Promise.all([
      getOne(`/api/v1/machines/${id}`),
      fetchListStrict<Row>('/api/v1/machines'),
      fetchListStrict<Row>(`/api/v1/work-sessions?machine_id=${id}`),
      fetchListStrict<Row>(`/api/v1/fuel-downtime/fuel-logs?machine_id=${id}`),
      fetchListStrict<Row>(`/api/v1/fuel-downtime/downtime?machine_id=${id}`),
      fetchListStrict<Row>(`/api/v1/maintenance/machines/${id}/status`),
      getOne(`/api/v1/deployments/machine/${id}/active`),
      fetchListStrict<Row>('/api/v1/operators'),
      fetchListStrict<Row>('/api/v1/billing/contribution'),
    ]).then(([m, ml, s, f, d, t, dep, ops, c]) => {
      const row = m && m !== 'not-found' ? m : null;
      // null => outage (banner + retry); 'not-found' => genuinely missing machine
      if (m === null) setApiError(true);
      setMachine(row);
      setMachineList(ml);
      setSessions(s);
      setFuelLogs(f);
      setDowntime(d);
      setTasks(t);
      setDeployment(dep && dep !== 'not-found' ? dep : null);
      setOperators(ops);
      setContrib(c.find((x) => String(x.machine_id) === String(id)) ?? null);

      // Populate form for editing
      if (row) {
        setForm({
          code: String(row.code ?? ''),
          type: String(row.type ?? ''),
          make: String(row.make ?? ''),
          model: String(row.model ?? ''),
          year: String(row.year ?? ''),
          chassis_no: String(row.chassis_no ?? ''),
          primary_meter_type: String(row.primary_meter_type ?? 'hours'),
          status_flag: String(row.status_flag ?? 'active'),
        });
      }
    }).catch(() => {
      // API down → banner only, never fabricate a machine record
      setApiError(true);
    }).finally(() => setLoading(false));
  }, [id, reloadKey]);
  //     setContrib(c.find((x) => String(x.machine_id) === String(id)) ?? null);
  //   }).finally(() => setLoading(false));
  // }, [id]);

  const now = useMemo(() => Date.now(), []);
  const todayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);
  const weekStart = todayStart - 6 * 86_400_000;

  const unit = String(machine?.meter_unit_label ?? machine?.primary_meter_type ?? 'hrs');

  // 14-day meter-units series for the purple area chart
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

  const daysReported14 = useMemo(
    () => new Set(sessions.filter((x) => ts(x.start_at ?? x.created_at) >= todayStart - 13 * 86_400_000).map((x) => dayLabel(new Date(ts(x.start_at ?? x.created_at))))).size,
    [sessions, todayStart],
  );
  const utilisation = Math.round((daysReported14 / 14) * 100);

  const month30 = useMemo(() => sessions.filter((x) => ts(x.start_at ?? x.created_at) >= todayStart - 29 * 86_400_000), [sessions, todayStart]);
  const photoCount = month30.filter((x) => x.start_photo_key || x.end_photo_key).length;
  const evidence = month30.length > 0 ? Math.round((photoCount / month30.length) * 100) : 0;

  const todaySes = useMemo(() => sessions.filter((x) => ts(x.start_at ?? x.created_at) >= todayStart), [sessions, todayStart]);
  const unitsToday = todaySes.reduce((a, x) => a + sessionUnits(x), 0);
  const hoursToday = todaySes.reduce((a, x) => a + sessionHours(x, now), 0);
  const litresToday = fuelLogs.filter((f) => ts(f.created_at) >= todayStart).reduce((a, f) => a + num(f.litres), 0);
  const litres30 = fuelLogs.filter((f) => ts(f.created_at) >= todayStart - 29 * 86_400_000).reduce((a, f) => a + num(f.litres), 0);
  const units30 = month30.reduce((a, x) => a + sessionUnits(x), 0);
  const litresPerUnit = units30 > 0 ? litres30 / units30 : 0;
  const dt30 = downtime.filter((d) => ts(d.started_at ?? d.created_at) >= todayStart - 29 * 86_400_000).reduce((a, d) => a + (ts(d.ended_at ?? now) - ts(d.started_at)) / 3_600_000, 0);

  // Operator = latest session's operator
  const latestSes = useMemo(() => [...sessions].sort((a, b) => ts(b.start_at) - ts(a.start_at))[0], [sessions]);
  const operator = useMemo(
    () => operators.find((o) => String(o.id) === String(latestSes?.operator_id)),
    [operators, latestSes],
  );
  const opName = String(operator?.name ?? 'Unassigned');
  const opSes = useMemo(
    () => (latestSes?.operator_id ? sessions.filter((x) => String(x.operator_id) === String(latestSes.operator_id)) : []),
    [sessions, latestSes],
  );
  const opTodayHrs = opSes.filter((x) => ts(x.start_at ?? x.created_at) >= todayStart).reduce((a, x) => a + sessionHours(x, now), 0);
  const opWeekHrs = opSes.filter((x) => ts(x.start_at ?? x.created_at) >= weekStart).reduce((a, x) => a + sessionHours(x, now), 0);
  const opWorking = todaySes.length > 0;

  // Next service
  const nextTask = useMemo(() => {
    const rank = (s: string) => (s === 'overdue' ? 0 : s === 'warning' ? 1 : 2);
    return [...tasks].sort((a, b) => rank(String(a.status)) - rank(String(b.status)))[0];
  }, [tasks]);
  const nextStatus = String(nextTask?.status ?? 'ok');
  const dueText = !nextTask ? 'No tasks configured'
    : nextTask.trigger_type === 'calendar' || num(nextTask.days_to_due, NaN) >= 0 && !Number.isFinite(num(nextTask.units_to_due, NaN)) || (nextTask.days_to_due !== null && nextTask.days_to_due !== undefined && (nextTask.units_to_due === null || nextTask.units_to_due === undefined))
      ? `${num(nextTask.days_to_due)} days remaining`
      : `${fmtInt(num(nextTask.units_to_due))} ${unit} remaining`;

  // Deployment
  const siteName = String(deployment?.site_name ?? deployment?.site ?? '—');
  const clientName = String(deployment?.client_name ?? deployment?.client ?? '—');
  const daysDeployed = deployment && ts(deployment.start_date ?? deployment.created_at)
    ? Math.max(1, Math.round((now - ts(deployment.start_date ?? deployment.created_at)) / 86_400_000))
    : 0;
  const reportPct30 = Math.round((new Set(month30.map((x) => dayLabel(new Date(ts(x.start_at ?? x.created_at))))).size / 30) * 100);

  // Finance (owner-only route)
  const billed = num(contrib?.billed_minor);
  const costs = num(contrib?.diesel_minor) + num(contrib?.parts_minor) + num(contrib?.labour_minor);
  const contribution = billed - costs;

  const statusLabel = String(machine?.status_flag ?? '—');

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/v1/machines/${id}`, {
        code: form.code,
        type: form.type,
        make: form.make || undefined,
        model: form.model || undefined,
        year: form.year ? parseInt(form.year) : undefined,
        chassis_no: form.chassis_no || undefined,
        primary_meter_type: form.primary_meter_type,
        meter_unit_label: form.primary_meter_type,
        status_flag: form.status_flag,
      });
      setEditing(false);
      // Refresh data by refetching the machine
      const res = await authFetch(`/api/v1/machines/${id}`);
      if (res.ok) {
        const updatedMachine = await res.json();
        setMachine(updatedMachine);
        // Also update the form with the refreshed data
        setForm({
          code: updatedMachine.code ?? '',
          type: updatedMachine.type ?? '',
          make: updatedMachine.make ?? '',
          model: updatedMachine.model ?? '',
          year: updatedMachine.year ?? '',
          chassis_no: updatedMachine.chassis_no ?? '',
          primary_meter_type: updatedMachine.primary_meter_type ?? 'hours',
          status_flag: updatedMachine.status_flag ?? 'active',
        });
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!machine) {
    // Outage (transient 5xx / network) → banner with retry, NOT a fake 404
    if (apiError) {
      return (
        <div className="p-4 md:p-6">
          <ApiErrorBanner onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      );
    }
    return <p>Machine not found</p>;
  }

  return (
    <div className="p-4 md:p-6">
      {apiError && <div className="mb-4"><ApiErrorBanner /></div>}
      {/* Header: back + selector */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/machines" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Fleet
        </Link>
        <div className="relative">
          <select
            value={String(machine.id)}
            onChange={(e) => router.push(`/machines/${e.target.value}`)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-slate-900 outline-none"
          >
            {machineList.map((m) => (
              <option key={String(m.id)} value={String(m.id)} className="bg-white">
                {String(m.code)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-500" />
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">{statusLabel}</span>

        {/* Edit controls */}
        {editing ? (
          <>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={() => { void handleSave(); }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button onClick={() => setEditing(true)} className="ml-2">Edit</Button>
        )}
      </div>

      {editing ? (
            <div className="grid gap-4">
              {/* Edit Form */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Code and Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type…</option>
                      <option value="excavator">Excavator</option>
                      <option value="dump_truck">Dumper</option>
                      <option value="dozer">Dozer</option>
                      <option value="wheel_loader">Wheel Loader</option>
                      <option value="backhoe">Backhoe</option>
                      <option value="crane">Crane</option>
                      <option value="bulldozer">Bulldozer</option>
                      <option value="grader">Grader</option>
                      <option value="compactor">Compactor</option>
                      <option value="roller">Roller</option>
                      <option value="telehandler">Telehandler</option>
                      <option value="forklift">Forklift</option>
                      <option value="motor_grader">Motor Grader</option>
                      <option value="motor_scraper">Motor Scraper</option>
                      <option value="pipelayer">Pipelayer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Make and Model */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                    <input
                      type="text"
                      value={form.make}
                      onChange={(e) => setForm({ ...form, make: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Year and Chassis */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1970"
                      max="2099"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chassis No</label>
                    <input
                      type="text"
                      value={form.chassis_no}
                      onChange={(e) => setForm({ ...form, chassis_no: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Meter Type and Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meter Type *</label>
                    <select
                      value={form.primary_meter_type}
                      onChange={(e) => setForm({ ...form, primary_meter_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="hours">hours</option>
                      <option value="km">km</option>
                      <option value="cycles">cycles</option>
                      <option value="metres">metres</option>
                      <option value="tonnes">tonnes</option>
                      <option value="trips">trips</option>
                    </select>
                    <p className="text-xs text-slate-500">
                      Used for tracking usage — hours, distance, cycles, etc.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={form.status_flag}
                      onChange={(e) => setForm({ ...form, status_flag: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="service">In Service</option>
                      <option value="stopped">Stopped</option>
                      <option value="transit">In Transit</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-12">
              {/* View Mode - Original Content */}
              {/* Left column */}
              <div className="space-y-4 xl:col-span-4">
                <NightCard>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                        <GaugeIcon className="h-4 w-4 text-slate-500" /> Utilisation Performance
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">Daily meter units vs rest days · last 14 days</p>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">↻</span>
                  </div>
                  <div className="mt-3 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={units14}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.08)" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={1} />
                        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#1E293B' }} />
                        <Area type="monotone" dataKey="units" name={`units (${unit})`} stroke="#8B5CF6" strokeWidth={2} fill="#8B5CF6" fillOpacity={0.45} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </NightCard>

                <NightCard>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{String(machine.code)}</h2>
                      <p className="text-xs text-slate-500">
                        {String(machine.make ?? '')} {String(machine.model ?? '')} · {String(machine.year ?? '')} · {String(machine.chassis_no ?? machine.serial ?? 'no serial')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-slate-900">{siteName} → {clientName}</p>
                      <p className="text-slate-500">{daysDeployed}d <span className="text-xs">deployed</span></p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${reportPct30}%` }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <p className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="h-4 w-4" /> Next service: {String(nextTask?.task_name ?? '—')}
                      </p>
                      <p className="text-slate-900">{dueText}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">Utilisation</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${utilisation >= 70 ? 'bg-green-50 text-green-600' : utilisation >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                          {utilisation >= 70 ? 'High' : utilisation >= 40 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                      <Gauge value={utilisation} display={`${utilisation}%`} sub="days reported · 14d" />
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">Evidence</p>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">{evidence}%</span>
                      </div>
                      <Ring pct={evidence} display={`${evidence}%`} sub="photo-verified · 30d" />
                    </div>
                  </div>

                  {(nextStatus === 'overdue' || nextStatus === 'warning') && nextTask && (
                    <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${nextStatus === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <p>
                        <span className="font-semibold">{nextStatus === 'overdue' ? 'Service overdue' : 'Service due soon'}:</span>{' '}
                        {String(nextTask.task_name)} ({dueText})
                      </p>
                    </div>
                  )}
                </NightCard>
              </div>

              {/* Right column */}
              <div className="space-y-4 xl:col-span-8">
                <NightCard>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold text-slate-900">Deployment</h3>
                    <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {deployment ? 'On site' : 'No active deployment'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-900">
                        ⛽ {fmtInt(units30)} <span className="text-slate-500">/ {unit} this month</span>
                      </p>
                      <p className="text-xs text-slate-500">Meter units logged</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500">{reportPct30}%</span>
                        <Bar pct={reportPct30} color="#F59E0B" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-900">
                        ▤ {fmtInt(litres30)} <span className="text-slate-500">/ L · {litresPerUnit > 0 ? `${litresPerUnit.toFixed(2)} L/${unit}` : '—'}</span>
                      </p>
                      <p className="text-xs text-slate-500">Diesel efficiency</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500">{evidence}%</span>
                        <Bar pct={evidence} color="#F87171" />
                      </div>
                    </div>
                  </div>

                  {/* Visual panel */}
                  <div className="relative mt-4 overflow-hidden rounded-xl bg-slate-50 p-6">
                    <div className="pointer-events-none absolute inset-x-16 bottom-8 h-px bg-slate-200" />
                    <div className="flex flex-col items-center py-4">
                      <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
                        <Tractor className="h-10 w-10 text-amber-600" />
                      </span>
                      <p className="mt-3 text-3xl font-bold text-slate-900">
                        {fmtInt(num(machine.current_meter))} <span className="text-base font-normal text-slate-500">{unit}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Current meter · {String(machine.type ?? '')}</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                        {[
                          `${todaySes.length} sessions today`,
                          `${hoursToday.toFixed(1)} hrs today`,
                          `${fmtInt(litresToday)} L today`,
                          `${dt30.toFixed(1)} hrs downtime · 30d`,
                        ].map((chip) => (
                          <span key={chip} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-500">{chip}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </NightCard>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  <NightCard className="md:col-span-2 2xl:col-span-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-900">
                        {initials(opName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{opName}</p>
                        <p className="truncate text-xs text-slate-500">Assigned Operator</p>
                      </div>
                      <span className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${opWorking ? 'bg-teal-50 text-teal-600' : 'bg-slate-200 text-slate-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${opWorking ? 'bg-teal-300' : 'bg-slate-400'}`} />
                        {opWorking ? 'Working' : 'Idle'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 text-center">
                      <div>
                        <p className="flex items-center justify-center gap-1 font-semibold text-slate-900"><Clock className="h-3.5 w-3.5 text-slate-500" />{opTodayHrs.toFixed(1)}h</p>
                        <p className="text-[11px] text-slate-500">Hours Today</p>
                      </div>
                      <div>
                        <p className="flex items-center justify-center gap-1 font-semibold text-slate-900"><Clock className="h-3.5 w-3.5 text-slate-500" />{opWeekHrs.toFixed(0)}h</p>
                        <p className="text-[11px] text-slate-500">This Week</p>
                      </div>
                      <div>
                        <p className="flex items-center justify-center gap-1 font-semibold text-slate-900"><Star className="h-3.5 w-3.5 text-slate-500" />{opSes.length}</p>
                        <p className="text-[11px] text-slate-500">Sessions</p>
                      </div>
                    </div>
                  </NightCard>

                  <NightCard>
                    <p className="text-xs text-slate-500">Meter today</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">⚙ {unitsToday.toFixed(1)} <span className="text-sm font-normal text-slate-500">{unit}</span></p>
                    <span className="mt-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500">Today</span>
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">Current reading</p>
                      <p className="text-sm font-semibold text-slate-900">{fmtInt(num(machine.current_meter))} {unit}</p>
                      <div className="mt-2"><Bar pct={Math.min(100, (unitsToday / Math.max(units30 / 30, 1)) * 100)} color="#F87171" /></div>
                    </div>
                  </NightCard>

                  <NightCard>
                    <p className="text-xs text-slate-500">Diesel</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-slate-900">
                      <Fuel className="h-4 w-4 text-slate-500" /> {fmtInt(litresToday)} L
                    </p>
                    <span className="mt-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500">Today</span>
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">{litresPerUnit > 0 ? `${litresPerUnit.toFixed(2)} L/${unit} · 30d` : 'No efficiency data yet'}</p>
                      <p className="text-sm font-semibold text-slate-900">{fmtInt(litres30)} L · 30d</p>
                    </div>
                  </NightCard>

                  <NightCard>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500"><User className="h-3.5 w-3.5" /> Contribution · 30d</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{minorToMoney(contribution)}</p>
                    <div className="mt-3 space-y-1 text-xs">
                      <p className="flex justify-between text-slate-500"><span>Billed</span><span className="text-slate-900">{minorToMoney(billed)}</span></p>
                      <p className="flex justify-between text-slate-500"><span>Direct costs</span><span className="text-slate-900">{minorToMoney(costs)}</span></p>
                      <div className="flex items-center gap-1.5 pt-1 text-slate-500"><Wrench className="h-3.5 w-3.5" />{tasks.length} tasks tracked</div>
                    </div>
                  </NightCard>
                </div>
              </div>
            </div>
          )
        }
      </div>
    );
  }
