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

export default function BillingPage() {
  const [deployments, setDeployments] = useState<Row[]>([]);
  const [rates, setRates] = useState<Row[]>([]);
  const [extras, setExtras] = useState<Row[]>([]);
  const [contrib, setContrib] = useState<Row[]>([]);
  const [receivables, setReceivables] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    deployment_id: '',
    strategy: 'hourly',
    rate: '',
    currency: 'INR',
    min_units_per_day: '0',
    effective_from: new Date().toISOString().slice(0, 10),
  });
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [d, r, e, c, rec] = await Promise.all([
      fetchList<Row>('/api/v1/deployments'),
      fetchList<Row>('/api/v1/billing/rate-cards'),
      fetchList<Row>('/api/v1/billing/extra-charges'),
      fetchList<Row>('/api/v1/billing/contribution'),
      fetchList<Row>('/api/v1/billing/receivables'),
    ]);
    setDeployments(d);
    setRates(r);
    setExtras(e);
    setContrib(c);
    setReceivables(rec);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createRate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const res = await authFetch('/api/v1/billing/rate-cards', {
      method: 'POST',
      body: JSON.stringify({
        deployment_id: form.deployment_id,
        strategy: form.strategy,
        rate_minor: Math.round(parseFloat(form.rate || '0') * 100),
        currency: form.currency,
        min_units_per_day: parseFloat(form.min_units_per_day || '0'),
        effective_from: form.effective_from,
        client_uuid: crypto.randomUUID(),
      }),
    });
    if (res.ok) {
      setForm({ ...form, rate: '' });
      void load();
    }
  };

  const runBilling = async (deploymentId: string) => {
    setRunning(deploymentId);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = today.toISOString().slice(0, 10);
    try {
      await authFetch('/api/v1/billing/run', {
        method: 'POST',
        body: JSON.stringify({ deployment_id: deploymentId, period_start: start, period_end: end, client_uuid: crypto.randomUUID() }),
      });
    } finally {
      setRunning(null);
      void load();
    }
  };

  const holdToggle = async (d: Row) => {
    const onHold = String(d.status) === 'on_hold_payment';
    await authFetch(`/api/v1/deployments/${d.id}/${onHold ? 'release' : 'hold'}`, {
      method: 'POST',
      body: JSON.stringify({ client_uuid: crypto.randomUUID() }),
    });
    void load();
  };

  const exportCsv = () => {
    const rows = contrib.map((c) =>
      [c.machine_id, c.billed_minor, c.diesel_minor, c.parts_minor, c.labour_minor].join(','),
    );
    const blob = new Blob([`machine_id,billed,diesel,parts,labour\n${rows.join('\n')}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'machine-contribution.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Rate cards, billing runs, contribution and receivables.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Deployments & billing runs</CardTitle>
            </CardHeader>
            <CardContent>
              {deployments.length === 0 ? (
                <p className="text-muted-foreground">No deployments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-2">Machine</th>
                        <th className="py-2 pr-2">Site</th>
                        <th className="py-2 pr-2">Client</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deployments.map((d) => (
                        <tr key={String(d.id)} className="border-b last:border-0">
                          <td className="py-2 pr-2 font-medium">{String(d.machine_code ?? '')}</td>
                          <td className="py-2 pr-2">{String(d.site_name ?? '')}</td>
                          <td className="py-2 pr-2">{String(d.client_name ?? '')}</td>
                          <td className="py-2 pr-2">
                            <span className={`rounded px-2 py-0.5 text-xs ${String(d.status) === 'on_hold_payment' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {String(d.status ?? 'active').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" disabled={running === String(d.id)} onClick={() => void runBilling(String(d.id))}>
                                {running === String(d.id) ? 'Running…' : 'Run billing'}
                              </Button>
                              <Button size="sm" variant={String(d.status) === 'on_hold_payment' ? 'default' : 'destructive'} onClick={() => void holdToggle(d)}>
                                {String(d.status) === 'on_hold_payment' ? 'Release' : 'Hold'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New rate card</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => void createRate(e)} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Deployment *</label>
                    <select className="w-full border rounded-md p-2" value={form.deployment_id} onChange={(e) => setForm({ ...form, deployment_id: e.target.value })} required>
                      <option value="">Select deployment...</option>
                      {deployments.map((d) => (
                        <option key={String(d.id)} value={String(d.id)}>
                          {String(d.machine_code)} · {String(d.site_name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Strategy *</label>
                      <select className="w-full border rounded-md p-2" value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })}>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily fixed</option>
                        <option value="monthly">Monthly hire</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rate (major) *</label>
                      <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Min units/day</label>
                      <Input type="number" step="0.1" value={form.min_units_per_day} onChange={(e) => setForm({ ...form, min_units_per_day: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Effective from *</label>
                      <Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} required />
                    </div>
                  </div>
                  <Button type="submit">Save rate card</Button>
                </form>
                {rates.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {rates.slice(0, 6).map((r) => (
                      <div key={String(r.id)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                        <span>{String(r.machine_code)} · {String(r.strategy)} · from {String(r.effective_from).slice(0, 10)}</span>
                        <span className="font-medium">{money(r.rate_minor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Machine contribution</CardTitle>
              </CardHeader>
              <CardContent>
                {contrib.length === 0 ? (
                  <p className="text-muted-foreground">No billed amounts yet — run billing first.</p>
                ) : (
                  <div className="space-y-2">
                    {contrib.slice(0, 8).map((c, i) => {
                      const billed = num(c.billed_minor);
                      const costs = num(c.diesel_minor) + num(c.parts_minor) + num(c.labour_minor);
                      return (
                        <div key={String(c.machine_id ?? i)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                          <span className="font-medium">{money(billed)} <span className="text-muted-foreground">− {money(costs)}</span></span>
                          <span className={`font-bold ${billed - costs >= 0 ? 'text-green-700' : 'text-red-700'}`}>{money(billed - costs)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receivables</CardTitle>
              </CardHeader>
              <CardContent>
                {receivables.length === 0 ? (
                  <p className="text-muted-foreground">No receivables.</p>
                ) : (
                  <div className="space-y-2">
                    {receivables.slice(0, 8).map((r) => (
                      <div key={String(r.client_id ?? r.client_name)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                        <span>{String(r.client_name)}</span>
                        <span className="font-medium">
                          {money(num(r.balance_minor ?? (num(r.billed_minor) + num(r.extras_minor) - num(r.credits_minor) - num(r.receipts_minor) - num(r.advances_consumed_minor))))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Extra charges ({extras.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {extras.length === 0 ? (
                  <p className="text-muted-foreground">No extra charges.</p>
                ) : (
                  <div className="space-y-2">
                    {extras.slice(0, 8).map((e) => (
                      <div key={String(e.id)} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                        <span>{String(e.kind)} · {String(e.date).slice(0, 10)}</span>
                        <span className="font-medium">{money(e.amount_minor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
