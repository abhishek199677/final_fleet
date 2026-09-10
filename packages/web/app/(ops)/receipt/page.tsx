'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/api/fetch-list';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useAuth } from '@/lib/auth/context';
import { sampleReceipts, sampleClients } from '@/lib/sample-data';
import { Banknote, ArrowDownToLine } from 'lucide-react';

interface Row extends Record<string, unknown> {
  id?: string;
}

export default function ReceiptPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const { enqueue } = useOfflineQueue();
  const [clients, setClients] = useState<Row[]>([]);
  const [mine, setMine] = useState<Row[]>([]);
  const [form, setForm] = useState({
    client_id: '',
    event_type: 'receipt',
    currency: 'INR',
    amount: '',
    mode: 'cash',
    reference: '',
    event_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    void fetchList<Row>('/api/v1/clients').then(data => {
      if (data.length > 0) {
        setClients(data);
      } else {
        setClients(sampleClients);
      }
    }).catch(() => setClients(sampleClients));
    
    void fetchList<Row>('/api/v1/client-money/events').then(data => {
      if (data.length > 0) {
        setMine(data.slice(0, 10));
      } else {
        setMine(sampleReceipts);
      }
    }).catch(() => setMine(sampleReceipts));
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const body = {
        client_id: form.client_id,
        event_type: form.event_type,
        currency: form.currency,
        amount_minor: Math.round(parseFloat(form.amount || '0') * 100),
        mode: form.mode,
        reference: form.reference || undefined,
        event_date: form.event_date,
        client_uuid: crypto.randomUUID(),
      };
      const token = localStorage.getItem('fleetos_token');
      await enqueue('/api/v1/client-money/events', 'POST', body, token ? { Authorization: `Bearer ${token}` } : {});
      setForm({ ...form, amount: '', reference: '' });
      void load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Receipt / Advance</h1>
            <p className="text-white/80">Record client money with evidence. Balances stay owner-only.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!isReadOnly && (
          <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">New Receipt / Advance</h2>
            </div>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Client *</label>
                  <select className="w-full rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-emerald-400 focus:outline-none" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Type *</label>
                  <select className="w-full rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-emerald-400 focus:outline-none" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                    <option value="receipt">Receipt</option>
                    <option value="advance">Advance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Amount (major) *</label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="border-[#E5E2DB] focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Date *</label>
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required className="border-[#E5E2DB] focus:border-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Mode</label>
                  <Input value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="border-[#E5E2DB] focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Reference</label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="border-[#E5E2DB] focus:border-emerald-400" />
                </div>
              </div>
              <Button type="submit" disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">{saving ? 'Saving…' : 'Save'}</Button>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">{isReadOnly ? 'Recent Entries' : 'My Recent Entries'}</h2>
          </div>
          {mine.length === 0 ? (
            <p className="text-slate-500">No entries logged yet.</p>
          ) : (
            <div className="space-y-2">
              {mine.map((e) => (
                <div key={String(e.id)} className="flex items-center justify-between rounded-lg border border-[#E5E2DB] bg-slate-50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{String(e.client_name ?? '')}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{String(e.event_type)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">₹{((e.amount_minor as number) / 100).toLocaleString('en-IN')}</span>
                    <span className="text-slate-500">{String(e.event_date).slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
