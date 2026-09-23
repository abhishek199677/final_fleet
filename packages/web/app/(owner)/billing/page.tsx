'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, CreditCard, TrendingUp, AlertCircle, Receipt, IndianRupee, Plus } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchListStrict } from '@/lib/api/fetch-list';
import { ApiErrorBanner } from '@/components/api-error-banner';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';

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
  const [formError, setFormError] = useState('');

  const [apiError, setApiError] = useState(false);

  const load = async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [d, r, e, c, rec] = await Promise.all([
        fetchListStrict<Row>('/api/v1/deployments'),
        fetchListStrict<Row>('/api/v1/billing/rate-cards'),
        fetchListStrict<Row>('/api/v1/billing/extra-charges'),
        fetchListStrict<Row>('/api/v1/billing/contribution'),
        fetchListStrict<Row>('/api/v1/billing/receivables'),
      ]);
      // API up → show exactly what's in the DB (empty = empty state)
      setDeployments(d);
      setRates(r);
      setExtras(e);
      setContrib(c);
      setReceivables(rec);
    } catch {
      // API down → banner only, never fake billing records
      setApiError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createRate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError('');
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
      setFormError('Rate card was not created — nothing was saved.');
    } catch {
      setFormError('Rate card was not created — the API is unreachable.');
    }
  };

  const runBilling = async (deploymentId: string) => {
    setRunning(deploymentId);
    setFormError('');
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = today.toISOString().slice(0, 10);
    try {
      const res = await authFetch('/api/v1/billing/run', {
        method: 'POST',
        body: JSON.stringify({ deployment_id: deploymentId, period_start: start, period_end: end, client_uuid: crypto.randomUUID() }),
      });
      if (!res.ok) {
        setFormError('Billing run failed — check the deployment has a rate card for this period.');
      }
    } catch {
      setFormError('Billing run failed — the API is unreachable.');
    } finally {
      setRunning(null);
      void load();
    }
  };

  const holdToggle = async (d: Row) => {
    const onHold = String(d.status) === 'on_hold_payment';
    setFormError('');
    try {
      const res = await authFetch(`/api/v1/deployments/${d.id}/${onHold ? 'release' : 'hold'}`, {
        method: 'POST',
        body: JSON.stringify({ client_uuid: crypto.randomUUID() }),
      });
      if (!res.ok) {
        setFormError(`Could not ${onHold ? 'release' : 'hold'} the deployment — status unchanged.`);
      }
    } catch {
      setFormError('Could not change the deployment — the API is unreachable.');
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
      {apiError && <ApiErrorBanner onRetry={() => { void load(); }} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">Rate cards, billing runs, contribution and receivables</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalBilled)}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Billed</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalReceived)}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Total Received</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalOutstanding)}</p>
            </div>
            <p className="text-amber-100 text-xs mt-1">Outstanding</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
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
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><Receipt /></EmptyMedia>
                    <EmptyTitle>No deployments yet</EmptyTitle>
                    <EmptyDescription>Create a deployment first — billing runs against active deployments.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
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
                                {running === String(d.id) ? (
                                  <>
                                    <Spinner /> Running…
                                  </>
                                ) : (
                                  'Run billing'
                                )}
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
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Plus className="h-5 w-5" /> New Rate Card
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <form onSubmit={(e) => void createRate(e)} className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="rate-deployment">Deployment *</FieldLabel>
                    <NativeSelect
                      id="rate-deployment"
                      className="w-full"
                      value={form.deployment_id}
                      onChange={(e) => setForm({ ...form, deployment_id: e.target.value })}
                      required
                    >
                      <NativeSelectOption value="">Select deployment…</NativeSelectOption>
                      {deployments.map((d) => (
                        <NativeSelectOption key={String(d.id)} value={String(d.id)}>
                          {String(d.machine_code)} · {String(d.site_name)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="rate-strategy">Strategy *</FieldLabel>
                      <NativeSelect
                        id="rate-strategy"
                        className="w-full"
                        value={form.strategy}
                        onChange={(e) => setForm({ ...form, strategy: e.target.value })}
                      >
                        <NativeSelectOption value="hourly">Hourly</NativeSelectOption>
                        <NativeSelectOption value="daily">Daily fixed</NativeSelectOption>
                        <NativeSelectOption value="monthly">Monthly hire</NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="rate-amount">Rate (major) *</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <InputGroupText>₹</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="rate-amount"
                          type="number"
                          step="0.01"
                          value={form.rate}
                          onChange={(e) => setForm({ ...form, rate: e.target.value })}
                          required
                        />
                      </InputGroup>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="rate-min-units">Min units/day</FieldLabel>
                      <Input
                        id="rate-min-units"
                        type="number"
                        step="0.1"
                        value={form.min_units_per_day}
                        onChange={(e) => setForm({ ...form, min_units_per_day: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="rate-effective">Effective from *</FieldLabel>
                      <Input
                        id="rate-effective"
                        type="date"
                        value={form.effective_from}
                        onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                        required
                      />
                    </Field>
                  </div>
                  <Button type="submit" className="w-full">
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
              <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-4">
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
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4">
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
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
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
