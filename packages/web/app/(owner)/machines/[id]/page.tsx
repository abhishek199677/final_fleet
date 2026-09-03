'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { authFetch } from '@/lib/api/auth-fetch';

export default function MachineDetail() {
  const params = useParams();
  const id = params.id as string;
  const [machine, setMachine] = useState<Record<string, unknown> | null>(null);
  const [maintenance, setMaintenance] = useState<Record<string, unknown>[]>([]);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      authFetch(`/api/v1/machines/${id}`).then(r => r.json()),
      authFetch(`/api/v1/maintenance/machines/${id}/status`).then(r => r.json()).catch(() => []),
      authFetch(`/api/v1/work-sessions?machine_id=${id}`).then(r => r.json()).catch(() => []),
    ]).then(([m, mt, s]) => {
      setMachine(m);
      setMaintenance(mt || []);
      setSessions(s || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!machine) return <p>Machine not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{machine.code as string}</h1>
          <p className="text-muted-foreground">{machine.type as string} — {machine.make as string} {machine.model as string}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/work-session/new?machine_id=${id}`}>
            <Button>Start Session</Button>
          </Link>
          <Link href="/machines">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {/* Machine Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`px-2 py-1 rounded text-sm ${machine.status_flag === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {machine.status_flag as string}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{String(machine.current_meter)} {machine.meter_unit_label as string}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{machine.year as string}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vin/Serial</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{machine.vin_serial as string || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenance.length === 0 ? (
            <p className="text-muted-foreground">No maintenance tasks configured</p>
          ) : (
            <div className="space-y-2">
              {maintenance.map((t: Record<string, unknown>) => (
                <div key={t.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{t.task_name as string}</span>
                  <span className="text-sm text-muted-foreground">Every {String(t.interval_hours)}h — Last: {String(t.last_meter)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">No sessions</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 10).map((s: Record<string, unknown>) => (
                <div key={s.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{new Date(s.start_at as string).toLocaleDateString()}</span>
                  <span className="text-sm">{String(s.start_meter)} → {String(s.end_meter)} {machine.meter_unit_label as string}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
