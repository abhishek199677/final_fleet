'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhotoCapture } from '@/components/ui/photo-capture';
import { fetchList } from '@/lib/api/fetch-list';
import { useOfflineQueue } from '@/hooks/use-offline-queue';

export default function NewFuelLog() {
  const router = useRouter();
  const { enqueue } = useOfflineQueue();
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    machine_id: '',
    fuel_date: new Date().toISOString().split('T')[0],
    liters: '',
    amount_minor: '',
    currency: 'INR',
    fx_rate: '1',
    vendor: '',
    odometer: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);

  useEffect(() => {
    void fetchList<Record<string, unknown>>('/api/v1/machines').then(setMachines);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amountMinor = parseInt(formData.amount_minor);
      const fxRate = parseFloat(formData.fx_rate) || 1;
      const baseMinor = Math.round(amountMinor * fxRate);

      const body = {
        machine_id: formData.machine_id,
        fuel_date: formData.fuel_date,
        liters: parseFloat(formData.liters),
        cost_minor: amountMinor,
        currency: formData.currency,
        fx_rate: fxRate,
        base_minor: baseMinor,
        vendor: formData.vendor || undefined,
        odometer: formData.odometer ? parseFloat(formData.odometer) : undefined,
        notes: formData.notes || undefined,
        client_uuid: crypto.randomUUID(),
      };

      const token = localStorage.getItem('fleetos_token');
      await enqueue('/api/v1/fuel-downtime/fuel-logs', 'POST', body, token ? { Authorization: `Bearer ${token}` } : {});
      router.push('/fuel');
    } finally {
      setLoading(false);
    }
  };

  const baseMinor = formData.amount_minor
    ? Math.round(parseInt(formData.amount_minor) * (parseFloat(formData.fx_rate) || 1))
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Log Fuel</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Cost (minor) *</label>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Odometer</label>
                <Input type="number" step="0.1" value={formData.odometer} onChange={e => setFormData({ ...formData, odometer: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Vendor</label>
                <Input value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} placeholder="Fuel station name" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Odometer Photo (optional)</label>
              <PhotoCapture
                onPhoto={setOdometerPhoto}
                label={odometerPhoto ? `✓ ${odometerPhoto.name}` : 'Capture Odometer Reading'}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea className="w-full border rounded-md p-2" rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
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
