'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';

export default function NewClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    currency: 'INR',
    payment_terms_days: '30',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setFormData((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact || undefined,
          phone: formData.phone || undefined,
          currency: formData.currency || 'INR',
          payment_terms_days: parseInt(formData.payment_terms_days) || 30,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        router.push('/clients');
      } else {
        const j = await res.json().catch(() => null);
        setError((j?.detail as string) || 'Failed to create client');
      }
    } catch {
      setError('API server unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Add Client</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input value={formData.name} onChange={(e) => set('name', e.target.value)} placeholder="BuildIt Corp" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Contact</label>
                <Input value={formData.contact} onChange={(e) => set('contact', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={formData.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Input value={formData.currency} onChange={(e) => set('currency', e.target.value)} placeholder="INR" />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Terms (days)</label>
                <Input type="number" value={formData.payment_terms_days} onChange={(e) => set('payment_terms_days', e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Client'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
