'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { authFetch } from '@/lib/api/auth-fetch';

interface TodayData {
  machines: { id: string; code: string; status_flag: string; type: string }[];
  activeSessions: { id: string; machine_code: string; started_at: string }[];
  pendingFuel: number;
  pendingExpenses: number;
  alerts: { id: string; message: string; severity: string }[];
}

export default function OpsToday() {
  const [data, setData] = useState<TodayData>({ machines: [], activeSessions: [], pendingFuel: 0, pendingExpenses: 0, alerts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch('/api/v1/machines').then(r => r.json()),
      authFetch('/api/v1/work-sessions?status=active').then(r => r.json()).catch(() => []),
      authFetch('/api/v1/fuel-downtime/fuel-logs?pending=true').then(r => r.json()).catch(() => []),
      authFetch('/api/v1/expenses?pending=true').then(r => r.json()).catch(() => []),
      authFetch('/api/v1/alerts?status=unread').then(r => r.json()).catch(() => []),
    ]).then(([machines, activeSessions, fuel, expenses, alerts]) => {
      setData({
        machines: machines || [],
        activeSessions: activeSessions || [],
        pendingFuel: Array.isArray(fuel) ? fuel.length : 0,
        pendingExpenses: Array.isArray(expenses) ? expenses.length : 0,
        alerts: Array.isArray(alerts) ? alerts.slice(0, 5) : [],
      });
    }).finally(() => setLoading(false));
  }, []);

  const activeMachines = data.machines.filter(m => m.status_flag === 'active');
  const availableMachines = data.machines.filter(m => m.status_flag === 'available');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Today</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Link href="/work-session/new">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl mb-2">Start Session</p>
                  <p className="font-medium">Start Session</p>
                  <p className="text-sm text-muted-foreground">{availableMachines.length} machines free</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/fuel/new">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl mb-2">Log Fuel</p>
                  <p className="font-medium">Log Fuel</p>
                  {data.pendingFuel > 0 && <p className="text-sm text-orange-600">{data.pendingFuel} pending</p>}
                </CardContent>
              </Card>
            </Link>
            <Link href="/expense/new">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl mb-2">Log Expense</p>
                  <p className="font-medium">Log Expense</p>
                  {data.pendingExpenses > 0 && <p className="text-sm text-orange-600">{data.pendingExpenses} pending</p>}
                </CardContent>
              </Card>
            </Link>
            <Link href="/cash-count">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl mb-2">Cash Count</p>
                  <p className="font-medium">Cash Count</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions ({data.activeSessions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.activeSessions.length === 0 ? (
                <p className="text-muted-foreground">No active sessions</p>
              ) : (
                <div className="space-y-2">
                  {data.activeSessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{s.machine_code}</span>
                      <span className="text-sm text-muted-foreground">Started {new Date(s.started_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {data.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.alerts.map(a => (
                    <div key={a.id} className={`p-2 rounded ${a.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {a.message}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
