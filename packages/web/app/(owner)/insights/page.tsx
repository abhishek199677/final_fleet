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
import { sampleMachines, sampleSessions, sampleFuelLogs, sampleDowntime } from '@/lib/sample-data';

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
  if (score >= 90) return 'text-white bg-gradient-to-r from-emerald-500 to-green-500';
  if (score >= 70) return 'text-white bg-gradient-to-r from-blue-500 to-cyan-500';
  if (score >= 50) return 'text-white bg-gradient-to-r from-amber-500 to-orange-500';
  return 'text-white bg-gradient-to-r from-red-500 to-rose-500';
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
      setMachines(m.length > 0 ? m : sampleMachines);
      setSessions(s.length > 0 ? s : sampleSessions);
    }).catch(() => {
      setMachines(sampleMachines);
      setSessions(sampleSessions);
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
        if (data.insights && data.insights.length > 0) {
          setInsights(data.insights);
        } else {
          setInsights(generateSampleInsights());
        }
      })
      .catch(() => setInsights(generateSampleInsights()))
      .finally(() => setInsightsLoading(false));
  }, [loading, machines]);

  const generateSampleInsights = (): MachineInsight[] => {
    return sampleMachines.slice(0, 6).map((m, i) => ({
      machine_code: m.code,
      machine_id: m.id,
      type: m.type,
      make: '',
      model: '',
      year: 2022,
      health_score: [92, 87, 78, 95, 65, 82][i] || 80,
      status: ['operating', 'operating', 'downtime', 'operating', 'idle', 'operating'][i] || 'operating',
      performance_summary: `${m.code} has been performing well with consistent output. ${i === 2 ? 'Currently under scheduled maintenance.' : i === 4 ? 'Awaiting deployment to new site.' : 'Operating at optimal capacity.'}`,
      issues: i === 2 ? ['Scheduled maintenance in progress'] : i === 4 ? ['No active deployment'] : [],
      earnings_per_day: Array.from({ length: 14 }, (_, j) => ({
        date: new Date(Date.now() - (13 - j) * 86400000).toISOString().slice(0, 10),
        hours: Math.round((4 + Math.random() * 4) * 10) / 10,
        amount: Math.round(8000 + Math.random() * 4000),
      })),
      earnings_total: {
        total: Math.round(80000 + Math.random() * 40000),
        daily_average: Math.round(8000 + Math.random() * 4000),
        monthly_estimate: Math.round(240000 + Math.random() * 120000),
        currency: 'INR',
      },
      recommendations: i === 2 ? ['Complete maintenance and return to service'] : i === 4 ? ['Assign to active deployment'] : ['Continue current operations'],
      stats: {
        total_hours: Math.round(120 + Math.random() * 80),
        billable_hours: Math.round(100 + Math.random() * 60),
        billable_ratio: Math.round(80 + Math.random() * 15),
        total_sessions: Math.round(15 + Math.random() * 10),
        downtime_hours: i === 2 ? 24 : Math.round(Math.random() * 8),
        downtime_events: i === 2 ? 1 : Math.round(Math.random() * 2),
        fuel_litres: Math.round(800 + Math.random() * 400),
        fuel_cost: Math.round(88000 + Math.random() * 44000),
        avg_session_hours: Math.round((5 + Math.random() * 3) * 10) / 10,
        days_since_last_session: i === 4 ? 7 : Math.round(Math.random() * 2),
        current_meter: Math.round(10000 + Math.random() * 5000),
        meter_unit: 'hrs',
      },
    }));
  };

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
    { 
      name: 'Operating', 
      value: insights.filter((i) => i.status === 'operating').length, 
      color: '#22C55E',
      machines: insights.filter((i) => i.status === 'operating').map((i) => i.machine_code)
    },
    { 
      name: 'Under Maintenance', 
      value: insights.filter((i) => i.status === 'downtime').length, 
      color: '#F59E0B',
      machines: insights.filter((i) => i.status === 'downtime').map((i) => i.machine_code)
    },
    { 
      name: 'Idle', 
      value: insights.filter((i) => i.status === 'idle').length, 
      color: '#6B7280',
      machines: insights.filter((i) => i.status === 'idle').map((i) => i.machine_code)
    },
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-white/90" />
              <p className="text-white font-bold text-xl">{machines.length}</p>
            </div>
            <p className="text-blue-100 text-[10px] mt-1">Total Machines</p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3">
            <div className="flex items-center gap-2">
              <Power className="h-5 w-5 text-white/90" />
              <p className="text-white font-bold text-xl">{activeMachines.length}</p>
            </div>
            <p className="text-green-100 text-[10px] mt-1">Active Machines</p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white/90" />
              <p className="text-white font-bold text-xl">{fmtHours(totalHours)}</p>
            </div>
            <p className="text-violet-100 text-[10px] mt-1">Total Hours Run</p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-white/90" />
              <p className="text-white font-bold text-xl">{fmtHours(totalDowntime)}</p>
            </div>
            <p className="text-amber-100 text-[10px] mt-1">Downtime Hours</p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-3">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-white/90" />
              <p className="text-white font-bold text-base truncate">{fmtMoney(fleetMonthlyEarnings)}</p>
            </div>
            <p className="text-emerald-100 text-[10px] mt-1">Est. Monthly Revenue</p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-white/90" />
              <p className="text-white font-bold text-xl">{avgHealth}%</p>
            </div>
            <p className="text-cyan-100 text-[10px] mt-1">Fleet Health Score</p>
          </div>
        </Card>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <CardTitle className="text-white">Hours per Machine</CardTitle>
            </div>
            <p className="text-violet-100 text-sm mt-1">
              Total operating hours vs billable hours for each machine.
            </p>
          </div>
          <CardContent className="pt-6">
            {hoursChartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sessions recorded yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hoursChartData} layout="vertical" margin={{ left: 10 }}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#A78BFA" />
                    </linearGradient>
                    <linearGradient id="billableGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} stroke="#9CA3AF" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                            <p className="font-semibold text-gray-800 mb-2">{payload[0]?.payload?.name}</p>
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: entry.name === 'Total Hours' ? '#8B5CF6' : '#10B981' }}
                                />
                                <span className="text-gray-600">{entry.name}:</span>
                                <span className="font-medium">{entry.value}h</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="hours" fill="url(#totalGradient)" radius={[0, 6, 6, 0]} name="Total Hours" />
                  <Bar dataKey="billable" fill="url(#billableGradient)" radius={[0, 6, 6, 0]} name="Billable Hours" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-4">
            <div className="flex items-center gap-2">
              <Power className="h-5 w-5 text-white" />
              <CardTitle className="text-white">Machine Status Today</CardTitle>
            </div>
          </div>
          <CardContent className="pt-6">
            {utilPieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No machines</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={utilPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                  >
                    {utilPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[150px]">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: data.color }}
                              />
                              <span className="font-semibold text-gray-800">{data.name}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{data.value} machine{data.value > 1 ? 's' : ''}</p>
                            {data.machines && data.machines.length > 0 && (
                              <div className="border-t pt-2">
                                <p className="text-xs text-gray-500 mb-1">Machines:</p>
                                <div className="flex flex-wrap gap-1">
                                  {data.machines.map((m: string, i: number) => (
                                    <span key={i} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{m}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Per-Vehicle Report ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold">Per-Vehicle Report</h2>
        </div>

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((ins) => (
              <Card key={ins.machine_code} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{ins.machine_code}</h3>
                      <p className="text-xs text-muted-foreground">
                        {ins.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm ${healthColor(ins.health_score)}`}>
                      {ins.health_score}%
                    </span>
                  </div>

                  {/* Key Stats - One Line */}
                  <div className="flex items-center gap-3 text-sm mb-3 border-b pb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      {ins.stats.total_hours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {ins.stats.billable_ratio}%
                    </span>
                    {ins.stats.downtime_hours > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Wrench className="h-3.5 w-3.5" />
                        {ins.stats.downtime_hours}h down
                      </span>
                    )}
                  </div>

                  {/* Earnings - Compact */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Est.</p>
                      <p className="text-lg font-bold text-green-600">
                        {fmtMoney(ins.earnings_total.monthly_estimate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Daily Avg</p>
                      <p className="font-semibold">{fmtMoney(ins.earnings_total.daily_average)}</p>
                    </div>
                  </div>

                  {/* Issues - Only if any */}
                  {ins.issues.length > 0 && (
                    <div className="bg-slate-400 dark:bg-slate-600 rounded-lg p-2 mb-3">
                      {ins.issues.map((issue, i) => (
                        <p key={i} className="text-xs text-white flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {issue}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  <a
                    href={`/machines/${ins.machine_id}`}
                    className="block text-center text-xs text-primary hover:underline py-2 border-t"
                  >
                    View Details →
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!insightsLoading && insights.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No machine data available.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
