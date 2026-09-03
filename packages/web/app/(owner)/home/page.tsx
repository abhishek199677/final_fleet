'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/api/auth-fetch';

interface KPIs {
  total_revenue: number;
  total_expenses: number;
  active_machines: number;
  active_clients: number;
  pending_collections: number;
  avg_utilisation: number;
}

export default function OwnerHome() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [receivables, setReceivables] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch('/api/v1/billing/kpis').then(r => r.json()).catch(() => null),
      authFetch('/api/v1/machines').then(r => r.json()).catch(() => []),
      authFetch('/api/v1/billing/receivables').then(r => r.json()).catch(() => []),
    ]).then(([k, m, r]) => {
      setKpis(k);
      setMachines(m || []);
      setReceivables(r || []);
    }).finally(() => setLoading(false));
  }, []);

  const formatMoney = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline">Export Report</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpis ? formatMoney(kpis.total_revenue) : '₹0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpis ? formatMoney(kpis.total_expenses) : '₹0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Machines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpis?.active_machines || machines.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpis?.active_clients || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{kpis ? formatMoney(kpis.pending_collections) : '₹0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Utilisation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpis?.avg_utilisation || 0}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Machine Fleet */}
          <Card>
            <CardHeader>
              <CardTitle>Machine Fleet</CardTitle>
            </CardHeader>
            <CardContent>
              {machines.length === 0 ? (
                <p className="text-muted-foreground">No machines</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {machines.slice(0, 9).map((m: Record<string, unknown>) => (
                    <div key={m.id as string} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.code as string}</span>
                        <span className={`text-xs px-2 py-1 rounded ${m.status_flag === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {m.status_flag as string}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.type as string} — {m.make as string} {m.model as string}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Receivables */}
          <Card>
            <CardHeader>
              <CardTitle>Top Receivables</CardTitle>
            </CardHeader>
            <CardContent>
              {receivables.length === 0 ? (
                <p className="text-muted-foreground">No receivables</p>
              ) : (
                <div className="space-y-2">
                  {receivables.slice(0, 5).map((r: Record<string, unknown>) => (
                    <div key={r.client_id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{r.client_name as string}</span>
                      <span className="font-medium">{formatMoney(r.balance_minor as number)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
