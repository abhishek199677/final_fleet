'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

const REASONS = ['no_diesel', 'breakdown', 'transport', 'police_permit', 'no_work_client', 'weather', 'operator_absent', 'other'];

export default function DowntimePage() {
  const [machines, setMachines] = useState<Row[]>([]);
  const [recent, setRecent] = useState<Row[]>([]);
  const [form, setForm] = useState({ machine_id: '', started_at: '', ended_at: '', reason_code: 'breakdown', note: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetchList<Row>('/api/v1/machines').then(setMachines);
    fetchList<Row>('/api/v1/fuel-downtime/downtime').then((d) => setRecent(d.slice(0, 10)));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/fuel-downtime/downtime', {
        method: 'POST',
        body: JSON.stringify({
          machine_id: form.machine_id,
          started_at: new Date(form.started_at).toISOString(),
          ended_at: form.ended_at ? new Date(form.ended_at).toISOString() : undefined,
          reason_code: form.reason_code,
          note: form.note || undefined,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        setForm({ machine_id: '', started_at: '', ended_at: '', reason_code: 'breakdown', note: '' });
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Downtime</h1>
        <p className="text-muted-foreground">Log stopped time with a reason — no overlapping mystery hours.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Log downtime</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Machine *</label>
                <select className="w-full border rounded-md p-2" value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })} required>
                  <option value="">Select machine...</option>
                  {machines.map((m) => (
                    <option key={String(m.id)} value={String(m.id)}>{String(m.code)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">From *</label>
                  <Input type="datetime-local" value={form.started_at} onChange={(e) => setForm({ ...form, started_at: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">To</label>
                  <Input type="datetime-local" value={form.ended_at} onChange={(e) => setForm({ ...form, ended_at: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <select className="w-full border rounded-md p-2" value={form.reason_code} onChange={(e) => setForm({ ...form, reason_code: e.target.value })}>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Note</label>
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save downtime'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent downtime</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-muted-foreground">No downtime recorded.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((d) => (
                  <div key={String(d.id)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                    <span className="font-medium">{String(d.machine_code ?? '')}</span>
                    <span>{String(d.reason_code ?? '').replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">{new Date(String(d.started_at)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
