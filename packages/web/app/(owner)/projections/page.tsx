'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, TrendingUp, DollarSign, BarChart3, Target, ArrowRight } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { sampleProjections } from '@/lib/sample-data';

interface Projection {
  inputs: { workingDays: number; unitsPerDay: number; rateMinor: number; currency: string };
  expense_ratio: number;
  projected_billing_minor: number;
  projected_costs_minor: number;
  projected_contribution_minor: number;
  currency: string;
  note: string;
}

interface SavedProjection {
  id: string;
  name: string;
  machine_code: string;
  working_days: number;
  units_per_day: number;
  rate_minor: number;
  currency: string;
  projected_billing_minor: number;
  projected_costs_minor: number;
  projected_contribution_minor: number;
  expense_ratio: number;
  status: string;
}

function money(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function ProjectionsPage() {
  const [defaults, setDefaults] = useState<{ working_days_per_month?: number; working_units_per_day?: number } | null>(null);
  const [form, setForm] = useState({ working_days: '26', units_per_day: '8', rate: '', currency: 'INR' });
  const [result, setResult] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedProjections, setSavedProjections] = useState<SavedProjection[]>(sampleProjections);

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
      const workingDays = parseInt(form.working_days || '26', 10);
      const unitsPerDay = parseInt(form.units_per_day || '8', 10);
      const rateMinor = Math.round(parseFloat(form.rate || '0') * 100);
      
      // Try API first, fallback to local calculation
      try {
        const q = new URLSearchParams({
          working_days: form.working_days,
          units_per_day: form.units_per_day,
          rate_minor: String(rateMinor),
          currency: form.currency,
        });
        const res = await authFetch(`/api/v1/reports/projections?${q.toString()}`);
        if (res.ok) {
          setResult(await res.json());
          return;
        }
      } catch { /* fallback */ }
      
      // Local calculation fallback
      const projectedBilling = workingDays * unitsPerDay * rateMinor;
      const projectedCosts = Math.round(projectedBilling * 0.5);
      setResult({
        inputs: { workingDays, unitsPerDay, rateMinor, currency: form.currency },
        expense_ratio: 50,
        projected_billing_minor: projectedBilling,
        projected_costs_minor: projectedCosts,
        projected_contribution_minor: projectedBilling - projectedCosts,
        currency: form.currency,
        note: 'Calculated locally (demo mode)',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalBilling = savedProjections.reduce((sum, p) => sum + p.projected_billing_minor, 0);
  const totalContribution = savedProjections.reduce((sum, p) => sum + p.projected_contribution_minor, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projections</h1>
        <p className="text-muted-foreground mt-1">
          Working days × units/day × rate → projected billing and contribution
          {defaults ? ` (defaults: ${defaults.working_days_per_month} days, ${defaults.working_units_per_day} units/day)` : ''}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalBilling)}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Projected Billing</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalContribution)}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Total Contribution</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{savedProjections.length}</p>
            </div>
            <p className="text-violet-100 text-xs mt-1">Saved Projections</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Projection Inputs
            </CardTitle>
          </div>
          <CardContent className="pt-6">
            <form onSubmit={(e) => void run(e)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Working days *</label>
                  <Input type="number" value={form.working_days} onChange={(e) => setForm({ ...form, working_days: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Units / day *</label>
                  <Input type="number" step="0.1" value={form.units_per_day} onChange={(e) => setForm({ ...form, units_per_day: e.target.value })} required className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Rate (major / unit) *</label>
                  <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Currency</label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="mt-1" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                {loading ? 'Projecting…' : 'Calculate Projection'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" /> Projection Result
            </CardTitle>
          </div>
          <CardContent className="pt-6">
            {!result ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-500">Enter inputs and click Calculate</p>
                <p className="text-gray-400 text-sm mt-2">See projected billing and contribution</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-4 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Projected Billing</span>
                    <span className="text-xl font-bold text-blue-600">{money(result.projected_billing_minor)}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Projected Costs ({result.expense_ratio}%)</span>
                    <span className="text-xl font-bold text-amber-600">{money(result.projected_costs_minor)}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border border-green-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Projected Contribution</span>
                    <span className="text-xl font-bold text-green-600">{money(result.projected_contribution_minor)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">{result.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Saved Projections
          </CardTitle>
        </div>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Machine</th>
                  <th className="py-2 pr-2">Site</th>
                  <th className="py-2 pr-2">Days</th>
                  <th className="py-2 pr-2">Units/Day</th>
                  <th className="py-2 pr-2">Rate</th>
                  <th className="py-2 pr-2">Billing</th>
                  <th className="py-2 pr-2">Contribution</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {savedProjections.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-2 font-medium">{p.machine_code}</td>
                    <td className="py-3 pr-2">{p.name}</td>
                    <td className="py-3 pr-2">{p.working_days}</td>
                    <td className="py-3 pr-2">{p.units_per_day}</td>
                    <td className="py-3 pr-2">{money(p.rate_minor)}/unit</td>
                    <td className="py-3 pr-2 font-bold text-blue-600">{money(p.projected_billing_minor)}</td>
                    <td className="py-3 pr-2 font-bold text-green-600">{money(p.projected_contribution_minor)}</td>
                    <td className="py-3 pr-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
