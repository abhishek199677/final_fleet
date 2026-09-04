'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';

const METER_TYPES = ['hours', 'km', 'cycles', 'metres', 'tonnes', 'trips'];

export default function NewMachine() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    code: '',
    type: '',
    make: '',
    model: '',
    year: '',
    chassis_no: '',
    primary_meter_type: 'hours',
    meter_unit_label: 'hours',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setFormData((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/v1/machines', {
        method: 'POST',
        body: JSON.stringify({
          code: formData.code,
          type: formData.type,
          make: formData.make || undefined,
          model: formData.model || undefined,
          year: formData.year ? parseInt(formData.year) : undefined,
          chassis_no: formData.chassis_no || undefined,
          primary_meter_type: formData.primary_meter_type,
          meter_unit_label: formData.meter_unit_label || formData.primary_meter_type,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        router.push('/machines');
      } else {
        const j = await res.json().catch(() => null);
        setError((j?.detail as string) || 'Failed to create machine');
      }
    } catch {
      setError('API server unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Add Machine</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code *</label>
                <Input value={formData.code} onChange={(e) => set('code', e.target.value)} placeholder="EXC-003" required />
              </div>
              <div>
                <label className="text-sm font-medium">Type *</label>
                <Input value={formData.type} onChange={(e) => set('type', e.target.value)} placeholder="excavator" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Make</label>
                <Input value={formData.make} onChange={(e) => set('make', e.target.value)} placeholder="Caterpillar" />
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Input value={formData.model} onChange={(e) => set('model', e.target.value)} placeholder="320" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Year</label>
                <Input type="number" value={formData.year} onChange={(e) => set('year', e.target.value)} placeholder="2022" />
              </div>
              <div>
                <label className="text-sm font-medium">Chassis No</label>
                <Input value={formData.chassis_no} onChange={(e) => set('chassis_no', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Meter Type *</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={formData.primary_meter_type}
                  onChange={(e) => {
                    set('primary_meter_type', e.target.value);
                    set('meter_unit_label', e.target.value);
                  }}
                  required
                >
                  {METER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Meter Unit Label *</label>
                <Input value={formData.meter_unit_label} onChange={(e) => set('meter_unit_label', e.target.value)} required />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Machine'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
