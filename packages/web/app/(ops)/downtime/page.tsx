'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/api/fetch-list';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useAuth } from '@/lib/auth/context';
import { sampleDowntime, sampleMachines } from '@/lib/sample-data';
import { Clock, AlertTriangle } from 'lucide-react';

interface Row extends Record<string, unknown> {
  id?: string;
}

const REASONS = ['no_diesel', 'breakdown', 'transport', 'police_permit', 'no_work_client', 'weather', 'operator_absent', 'other'];

export default function DowntimePage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const { enqueue } = useOfflineQueue();
  const [machines, setMachines] = useState<Row[]>([]);
  const [recent, setRecent] = useState<Row[]>([]);
  const [form, setForm] = useState({ machine_id: '', started_at: '', ended_at: '', reason_code: 'breakdown', note: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    void fetchList<Row>('/api/v1/machines').then(data => {
      if (data.length > 0) {
        setMachines(data);
      } else {
        setMachines(sampleMachines);
      }
    }).catch(() => setMachines(sampleMachines));
    
    void fetchList<Row>('/api/v1/fuel-downtime/downtime').then(data => {
      if (data.length > 0) {
        setRecent(data.slice(0, 10));
      } else {
        setRecent(sampleDowntime);
      }
    }).catch(() => setRecent(sampleDowntime));
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const body = {
        machine_id: form.machine_id,
        started_at: new Date(form.started_at).toISOString(),
        ended_at: form.ended_at ? new Date(form.ended_at).toISOString() : undefined,
        reason_code: form.reason_code,
        note: form.note || undefined,
        client_uuid: crypto.randomUUID(),
      };
      const token = localStorage.getItem('fleetos_token');
      await enqueue('/api/v1/fuel-downtime/downtime', 'POST', body, token ? { Authorization: `Bearer ${token}` } : {});
      setForm({ machine_id: '', started_at: '', ended_at: '', reason_code: 'breakdown', note: '' });
      void load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-slate-500 to-gray-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Downtime</h1>
            <p className="text-white/80">{isReadOnly ? 'View stopped time records with reasons.' : 'Log stopped time with a reason — no overlapping mystery hours.'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!isReadOnly && (
          <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Log Downtime</h2>
            </div>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Machine *</label>
                <select className="w-full rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-slate-400 focus:outline-none" value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })} required>
                  <option value="">Select machine...</option>
                  {machines.map((m) => (
                    <option key={String(m.id)} value={String(m.id)}>{String(m.code)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">From *</label>
                  <Input type="datetime-local" value={form.started_at} onChange={(e) => setForm({ ...form, started_at: e.target.value })} required className="border-[#E5E2DB] focus:border-slate-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">To</label>
                  <Input type="datetime-local" value={form.ended_at} onChange={(e) => setForm({ ...form, ended_at: e.target.value })} className="border-[#E5E2DB] focus:border-slate-400" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Reason *</label>
                <select className="w-full rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-slate-400 focus:outline-none" value={form.reason_code} onChange={(e) => setForm({ ...form, reason_code: e.target.value })}>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Note</label>
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="border-[#E5E2DB] focus:border-slate-400" />
              </div>
              <Button type="submit" disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">{saving ? 'Saving…' : 'Save Downtime'}</Button>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Downtime</h2>
          </div>
          {recent.length === 0 ? (
            <p className="text-slate-500">No downtime recorded.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((d) => (
                <div key={String(d.id)} className="flex items-center justify-between rounded-lg border border-[#E5E2DB] bg-slate-50 p-3 text-sm">
                  <span className="font-medium text-slate-900">{String(d.machine_code ?? '')}</span>
                  <span className="text-slate-600">{String(d.reason_code ?? '').replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">{new Date(String(d.started_at)).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
