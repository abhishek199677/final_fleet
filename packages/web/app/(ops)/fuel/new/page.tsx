'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

export default function NewFuelLog() {
  const router = useRouter();
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    machine_id: '',
    fuel_date: new Date().toISOString().split('T')[0],
    liters: '',
    amount_minor: '',
    currency: 'INR',
    vendor: '',
    odometer: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/machines').then(setMachines);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/fuel-downtime/fuel-logs', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          liters: parseFloat(formData.liters),
          amount_minor: parseInt(formData.amount_minor),
          odometer: formData.odometer ? parseFloat(formData.odometer) : undefined,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) router.push('/fuel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Log Fuel</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Machine *</label>
              <select className="w-full border rounded-md p-2" value={formData.machine_id} onChange={e => setFormData({ ...formData, machine_id: e.target.value })} required>
                <option value="">Select machine...</option>
                {machines.map((m: Record<string, unknown>) => (
                  <option key={m.id as string} value={m.id as string}>{m.code as string}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date *</label>
                <Input type="date" value={formData.fuel_date} onChange={e => setFormData({ ...formData, fuel_date: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Liters *</label>
                <Input type="number" step="0.01" value={formData.liters} onChange={e => setFormData({ ...formData, liters: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Amount (paise) *</label>
                <Input type="number" value={formData.amount_minor} onChange={e => setFormData({ ...formData, amount_minor: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Odometer</label>
                <Input type="number" step="0.1" value={formData.odometer} onChange={e => setFormData({ ...formData, odometer: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Vendor</label>
              <Input value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Fuel Log'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
