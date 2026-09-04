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

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function money(minor: unknown): string {
  return `₹${(num(minor) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CashPage() {
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [transfers, setTransfers] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Row[]>([]);
  const [expected, setExpected] = useState<Row[]>([]);
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ from_account_id: '', to_account_id: '', currency: 'INR', amount: '', reference: '' });

  const load = async () => {
    setLoading(true);
    const [a, t, e] = await Promise.all([
      fetchList<Row>('/api/v1/cash/accounts'),
      fetchList<Row>('/api/v1/cash/transfers'),
      fetchList<Row>('/api/v1/cash/expected'),
    ]);
    setAccounts(a);
    setTransfers(t);
    setExpected(e);
    if (a.length > 0 && !accountId) setAccountId(String(a[0].id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (accountId) fetchList<Row>(`/api/v1/cash/accounts/${accountId}/counts`).then(setCounts);
  }, [accountId]);

  const transfer = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const res = await authFetch('/api/v1/cash/transfers', {
      method: 'POST',
      body: JSON.stringify({
        from_account_id: form.from_account_id,
        to_account_id: form.to_account_id,
        currency: form.currency,
        amount_minor: Math.round(parseFloat(form.amount || '0') * 100),
        reference: form.reference || undefined,
        transfer_date: new Date().toISOString().slice(0, 10),
        client_uuid: crypto.randomUUID(),
      }),
    });
    if (res.ok) {
      setForm({ from_account_id: '', to_account_id: '', currency: 'INR', amount: '', reference: '' });
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cash</h1>
        <p className="text-muted-foreground">Accounts, remittances and physical counts.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {accounts.map((a) => {
              const ex = expected.find((x) => String(x.account_id) === String(a.id));
              return (
                <Card key={String(a.id)} className={accountId === String(a.id) ? 'border-primary' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{String(a.name)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{String(a.type ?? '')} · {String(a.currency ?? '')}</p>
                    {ex && (
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="flex justify-between"><span className="text-muted-foreground">Expected</span><span className="font-medium">{money(ex.expected_minor)}</span></p>
                        <p className="flex justify-between"><span className="text-muted-foreground">Last count</span><span className="font-medium">{money(ex.last_count_minor)}</span></p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Variance</span>
                          <span className={`font-bold ${num(ex.variance_minor) === 0 ? 'text-green-700' : 'text-red-700'}`}>{money(ex.variance_minor)}</span>
                        </p>
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setAccountId(String(a.id))}>
                      View counts
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {accounts.length === 0 && <p className="text-muted-foreground">No cash accounts yet.</p>}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New remittance</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={transfer} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">From *</label>
                      <select className="w-full border rounded-md p-2" value={form.from_account_id} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })} required>
                        <option value="">Select...</option>
                        {accounts.map((a) => (
                          <option key={String(a.id)} value={String(a.id)}>{String(a.name)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">To *</label>
                      <select className="w-full border rounded-md p-2" value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })} required>
                        <option value="">Select...</option>
                        {accounts.map((a) => (
                          <option key={String(a.id)} value={String(a.id)}>{String(a.name)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Amount (major) *</label>
                      <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Reference</label>
                      <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit">Transfer</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent transfers</CardTitle>
              </CardHeader>
              <CardContent>
                {transfers.length === 0 ? (
                  <p className="text-muted-foreground">No transfers yet.</p>
                ) : (
                  <div className="space-y-2">
                    {transfers.slice(0, 8).map((t) => (
                      <div key={String(t.id)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                        <span>{String(t.transfer_date).slice(0, 10)} · {String(t.reference ?? '')}</span>
                        <span className="font-medium">{money(t.amount_minor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Physical counts{accountId ? ` (${counts.length})` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              {counts.length === 0 ? (
                <p className="text-muted-foreground">No counts for this account yet.</p>
              ) : (
                <div className="space-y-2">
                  {counts.slice(0, 10).map((c) => (
                    <div key={String(c.id)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                      <span>{String(c.count_date).slice(0, 10)}</span>
                      <span className="text-muted-foreground">{String(c.note ?? '')}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Ops counts blind — expected balance is owner-only.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
