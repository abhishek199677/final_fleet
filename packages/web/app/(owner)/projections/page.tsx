'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';

interface Projection {
  inputs: { workingDays: number; unitsPerDay: number; rateMinor: number; currency: string };
  expense_ratio: number;
  projected_billing_minor: number;
  projected_costs_minor: number;
  projected_contribution_minor: number;
  currency: string;
  note: string;
}

function money(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function ProjectionsPage() {
  const [defaults, setDefaults] = useState<{ working_days_per_month?: number; working_units_per_day?: number } | null>(null);
  const [form, setForm] = useState({ working_days: '26', units_per_day: '8', rate: '', currency: 'INR' });
  const [result, setResult] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch('/api/v1/reports/projection-inputs')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) {
          setDefaults(j);
          setForm((f) => ({
            ...f,
            working_days: String(j.working_days_per_month ?? f.working_days),
            units_per_day: String(j.working_units_per_day ?? f.units_per_day),
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  const run = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const q = new URLSearchParams({
        working_days: form.working_days,
        units_per_day: form.units_per_day,
        rate_minor: String(Math.round(parseFloat(form.rate || '0') * 100)),
        currency: form.currency,
      });
      const res = await authFetch(`/api/v1/reports/projections?${q.toString()}`);
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projections</h1>
        <p className="text-muted-foreground">
          Working days × units/day × rate → projected billing and contribution
          {defaults ? ` (tenant defaults: ${defaults.working_days_per_month} days, ${defaults.working_units_per_day} units/day).` : '.'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void run(e)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Working days *</label>
                  <Input type="number" value={form.working_days} onChange={(e) => setForm({ ...form, working_days: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Units / day *</label>
                  <Input type="number" step="0.1" value={form.units_per_day} onChange={(e) => setForm({ ...form, units_per_day: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Rate (major / unit) *</label>
                  <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
              </div>
              <Button type="submit" disabled={loading}>{loading ? 'Projecting…' : 'Project'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-muted-foreground">Enter inputs and press Project.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded bg-muted p-2"><span>Projected billing</span><span className="font-bold">{money(result.projected_billing_minor)}</span></div>
                <div className="flex justify-between rounded bg-muted p-2"><span>Projected costs ({result.expense_ratio}% ratio)</span><span className="font-medium">{money(result.projected_costs_minor)}</span></div>
                <div className="flex justify-between rounded bg-muted p-2"><span>Projected contribution</span><span className="font-bold text-green-700">{money(result.projected_contribution_minor)}</span></div>
                <p className="text-xs text-muted-foreground">{result.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
