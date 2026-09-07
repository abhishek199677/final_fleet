'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';

interface FuelLogEntry {
  id: string;
  machine_id: string;
  fuel_date: string;
  litres: number;
  cost_minor: number;
  currency: string;
  vendor?: string;
  notes?: string;
  machines?: { code: string };
}

export default function OpsFuel() {
  const [logs, setLogs] = useState<FuelLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchList<FuelLogEntry>('/api/v1/fuel-downtime/fuel-logs').then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fuel Logs</h1>
        <Link href="/fuel/new">
          <Button>Log Fuel</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading fuel logs...</p>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No fuel logs yet. Tap &quot;Log Fuel&quot; to record your first entry.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{log.machines?.code ?? log.machine_id}</p>
                  <p className="text-sm text-muted-foreground">
                    {log.fuel_date} &middot; {log.litres}L
                    {log.vendor ? ` &middot; ${log.vendor}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{log.currency} {(log.cost_minor / 100).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
