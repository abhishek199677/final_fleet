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

export default function ReceiptPage() {
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
    void fetchList<Row>('/api/v1/clients').then(setClients);
    void fetchList<Row>('/api/v1/client-money/events').then((e) => setMine(e.slice(0, 10)));
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/client-money/events', {
        method: 'POST',
        body: JSON.stringify({
          client_id: form.client_id,
          event_type: form.event_type,
          currency: form.currency,
          amount_minor: Math.round(parseFloat(form.amount || '0') * 100),
          mode: form.mode,
          reference: form.reference || undefined,
          event_date: form.event_date,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        setForm({ ...form, amount: '', reference: '' });
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receipt / Advance</h1>
        <p className="text-muted-foreground">Record client money with evidence. Balances stay owner-only.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New receipt / advance</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Client *</label>
                  <select className="w-full border rounded-md p-2" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Type *</label>
                  <select className="w-full border rounded-md p-2" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                    <option value="receipt">Receipt</option>
                    <option value="advance">Advance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Amount (major) *</label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Mode</label>
                  <Input value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Reference</label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My recent entries</CardTitle>
          </CardHeader>
          <CardContent>
            {mine.length === 0 ? (
              <p className="text-muted-foreground">Nothing logged by you yet.</p>
            ) : (
              <div className="space-y-2">
                {mine.map((e) => (
                  <div key={String(e.id)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                    <span className="font-medium">{String(e.client_name ?? '')} · {String(e.event_type)}</span>
                    <span className="text-muted-foreground">{String(e.event_date).slice(0, 10)}</span>
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
