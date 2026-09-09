'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  AlertTriangle, Brain, Clock, Coins, Gauge, Power, TrendingUp, Wrench, Fuel,
  CheckCircle2, ArrowRight,
} from 'lucide-react';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function sessionUnits(s: Record<string, unknown>): number {
  const u = num(s.units_run, NaN);
  if (Number.isFinite(u)) return u;
  return Math.max(num(s.end_meter) - num(s.start_meter), 0);
}

function sessionHours(s: Record<string, unknown>): number {
  const a = new Date(String(s.start_at ?? '')).getTime();
  const b = s.end_at ? new Date(String(s.end_at)).getTime() : Date.now();
  if (!a || !b || b < a) return 0;
  return Math.min((b - a) / 3_600_000, 24);
}

function downtimeHours(d: Record<string, unknown>): number {
  if (d.started_at && d.ended_at) {
    const ms = new Date(String(d.ended_at)).getTime() - new Date(String(d.started_at)).getTime();
    return Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
  }
  return 0;
}

function fmtHours(h: number): string {
  return h < 10 ? h.toFixed(1) : Math.round(h).toLocaleString();
}

function fmtMoney(amount: number, currency = 'INR'): string {
  if (currency === 'INR') return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  return `$${Math.round(amount).toLocaleString()}`;
}

function healthColor(score: number): string {
  if (score >= 90) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
  if (score >= 50) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
  return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
}

function healthLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Attention';
  return 'Critical';
}

interface MachineInsight {
  machine_code: string;
  machine_id: string;
  type: string;
  make: string;
  model: string;
  year: number;
  health_score: number;
  status: string;
  performance_summary: string;
  issues: string[];
  earnings_per_day: { date: string; hours: number; amount: number }[];
  earnings_total: { total: number; daily_average: number; monthly_estimate: number; currency: string };
  recommendations: string[];
  stats: {
    total_hours: number;
    billable_hours: number;
    billable_ratio: number;
    total_sessions: number;
    downtime_hours: number;
    downtime_events: number;
    fuel_litres: number;
    fuel_cost: number;
    avg_session_hours: number;
    days_since_last_session: number;
    current_meter: number;
    meter_unit: string;
  };
}

export default function Insights() {
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [insights, setInsights] = useState<MachineInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/machines'),
      fetchList<Record<string, unknown>>('/api/v1/work-sessions'),
    ]).then(([m, s]) => {
      setMachines(m);
      setSessions(s);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch computed insights
  useEffect(() => {
    if (loading || machines.length === 0) return;
    setInsightsLoading(true);
    authFetch('/api/v1/insights/ai')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load insights');
        const data = await res.json();
        setInsights(data.insights ?? []);
      })
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, [loading, machines]);

  // Fleet totals from raw data
  const totalUnits = useMemo(() =>
    sessions.reduce((sum, s) => sum + sessionUnits(s), 0), [sessions]);
  const totalHours = useMemo(() =>
    sessions.reduce((sum, s) => sum + sessionHours(s), 0), [sessions]);
  const activeMachines = machines.filter((m) => m.status_flag !== 'retired');

  // Fleet totals from insights
  const fleetDailyEarnings = insights.reduce((s, i) => s + i.earnings_total.daily_average, 0);
  const fleetMonthlyEarnings = insights.reduce((s, i) => s + i.earnings_total.monthly_estimate, 0);
  const avgHealth = insights.length > 0
    ? Math.round(insights.reduce((s, i) => s + i.health_score, 0) / insights.length)
    : 0;
  const totalDowntime = insights.reduce((s, i) => s + i.stats.downtime_hours, 0);
  const totalFuel = insights.reduce((s, i) => s + i.stats.fuel_litres, 0);

  // Charts
  const hoursChartData = insights
    .filter((i) => i.stats.total_hours > 0)
    .map((i) => ({
      name: i.machine_code,
      hours: i.stats.total_hours,
      billable: i.stats.billable_hours,
    }));

  const utilPieData = [
    { name: 'Operating', value: insights.filter((i) => i.status === 'operating').length, color: '#22C55E' },
    { name: 'Under Maintenance', value: insights.filter((i) => i.status === 'downtime').length, color: '#F59E0B' },
    { name: 'Idle', value: insights.filter((i) => i.status === 'idle').length, color: '#6B7280' },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading fleet insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fleet Insights</h1>
        <p className="text-muted-foreground mt-1">
          Performance overview computed from driver work sessions, fuel logs, and downtime records
        </p>
      </div>

      {/* ── Fleet Overview ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{machines.length}</p>
                <p className="text-xs text-muted-foreground">Total Machines</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <Power className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeMachines.length}</p>
                <p className="text-xs text-muted-foreground">Active Machines</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fmtHours(totalHours)}</p>
                <p className="text-xs text-muted-foreground">Total Hours Run</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fmtHours(totalDowntime)}</p>
                <p className="text-xs text-muted-foreground">Downtime Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                <Coins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fmtMoney(fleetMonthlyEarnings)}</p>
                <p className="text-xs text-muted-foreground">Est. Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900/30">
                <Brain className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgHealth}%</p>
                <p className="text-xs text-muted-foreground">Fleet Health Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hours per Machine</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total operating hours vs billable hours for each machine.
            </p>
          </CardHeader>
          <CardContent>
            {hoursChartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sessions recorded yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hoursChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value}h`,
                      name === 'billable' ? 'Billable Hours' : 'Total Hours',
                    ]}
                  />
                  <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Total Hours" />
                  <Bar dataKey="billable" fill="#93C5FD" radius={[0, 4, 4, 0]} name="Billable Hours" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Machine Status Today</CardTitle>
          </CardHeader>
          <CardContent>
            {utilPieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No machines</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={utilPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {utilPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Per-Vehicle Detailed Report ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold">Per-Vehicle Report</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Detailed breakdown for each machine — earnings, performance, issues, and what to do next.
        </p>

        {insightsLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-pulse rounded-full bg-violet-100 p-3 dark:bg-violet-900/30">
                  <Brain className="h-8 w-8 text-violet-500 animate-pulse" />
                </div>
                <p className="text-muted-foreground">Computing vehicle insights...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!insightsLoading && insights.length > 0 && (
          <div className="space-y-6">
            {insights.map((ins) => (
              <Card key={ins.machine_code} className="overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{ins.machine_code}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {ins.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        {ins.make ? ` — ${ins.make}` : ''} {ins.model}
                        {ins.year ? ` (${ins.year})` : ''}
                      </p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-sm font-bold ${healthColor(ins.health_score)}`}>
                      {ins.health_score}% — {healthLabel(ins.health_score)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {/* Performance Summary */}
                  <p className="text-sm leading-relaxed">{ins.performance_summary}</p>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Hours Run</p>
                      </div>
                      <p className="text-lg font-bold">{ins.stats.total_hours}h</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <p className="text-xs text-muted-foreground">Billable</p>
                      </div>
                      <p className="text-lg font-bold">{ins.stats.billable_ratio}%</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wrench className="h-3.5 w-3.5 text-amber-600" />
                        <p className="text-xs text-muted-foreground">Downtime</p>
                      </div>
                      <p className="text-lg font-bold">
                        {ins.stats.downtime_hours > 0 ? `${ins.stats.downtime_hours}h` : 'None'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Fuel className="h-3.5 w-3.5 text-purple-600" />
                        <p className="text-xs text-muted-foreground">Fuel Used</p>
                      </div>
                      <p className="text-lg font-bold">
                        {ins.stats.fuel_litres > 0 ? `${ins.stats.fuel_litres}L` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Earnings Report */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-semibold">Earnings Report</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Earned</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {fmtMoney(ins.earnings_total.total, ins.earnings_total.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Daily Average</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {fmtMoney(ins.earnings_total.daily_average, ins.earnings_total.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Estimate</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {fmtMoney(ins.earnings_total.monthly_estimate, ins.earnings_total.currency)}
                        </p>
                      </div>
                    </div>
                    {ins.earnings_per_day.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Daily Earnings (last 14 days)</p>
                        <ResponsiveContainer width="100%" height={120}>
                          <BarChart data={ins.earnings_per_day.slice(-14)}>
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 9 }}
                              tickFormatter={(v: string) => v.slice(5)}
                            />
                            <YAxis hide />
                            <Tooltip
                              formatter={(value: number) => [fmtMoney(value, ins.earnings_total.currency), 'Earnings']}
                              labelFormatter={(label: string) => label}
                            />
                            <Bar dataKey="amount" fill="#22C55E" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Issues */}
                  {ins.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Issues & Concerns</p>
                      <ul className="space-y-1.5">
                        {ins.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {ins.recommendations.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">What To Do Next</p>
                      <ul className="space-y-1.5">
                        {ins.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extra Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground border-t pt-3">
                    <div>
                      <span className="font-medium">Sessions:</span> {ins.stats.total_sessions}
                    </div>
                    <div>
                      <span className="font-medium">Avg Session:</span> {ins.stats.avg_session_hours}h
                    </div>
                    <div>
                      <span className="font-medium">Last Active:</span>{' '}
                      {ins.stats.days_since_last_session === 0
                        ? 'Today'
                        : ins.stats.days_since_last_session === 999
                          ? 'Never'
                          : `${ins.stats.days_since_last_session}d ago`}
                    </div>
                    <div>
                      <span className="font-medium">Meter:</span>{' '}
                      {ins.stats.current_meter.toLocaleString()} {ins.stats.meter_unit}
                    </div>
                  </div>

                  {/* Link */}
                  <a
                    href={`/machines/${ins.machine_id}`}
                    className="block text-center text-sm text-primary hover:underline pt-2 border-t"
                  >
                    View Full Machine Details →
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!insightsLoading && insights.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No machine data available. Add machines and record work sessions to see insights.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
