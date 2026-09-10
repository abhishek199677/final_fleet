'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { sampleMachines, sampleMaintenance } from '@/lib/sample-data';
import { Wrench, History } from 'lucide-react';

interface Row extends Record<string, unknown> {
  id?: string;
}

export default function MaintenanceVisitPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
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
    void fetchList<Row>('/api/v1/machines').then(data => {
      if (data.length > 0) {
        setMachines(data);
      } else {
        setMachines(sampleMachines);
      }
    }).catch(() => setMachines(sampleMachines));
  }, []);

  useEffect(() => {
    if (machineId) {
      void fetchList<Row>(`/api/v1/maintenance/machines/${machineId}/visits`)
        .then(data => {
          if (data.length > 0) {
            setVisits(data);
          } else {
            setVisits(sampleMaintenance.filter(v => v.machine_code === machines.find(m => m.id === machineId)?.code));
          }
        })
        .catch(() => setVisits(sampleMaintenance.filter(v => v.machine_code === machines.find(m => m.id === machineId)?.code)));
      void fetchList<Row>(`/api/v1/maintenance/machines/${machineId}/tasks`)
        .then(data => {
          if (data.length > 0) {
            setTasks(data);
          } else {
            setTasks([
              { id: 't1', name: 'Oil change' },
              { id: 't2', name: 'Filter replacement' },
              { id: 't3', name: 'Grease all fittings' },
              { id: 't4', name: 'Check hydraulic levels' },
            ]);
          }
        })
        .catch(() => setTasks([
          { id: 't1', name: 'Oil change' },
          { id: 't2', name: 'Filter replacement' },
          { id: 't3', name: 'Grease all fittings' },
          { id: 't4', name: 'Check hydraulic levels' },
        ]));
      setTicked([]);
    } else {
      setVisits([]);
      setTasks([]);
    }
  }, [machineId, machines]);

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
        void fetchList<Row>(`/api/v1/maintenance/machines/${machineId}/visits`).then(setVisits);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Maintenance Visit</h1>
            <p className="text-white/80">{isReadOnly ? 'View service visits and task history.' : 'Log service visits — ticked tasks advance the next-due values.'}</p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Machine *</label>
        <select className="w-full max-w-md rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-sky-400 focus:outline-none" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
          <option value="">Select machine...</option>
          {machines.map((m) => (
            <option key={String(m.id)} value={String(m.id)}>{String(m.code)}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!isReadOnly && (
          <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-900">New Visit</h2>
            </div>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Date *</label>
                  <Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required className="border-[#E5E2DB] focus:border-sky-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Type *</label>
                  <select className="w-full rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-sky-400 focus:outline-none" value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value })}>
                    <option value="scheduled">Scheduled</option>
                    <option value="breakdown">Breakdown repair</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Mechanic</label>
                  <Input value={form.mechanic} onChange={(e) => setForm({ ...form, mechanic: e.target.value })} className="border-[#E5E2DB] focus:border-sky-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Meter at visit</label>
                  <Input type="number" step="0.1" value={form.meter_at_visit} onChange={(e) => setForm({ ...form, meter_at_visit: e.target.value })} className="border-[#E5E2DB] focus:border-sky-400" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border-[#E5E2DB] focus:border-sky-400" />
              </div>
              {tasks.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Tasks completed (ticks advance next-due)</label>
                  <div className="mt-1 space-y-1">
                    {tasks.map((t) => (
                      <label key={String(t.id)} className="flex items-center gap-2 rounded-lg border border-[#E5E2DB] p-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={ticked.includes(String(t.id))}
                          onChange={(e) =>
                            setTicked(e.target.checked ? [...ticked, String(t.id)] : ticked.filter((x) => x !== String(t.id)))
                          }
                          className="h-4 w-4 rounded text-sky-600"
                        />
                        <span className="text-slate-700">{String(t.name)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Parts used</label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setParts([...parts, { item: '', qty: '1', cost: '' }])} className="border-[#E5E2DB] text-slate-700 hover:bg-slate-50">
                    + Add part
                  </Button>
                </div>
                {parts.map((p, i) => (
                  <div key={i} className="mt-2 grid grid-cols-3 gap-2">
                    <Input placeholder="Item" value={p.item} onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} className="border-[#E5E2DB] focus:border-sky-400" />
                    <Input placeholder="Qty" type="number" step="0.1" value={p.qty} onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} className="border-[#E5E2DB] focus:border-sky-400" />
                    <Input placeholder="Unit cost" type="number" step="0.01" value={p.cost} onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} className="border-[#E5E2DB] focus:border-sky-400" />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={saving || !machineId} className="bg-sky-600 text-white hover:bg-sky-700">{saving ? 'Saving…' : 'Save Visit'}</Button>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-900">Visit History</h2>
          </div>
          {!machineId ? (
            <p className="text-slate-500">Select a machine first.</p>
          ) : visits.length === 0 ? (
            <p className="text-slate-500">No visits recorded for this machine.</p>
          ) : (
            <div className="space-y-2">
              {visits.slice(0, 10).map((v) => (
                <div key={String(v.id)} className="flex items-center justify-between rounded-lg border border-[#E5E2DB] bg-slate-50 p-3 text-sm">
                  <span className="font-medium text-slate-900">{String(v.visit_type)}</span>
                  <span className="text-slate-500">{String(v.visit_date).slice(0, 10)} · {String(v.mechanic ?? '')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
