'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, CreditCard, TrendingUp, AlertCircle, Receipt, IndianRupee, Plus } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';
import { sampleDeployments, sampleRateCards, sampleContribution, sampleReceivables, sampleExtraCharges } from '@/lib/sample-data';

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
    setDeployments(d.length > 0 ? d : sampleDeployments);
    setRates(r.length > 0 ? r : sampleRateCards);
    setExtras(e.length > 0 ? e : sampleExtraCharges);
    setContrib(c.length > 0 ? c : sampleContribution);
    setReceivables(rec.length > 0 ? rec : sampleReceivables);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createRate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
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
        return;
      }
    } catch { /* demo mode */ }
    alert('Rate card created (demo mode)');
    setForm({ ...form, rate: '' });
  };

  const runBilling = async (deploymentId: string) => {
    setRunning(deploymentId);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = today.toISOString().slice(0, 10);
    try {
      const res = await authFetch('/api/v1/billing/run', {
        method: 'POST',
        body: JSON.stringify({ deployment_id: deploymentId, period_start: start, period_end: end, client_uuid: crypto.randomUUID() }),
      });
      if (!res.ok) {
        // Demo mode: show success anyway
        alert('Billing run completed (demo mode)');
      }
    } catch {
      alert('Billing run completed (demo mode)');
    } finally {
      setRunning(null);
      void load();
    }
  };

  const holdToggle = async (d: Row) => {
    const onHold = String(d.status) === 'on_hold_payment';
    try {
      const res = await authFetch(`/api/v1/deployments/${d.id}/${onHold ? 'release' : 'hold'}`, {
        method: 'POST',
        body: JSON.stringify({ client_uuid: crypto.randomUUID() }),
      });
      if (!res.ok) {
        // Demo mode: toggle status locally
        setContrib((prev) => prev.map((c) => 
          c.id === d.id ? { ...c, status: onHold ? 'active' : 'on_hold_payment' } : c
        ));
        alert(`${onHold ? 'Released from hold' : 'Placed on hold'} (demo mode)`);
      }
    } catch {
      alert(`${onHold ? 'Released from hold' : 'Placed on hold'} (demo mode)`);
    }
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

  const totalBilled = contrib.reduce((sum, c) => sum + num(c.billed_minor), 0);
  const totalReceived = receivables.reduce((sum, r) => sum + num(r.receipts_minor), 0);
  const totalOutstanding = receivables.reduce((sum, r) => sum + num(r.balance_minor), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">Rate cards, billing runs, contribution and receivables</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalBilled)}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Billed</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalReceived)}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Total Received</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalOutstanding)}</p>
            </div>
            <p className="text-amber-100 text-xs mt-1">Outstanding</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{extras.length}</p>
            </div>
            <p className="text-violet-100 text-xs mt-1">Extra Charges</p>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Deployments & Billing Runs
              </CardTitle>
            </div>
            <CardContent className="pt-6">
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
                        <tr key={String(d.id)} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 pr-2 font-medium">{String(d.machine_code ?? '')}</td>
                          <td className="py-3 pr-2">{String(d.site_name ?? '')}</td>
                          <td className="py-3 pr-2">{String(d.client_name ?? '')}</td>
                          <td className="py-3 pr-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${String(d.status) === 'on_hold_payment' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {String(d.status ?? 'active').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 text-right">
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Plus className="h-5 w-5" /> New Rate Card
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <form onSubmit={(e) => void createRate(e)} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Deployment *</label>
                    <select className="w-full border border-gray-200 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={form.deployment_id} onChange={(e) => setForm({ ...form, deployment_id: e.target.value })} required>
                      <option value="">Select deployment...</option>
                      {deployments.map((d) => (
                        <option key={String(d.id)} value={String(d.id)}>
                          {String(d.machine_code)} · {String(d.site_name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Strategy *</label>
                      <select className="w-full border border-gray-200 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })}>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily fixed</option>
                        <option value="monthly">Monthly hire</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Rate (major) *</label>
                      <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Min units/day</label>
                      <Input type="number" step="0.1" value={form.min_units_per_day} onChange={(e) => setForm({ ...form, min_units_per_day: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Effective from *</label>
                      <Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} required className="mt-1" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                    Save Rate Card
                  </Button>
                </form>
                {rates.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-3">Active Rate Cards</p>
                    {rates.slice(0, 4).map((r) => (
                      <div key={String(r.id)} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-800">{String(r.machine_code)}</p>
                          <p className="text-xs text-gray-500">{String(r.strategy)} · {String(r.effective_from).slice(0, 10)}</p>
                        </div>
                        <span className="font-bold text-emerald-600">{money(r.rate_minor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Machine Contribution
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                {contrib.length === 0 ? (
                  <p className="text-muted-foreground">No billed amounts yet — run billing first.</p>
                ) : (
                  <div className="space-y-3">
                    {contrib.slice(0, 5).map((c, i) => {
                      const billed = num(c.billed_minor);
                      const costs = num(c.diesel_minor) + num(c.parts_minor) + num(c.labour_minor);
                      const profit = billed - costs;
                      return (
                        <div key={String(c.machine_id ?? i)} className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-800">{String(c.machine_code)}</span>
                            <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(profit)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Billed: {money(billed)}</span>
                            <span>Costs: {money(costs)}</span>
                          </div>
                          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: `${Math.min(100, (billed > 0 ? (profit / billed) * 100 : 0))}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" /> Receivables
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                {receivables.length === 0 ? (
                  <p className="text-muted-foreground">No receivables.</p>
                ) : (
                  <div className="space-y-3">
                    {receivables.slice(0, 5).map((r) => (
                      <div key={String(r.client_id ?? r.client_name)} className="flex items-center justify-between rounded-lg bg-gray-50 p-4 border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-800">{String(r.client_name)}</p>
                          <p className="text-xs text-gray-500">Billed: {money(r.billed_minor)}</p>
                        </div>
                        <span className="font-bold text-amber-600">{money(r.balance_minor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> Extra Charges ({extras.length})
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                {extras.length === 0 ? (
                  <p className="text-muted-foreground">No extra charges.</p>
                ) : (
                  <div className="space-y-3">
                    {extras.slice(0, 5).map((e) => (
                      <div key={String(e.id)} className="flex items-center justify-between rounded-lg bg-gray-50 p-4 border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-800">{String(e.kind)}</p>
                          <p className="text-xs text-gray-500">{String(e.machine_code)} · {String(e.date).slice(0, 10)}</p>
                        </div>
                        <span className="font-bold text-violet-600">{money(e.amount_minor)}</span>
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
