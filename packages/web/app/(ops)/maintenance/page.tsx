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

export default function MaintenanceVisitPage() {
  const [machines, setMachines] = useState<Row[]>([]);
  const [visits, setVisits] = useState<Row[]>([]);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [machineId, setMachineId] = useState('');
  const [ticked, setTicked] = useState<string[]>([]);
  const [parts, setParts] = useState<{ item: string; qty: string; cost: string }[]>([]);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().slice(0, 10),
    visit_type: 'scheduled',
    mechanic: '',
    meter_at_visit: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchList<Row>('/api/v1/machines').then(setMachines);
  }, []);

  useEffect(() => {
    if (machineId) {
      fetchList<Row>(`/api/v1/maintenance/machines/${machineId}/visits`).then(setVisits);
      fetchList<Row>(`/api/v1/maintenance/machines/${machineId}/tasks`).then(setTasks);
      setTicked([]);
    } else {
      setVisits([]);
      setTasks([]);
    }
  }, [machineId]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/maintenance/visits', {
        method: 'POST',
        body: JSON.stringify({
          machine_id: machineId,
          visit_date: form.visit_date,
          visit_type: form.visit_type,
          mechanic: form.mechanic || undefined,
          meter_at_visit: form.meter_at_visit ? parseFloat(form.meter_at_visit) : undefined,
          notes: form.notes || undefined,
          task_ids: ticked,
          parts: parts
            .filter((p) => p.item.trim())
            .map((p) => ({
              item: p.item.trim(),
              qty: parseFloat(p.qty || '1'),
              unit_cost_txn: Math.round(parseFloat(p.cost || '0') * 100),
              currency: 'INR',
            })),
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        setForm({ ...form, mechanic: '', meter_at_visit: '', notes: '' });
        setTicked([]);
        setParts([]);
        fetchList<Row>(`/api/v1/maintenance/machines/${machineId}/visits`).then(setVisits);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maintenance Visit</h1>
        <p className="text-muted-foreground">Log service visits — ticked tasks advance the next-due values.</p>
      </div>

      <div>
        <label className="text-sm font-medium">Machine *</label>
        <select className="w-full max-w-md border rounded-md p-2" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
          <option value="">Select machine...</option>
          {machines.map((m) => (
            <option key={String(m.id)} value={String(m.id)}>{String(m.code)}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New visit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Type *</label>
                  <select className="w-full border rounded-md p-2" value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value })}>
                    <option value="scheduled">Scheduled</option>
                    <option value="breakdown">Breakdown repair</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Mechanic</label>
                  <Input value={form.mechanic} onChange={(e) => setForm({ ...form, mechanic: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Meter at visit</label>
                  <Input type="number" step="0.1" value={form.meter_at_visit} onChange={(e) => setForm({ ...form, meter_at_visit: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {tasks.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Tasks completed (ticks advance next-due)</label>
                  <div className="mt-1 space-y-1">
                    {tasks.map((t) => (
                      <label key={String(t.id)} className="flex items-center gap-2 rounded border p-2 text-sm">
                        <input
                          type="checkbox"
                          checked={ticked.includes(String(t.id))}
                          onChange={(e) =>
                            setTicked(e.target.checked ? [...ticked, String(t.id)] : ticked.filter((x) => x !== String(t.id)))
                          }
                        />
                        {String(t.name)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Parts used</label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setParts([...parts, { item: '', qty: '1', cost: '' }])}>
                    + Add part
                  </Button>
                </div>
                {parts.map((p, i) => (
                  <div key={i} className="mt-2 grid grid-cols-3 gap-2">
                    <Input placeholder="Item" value={p.item} onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} />
                    <Input placeholder="Qty" type="number" step="0.1" value={p.qty} onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                    <Input placeholder="Unit cost" type="number" step="0.01" value={p.cost} onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={saving || !machineId}>{saving ? 'Saving…' : 'Save visit'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit history</CardTitle>
          </CardHeader>
          <CardContent>
            {!machineId ? (
              <p className="text-muted-foreground">Select a machine first.</p>
            ) : visits.length === 0 ? (
              <p className="text-muted-foreground">No visits recorded for this machine.</p>
            ) : (
              <div className="space-y-2">
                {visits.slice(0, 10).map((v) => (
                  <div key={String(v.id)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                    <span className="font-medium">{String(v.visit_type)}</span>
                    <span className="text-muted-foreground">{String(v.visit_date).slice(0, 10)} · {String(v.mechanic ?? '')}</span>
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
