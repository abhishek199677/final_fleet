'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import Link from 'next/link';
import {
  Download, RefreshCw, TrendingUp, AlertTriangle,
  ArrowUpRight, MoreHorizontal, ChevronRight,
  Tractor, MapPin, Rocket, Building2, Users, LifeBuoy, Play,
} from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchListStrict } from '@/lib/api/fetch-list';
import { ApiErrorBanner } from '@/components/api-error-banner';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/dashboard/glass-card';
import { GlareCard } from '@/components/fx/glare-card';
import { Reveal } from '@/components/fx/reveal';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from '@/components/ui/carousel';

// Orbit hero — WebGL canvas, skip SSR
const OrbitDeliveryHero = dynamic(
  () => import('@/components/ui/orbit-delivery-hero'),
  { ssr: false },
);

interface Row extends Record<string, unknown> {
  id?: string;
}

const QUICK_ACTIONS = [
  { href: '/machines/new', label: 'Add machine', hint: 'Grow the fleet', icon: Tractor },
  { href: '/sites/new', label: 'New site', hint: 'Project location', icon: MapPin },
  { href: '/deployments/new', label: 'New deployment', hint: 'Assign a machine', icon: Rocket },
  { href: '/clients/new', label: 'Add client', hint: 'New account', icon: Building2 },
  { href: '/operators/new', label: 'Add operator', hint: 'Crew roster', icon: Users },
  { href: '/support', label: 'Support', hint: 'Report a problem', icon: LifeBuoy },
] as const;

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
  working: { label: 'Working', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  log_pending: { label: 'Idle', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  stopped: { label: 'Stopped', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  service: { label: 'In service', dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
  transit: { label: 'In transit', dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
};

/* ── Animated KPI ── */
function AnimatedKPI({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{fmtInt(display)}</>;
}

/* ── Progress ring for utilisation ── */
function ProgressRing({ value, size = 44, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-gray-100 dark:text-white/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

function DashboardInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  void searchParams;
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [period, setPeriod] = useState<'today' | 'month' | 'year'>('today');
  const [apiError, setApiError] = useState(false);

  const [kpis, setKpis] = useState<Row | null>(null);
  const [machines, setMachines] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [deployments, setDeployments] = useState<Row[]>([]);
  const [sites, setSites] = useState<Row[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [receivables, setReceivables] = useState<Row[]>([]);
  const [advances, setAdvances] = useState<Row[]>([]);
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [heroScale, setHeroScale] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const fadeStart = 100;
      const fadeEnd = 400;
      const opacity = 1 - Math.min(Math.max((scrollY - fadeStart) / (fadeEnd - fadeStart), 0), 1);
      const scale = 1 - Math.min(Math.max((scrollY - fadeStart) / (fadeEnd - fadeStart), 0), 1) * 0.03;
      setHeroOpacity(opacity);
      setHeroScale(scale);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    setApiError(false);
    void Promise.all([
      getKpis(),
      fetchListStrict<Row>('/api/v1/machines'),
      fetchListStrict<Row>('/api/v1/work-sessions'),
      fetchListStrict<Row>('/api/v1/deployments'),
      fetchListStrict<Row>('/api/v1/sites'),
      fetchListStrict<Row>('/api/v1/clients'),
      fetchListStrict<Row>('/api/v1/billing/receivables'),
      fetchListStrict<Row>('/api/v1/billing/unused-advances'),
      fetchListStrict<Row>('/api/v1/alerts'),
    ]).then(([k, m, s, d, st, c, r, a, al]) => {
      // API up → show exactly what's in the DB (empty = empty state)
      if (k) setKpis(k);
      setMachines(m);
      setSessions(s);
      setDeployments(d);
      setSites(st);
      setClients(c);
      setReceivables(r);
      setAdvances(a);
      setAlerts(al.filter((x) => x.is_resolved !== true).slice(0, 5));
    }).catch(() => {
      // API unreachable — show banner
      setApiError(true);
    }).finally(() => setLoading(false));
  }, [nonce]);

  const now = useMemo(() => Date.now(), [nonce]);
  const todayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);

  const activeIdsToday = useMemo(
    () => new Set(sessions.filter((s) => ts(s.start_at ?? s.created_at) >= todayStart).map((s) => String(s.machine_id))),
    [sessions, todayStart],
  );

  const withStatus: Row[] = useMemo(
    () => machines.map((m): Row => ({ ...m, _status: statusOf(m, activeIdsToday) })),
    [machines, activeIdsToday],
  );

  const fleetActive = machines.filter((m) => !['retired', 'inactive'].includes(String(m.status_flag ?? '').toLowerCase()));

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
        status: (String(m._status)) || 'log_pending',
        site: String(site?.name ?? '—'),
        todayHours: Math.round(unitsToday * 10) / 10,
      };
    });
  }, [withStatus, sites, sessions, todayStart]);

  const totalBilled = num(kpis?.total_billed_minor);
  const totalExpenses = num(kpis?.expense_total);
  const utilisation = num(kpis?.utilization_pct, 0);
  const workingNow = statusCounts.working || 0;
  const totalMachines = fleetActive.length || machines.length;

  // No revenue time-series endpoint exists yet — keep empty and show an
  // empty state instead of fabricating weekly numbers.
  const chartData: { label: string; revenue: number; cost: number }[] = [];

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
        <div className="h-24 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl animate-pulse lg:col-span-2" />
          <div className="h-80 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {apiError && <ApiErrorBanner onRetry={() => setNonce((n) => n + 1)} />}
      {/* Orbit Delivery Hero — fades on scroll */}
      <Reveal delay={0}>
        <div
          className="relative overflow-hidden rounded-2xl border border-white/18 bg-white/72 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-opacity duration-300 ease-out"
          style={{ opacity: heroOpacity, transform: `scale(${heroScale})`, transformOrigin: 'top center' }}
        >
          <div className="dashboard-hero">
            <OrbitDeliveryHero theme="auto" />
          </div>
        </div>
      </Reveal>

      {/* Header */}
      <Reveal delay={1}>
        <GlassCard hover={false}>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                Welcome back, {userName}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Here&apos;s what&apos;s happening with your fleet · {todayStr}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {/* Period toggle */}
              <ButtonGroup className="rounded-lg border border-white/20 bg-white/40 p-1 shadow-none backdrop-blur-md dark:bg-white/5">
                {(['today', 'month', 'year'] as const).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={period === p ? 'default' : 'ghost'}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'px-3',
                      period !== p &&
                        'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    )}
                  >
                    {p === 'today' ? 'Today' : p === 'month' ? 'Month' : 'Year'}
                  </Button>
                ))}
              </ButtonGroup>
              <button
                onClick={() => setNonce((n) => n + 1)}
                aria-label="Refresh"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/40 dark:bg-white/5 text-gray-500 backdrop-blur-md transition-all hover:bg-white/60 dark:hover:bg-white/10 hover:text-gray-700"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </button>
              <button className="flex h-9 items-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-100 px-4 text-sm font-medium text-white dark:text-gray-900 shadow-sm transition-all hover:bg-gray-800 dark:hover:bg-gray-200">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </GlassCard>
      </Reveal>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Working now */}
        <Reveal delay={0}>
          <GlareCard className="h-full">
            <div className="rounded-2xl border border-white/18 bg-white/72 dark:bg-white/5 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300 hover:bg-white/82 dark:hover:bg-white/8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 h-full">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Working now</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <div className="flex items-center">
                    <AnimatedKPI value={0} className="animate-pulse" />
                    <span className="text-lg font-normal text-gray-400 animate-pulse">/—</span>
                  </div>
                ) : (
                  <>
                    <AnimatedKPI value={workingNow} />
                    <span className="text-lg font-normal text-gray-400">/{totalMachines}</span>
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ProgressRing value={utilisation} />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Fleet utilisation</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{utilisation}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                      style={{ width: `${utilisation}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlareCard>
        </Reveal>

        {/* Revenue */}
        <Reveal delay={1}>
          <GlareCard className="h-full">
            <div className="rounded-2xl border border-white/18 bg-white/72 dark:bg-white/5 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300 hover:bg-white/82 dark:hover:bg-white/8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 h-full">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                  <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 animate-pulse">
                    ₹0
                  </p>
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                    {minorToMoney(totalBilled)}
                  </p>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Billed this {period === 'today' ? 'day' : period === 'month' ? 'month' : 'year'}
                </p>
              </div>
            </div>
          </GlareCard>
        </Reveal>

        {/* Expenses */}
        <Reveal delay={2}>
          <GlareCard className="h-full">
            <div className="rounded-2xl border border-white/18 bg-white/72 dark:bg-white/5 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300 hover:bg-white/82 dark:hover:bg-white/8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 h-full">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Expenses</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 animate-pulse">
                    ₹0
                  </p>
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                    {minorToMoney(totalExpenses)}
                  </p>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expenses this {period === 'today' ? 'day' : period === 'month' ? 'month' : 'year'}
                </p>
              </div>
            </div>
          </GlareCard>
        </Reveal>

        {/* Outstanding */}
        <Reveal delay={2}>
          <GlareCard className="h-full">
            <div className="rounded-2xl border border-white/18 bg-white/72 dark:bg-white/5 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300 hover:bg-white/82 dark:hover:bg-white/8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 h-full">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Outstanding</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-500/20">
                  <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div className="mt-3">
                {loading ? (
                  <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 animate-pulse">
                    ₹0
                  </p>
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                    {minorToMoney(receivables.reduce((a, r) => a + num(r.amount_minor), 0))}
                  </p>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {receivables.length} client{receivables.length === 1 ? '' : 's'} with pending balance
                </p>
              </div>
            </div>
          </GlareCard>
        </Reveal>
      </div>

      {/* Application Preview */}
      <Reveal delay={0}>
        <GlassCard className="h-full">
          <div className="rounded-2xl border border-white/18 bg-white/72 dark:bg-white/5 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-300 hover:bg-white/82 dark:hover:bg-white/8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 h-full">
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Application Preview</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See FleetOS in action - preview of the complete application
              </p>
              <div className="relative">
                <video
                  controls
                  autoPlay
                  muted
                  loop
                  poster="/placeholder-video.jpg"
                  className="w-full h-[300px] object-cover rounded-xl"
                >
                  <source src="/preview-video.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play
                    className="h-8 w-8 text-white/80 hover:text-white/100 transition-colors"
                    aria-label="Play video preview"
                    title="Play video preview"
                  />
                </div>
                {/* Note about accessibility */}
                <p className="absolute bottom-2 left-2 right-2 text-xs text-center text-muted-foreground/80">
                  Video is muted. Captions available via video controls.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </Reveal>

      {/* Main content grid */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — chart + table */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Revenue chart */}
          <Reveal delay={0}>
            <GlassCard hover={false}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Revenue vs Operating Cost</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days · INR thousands</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-900 dark:bg-gray-100" />
                    Revenue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                    Operating cost
                  </span>
                </div>
              </div>
              <div className="h-64 w-full">
                {chartData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-white/10 bg-white/30 dark:bg-white/5">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No revenue data yet</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Revenue vs operating cost will appear once billing data is available</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: 'hsl(var(--fleet-gray-400))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(var(--fleet-gray-400))' }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(220 18% 20%)',
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        padding: '8px 12px',
                        color: 'hsl(210 40% 96%)',
                      }}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--fleet-gray-900))" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="cost" name="Operating cost" fill="hsl(var(--fleet-gray-300))" radius={[4, 4, 0, 0]} barSize={24} />
                  </ComposedChart>
                </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </Reveal>

          {/* Machine activity table */}
          <Reveal delay={1}>
            <GlassCard hover={false} className="overflow-hidden !p-0">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Machine activity</h3>
                  {loading ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                      Loading machines...
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {machines.length} machines · live status
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live</span>
                  </div>
                  <button className="rounded-lg p-1.5 text-gray-400 hover:bg-white/40 dark:hover:bg-white/10 hover:text-gray-600">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
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
                        <tr key={m.code} className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/30 dark:hover:bg-white/5">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/40 dark:bg-white/10">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{m.code.slice(0, 2)}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-50">{m.code}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{m.make} {m.model}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', config.bg, config.text)}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                              {config.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{m.site}</td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={cn('font-semibold', m.todayHours > 0 ? 'text-gray-900 dark:text-gray-50' : 'text-gray-300 dark:text-gray-600')}>
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
                <div className="border-t border-white/10 px-5 py-3">
                  <button className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-50 hover:text-gray-800 dark:hover:text-gray-200">
                    View all machines
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </GlassCard>
          </Reveal>
        </div>

        {/* Right column — fleet status + alerts */}
        <div className="min-w-0 space-y-6">
          {/* Fleet status */}
          <Reveal delay={0}>
            <GlassCard hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Fleet status</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalMachines} machines</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Working', count: statusCounts.working || 0, color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                  { label: 'Idle', count: statusCounts.log_pending || 0, color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                  { label: 'Stopped', count: statusCounts.stopped || 0, color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
                  { label: 'In transit', count: statusCounts.transit || 0, color: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
                  { label: 'In service', count: statusCounts.service || 0, color: 'bg-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10' },
                ].map((s) => (
                  <div key={s.label} className={cn('flex items-center justify-between rounded-xl p-3', s.bg)}>
                    <div className="flex items-center gap-3">
                      <div className={cn('h-2.5 w-2.5 rounded-full', s.color)} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.label}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-50">{s.count}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          {/* Alerts */}
          <Reveal delay={1}>
            <GlassCard hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Needs attention</h3>
                {alerts.length > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="rounded-xl border border-emerald-200/30 bg-emerald-500/10 p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 animate-pulse">
                      Loading alerts...
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                      Fetching latest alerts...
                    </p>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200/30 bg-emerald-500/10 p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">All clear</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Nothing needs attention right now</p>
                  </div>
                ) : (
                alerts.map((a) => ({
                      id: String(a.id),
                      message: String(a.title ?? a.type ?? 'Alert'),
                      subtitle: String(a.message ?? a.machine_code ?? ''),
                      severity: String(a.severity ?? 'warning'),
                    })
                ).map((alert) => {
                  const isCritical = alert.severity === 'critical' || alert.severity === 'urgent';
                  const isWarning = alert.severity === 'warning';
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'rounded-xl border p-3 transition-all duration-200 hover:shadow-sm',
                        isCritical
                          ? 'border-red-200/30 bg-red-500/10 dark:bg-red-500/15'
                          : isWarning
                          ? 'border-amber-200/30 bg-amber-500/10 dark:bg-amber-500/15'
                          : 'border-white/10 bg-white/30 dark:bg-white/5',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'mt-0.5 h-2 w-2 rounded-full shrink-0',
                          isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-gray-400',
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{alert.message}</p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{alert.subtitle}</p>
                        </div>
                      </div>
                    </div>
                  );
                }))}
              </div>
            </GlassCard>
          </Reveal>

          {/* Quick stats */}
          <Reveal delay={2}>
            <GlassCard hover={false}>
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-50">Quick stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Active deployments</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{deployments.filter((d) => String(d.status ?? 'active') === 'active').length}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Active clients</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{clients.length}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Unused advances</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {minorToMoney(advances.reduce((a, adv) => a + num(adv.amount_minor) - num(adv.consumed_minor), 0))}
                  </span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sites</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{sites.length}</span>
                </div>
              </div>
            </GlassCard>
          </Reveal>
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
          <div className="h-24 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl animate-pulse" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
