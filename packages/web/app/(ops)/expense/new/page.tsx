'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';

export default function NewExpense() {
  const router = useRouter();
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount_minor: '',
    currency: 'INR',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch('/api/v1/expenses/categories').then(r => r.json()).then(setCategories).catch(() => setCategories([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          amount_minor: parseInt(formData.amount_minor),
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) router.push('/expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Log Expense</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="text-sm font-medium">Amount (paise) *</label>
                <Input type="number" value={formData.amount_minor} onChange={e => setFormData({ ...formData, amount_minor: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
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
