'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/api/fetch-list';
import { useOfflineQueue } from '@/hooks/use-offline-queue';

export default function NewExpense() {
  const router = useRouter();
  const { enqueue } = useOfflineQueue();
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [cashAccounts, setCashAccounts] = useState<Record<string, unknown>[]>([]);
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [sites, setSites] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount_minor: '',
    currency: 'INR',
    fx_rate: '1',
    cash_account_id: '',
    allocation_type: 'overhead' as 'overhead' | 'site' | 'machine',
    site_id: '',
    machine_id: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/expenses/categories'),
      fetchList<Record<string, unknown>>('/api/v1/cash/accounts'),
      fetchList<Record<string, unknown>>('/api/v1/machines'),
      fetchList<Record<string, unknown>>('/api/v1/sites'),
    ]).then(([c, ca, m, s]) => {
      setCategories(c);
      setCashAccounts(ca);
      setMachines(m);
      setSites(s);
      // Set default cash account if only one
      if (ca.length === 1) {
        setFormData(prev => ({ ...prev, cash_account_id: ca[0].id as string }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amountMinor = parseInt(formData.amount_minor);
      const fxRate = parseFloat(formData.fx_rate) || 1;
      const baseMinor = Math.round(amountMinor * fxRate);

      const body: Record<string, unknown> = {
        category_id: formData.category_id,
        date: formData.date,
        description: formData.description,
        amount_minor: amountMinor,
        currency: formData.currency,
        fx_rate: fxRate,
        base_minor: baseMinor,
        cash_account_id: formData.cash_account_id || null,
        allocation_type: formData.allocation_type,
        notes: formData.notes || null,
        client_uuid: crypto.randomUUID(),
      };

      // Add allocation references
      if (formData.allocation_type === 'site' && formData.site_id) {
        body.site_id = formData.site_id;
      } else if (formData.allocation_type === 'machine' && formData.machine_id) {
        body.machine_id = formData.machine_id;
      }

      const token = localStorage.getItem('fleetos_token');
      await enqueue('/api/v1/expenses', 'POST', body, token ? { Authorization: `Bearer ${token}` } : {});
      router.push('/expense');
    } finally {
      setLoading(false);
    }
  };

  const baseMinor = formData.amount_minor
    ? Math.round(parseInt(formData.amount_minor) * (parseFloat(formData.fx_rate) || 1))
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Log Expense</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select className="w-full border rounded-md p-2" value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} required>
                <option value="">Select category...</option>
                {categories.map((c: Record<string, unknown>) => (
                  <option key={c.id as string} value={c.id as string}>{c.name as string}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date *</label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Cash Account</label>
                <select className="w-full border rounded-md p-2" value={formData.cash_account_id} onChange={e => setFormData({ ...formData, cash_account_id: e.target.value })}>
                  <option value="">Select account...</option>
                  {cashAccounts.map((a: Record<string, unknown>) => (
                    <option key={a.id as string} value={a.id as string}>{a.name as string}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Amount *</label>
                <Input type="number" value={formData.amount_minor} onChange={e => setFormData({ ...formData, amount_minor: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <select className="w-full border rounded-md p-2" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="KES">KES</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">FX Rate</label>
                <Input type="number" step="0.0001" value={formData.fx_rate} onChange={e => setFormData({ ...formData, fx_rate: e.target.value })} />
                {formData.currency !== 'INR' && (
                  <p className="text-xs text-muted-foreground mt-1">Base: ₹{baseMinor.toLocaleString()}</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Allocation (optional)</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Type</label>
                  <select className="w-full border rounded-md p-2" value={formData.allocation_type} onChange={e => setFormData({ ...formData, allocation_type: e.target.value as 'overhead' | 'site' | 'machine' })}>
                    <option value="overhead">Overhead</option>
                    <option value="site">Site</option>
                    <option value="machine">Machine</option>
                  </select>
                </div>
                {formData.allocation_type === 'site' && (
                  <div>
                    <label className="text-sm text-muted-foreground">Site</label>
                    <select className="w-full border rounded-md p-2" value={formData.site_id} onChange={e => setFormData({ ...formData, site_id: e.target.value })}>
                      <option value="">Select site...</option>
                      {sites.map((s: Record<string, unknown>) => (
                        <option key={s.id as string} value={s.id as string}>{s.name as string}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.allocation_type === 'machine' && (
                  <div>
                    <label className="text-sm text-muted-foreground">Machine</label>
                    <select className="w-full border rounded-md p-2" value={formData.machine_id} onChange={e => setFormData({ ...formData, machine_id: e.target.value })}>
                      <option value="">Select machine...</option>
                      {machines.map((m: Record<string, unknown>) => (
                        <option key={m.id as string} value={m.id as string}>{m.code as string}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea className="w-full border rounded-md p-2" rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
