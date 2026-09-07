'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/api/auth-fetch';

interface HealthStatus {
  api: 'healthy' | 'degraded' | 'down';
  database: 'connected' | 'disconnected';
  uptime: string;
  tenants: number;
  activeUsers: number;
}

export default function AdminHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await authFetch('/api/v1/health');
        if (res.ok) {
          const data = await res.json();
          setHealth({
            api: 'healthy',
            database: data.database === 'connected' ? 'connected' : 'disconnected',
            uptime: data.uptime ?? 'unknown',
            tenants: data.tenants ?? 0,
            activeUsers: data.activeUsers ?? 0,
          });
        } else {
          setHealth({ api: 'degraded', database: 'disconnected', uptime: 'unknown', tenants: 0, activeUsers: 0 });
        }
      } catch {
        setHealth({ api: 'down', database: 'disconnected', uptime: 'unknown', tenants: 0, activeUsers: 0 });
      } finally {
        setLoading(false);
      }
    }
    void checkHealth();
    const interval = setInterval(() => { void checkHealth(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-muted-foreground">Checking system health...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Health</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${health?.api === 'healthy' ? 'text-green-600' : health?.api === 'degraded' ? 'text-yellow-600' : 'text-red-600'}`}>
              {health?.api === 'healthy' ? 'Healthy' : health?.api === 'degraded' ? 'Degraded' : 'Down'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${health?.database === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
              {health?.database === 'connected' ? 'Connected' : 'Disconnected'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{health?.tenants ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{health?.activeUsers ?? 0}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Uptime</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{health?.uptime}</p>
        </CardContent>
      </Card>
    </div>
  );
}
