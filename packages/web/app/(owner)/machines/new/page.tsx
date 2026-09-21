'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';

const METER_TYPES = ['hours', 'km', 'cycles', 'metres', 'tonnes', 'trips'];

const MACHINE_TYPES = [
  { value: 'excavator', label: 'Excavator' },
  { value: 'dump_truck', label: 'Dumper' },
  { value: 'dozer', label: 'Dozer' },
  { value: 'wheel_loader', label: 'Wheel Loader' },
  { value: 'backhoe', label: 'Backhoe' },
  { value: 'crane', label: 'Crane' },
  { value: 'bulldozer', label: 'Bulldozer' },
  { value: 'grader', label: 'Grader' },
  { value: 'compactor', label: 'Compactor' },
  { value: 'roller', label: 'Roller' },
  { value: 'telehandler', label: 'Telehandler' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'motor_grader', label: 'Motor Grader' },
  { value: 'motor_scraper', label: 'Motor Scraper' },
  { value: 'pipelayer', label: 'Pipelayer' },
  { value: 'other', label: 'Other' },
];

const MAKES = [
  { value: 'Caterpillar', label: 'Caterpillar' },
  { value: 'Komatsu', label: 'Komatsu' },
  { value: 'Volvo', label: 'Volvo' },
  { value: 'Hitachi', label: 'Hitachi' },
  { value: 'Liebherr', label: 'Liebherr' },
  { value: 'John Deere', label: 'John Deere' },
  { value: 'Case', label: 'Case' },
  { value: 'JCB', label: 'JCB' },
  { value: 'XCMG', label: 'XCMG' },
  { value: 'Sany', label: 'Sany' },
  { value: 'Hyundai', label: 'Hyundai' },
  { value: 'Doosan', label: 'Doosan' },
  { value: 'Kobelco', label: 'Kobelco' },
  { value: 'Terex', label: 'Terex' },
  { value: 'Other', label: 'Other' },
];

const MODELS: Record<string, string[]> = {
  Caterpillar: ['320', '320F', '330', 'D6', 'D8', 'D10', '966', '980', '777', '785'],
  Komatsu: ['PC200', 'PC300', 'PC400', 'PC200-8', 'D65', 'D85', 'WA320', 'WA380', 'HD325'],
  Volvo: ['L120', 'L150', 'EC200', 'EC300', 'EC480', 'A25G', 'A30G', 'A40G'],
  Hitachi: ['ZX200', 'ZX300', 'ZX470', 'ZAXIS 200'],
  Liebherr: ['R 920', 'R 930', 'R 944', 'PR 734', 'T 264'],
  'John Deere': ['310', '410', '544', '644', '844'],
  Case: ['CX200', 'CX300', '2050M'],
  JCB: ['3CX', '4CX', 'JS200'],
  XCMG: ['XC200', 'XE200', 'GR215'],
  Sany: ['SY200', 'SY300', 'SY500'],
  Hyundai: ['HX200', 'HX300', 'HL760'],
  Doosan: ['DX200', 'DX300', 'DL200'],
  Kobelco: ['SK200', 'SK300', 'SK460'],
  Terex: ['TR100', 'TA300'],
};

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

  const availableModels = formData.make && formData.make !== 'Other'
    ? (MODELS[formData.make] ?? [])
    : [];

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
        alert('Machine added successfully');
        router.push('/machines');
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.detail || 'Failed to create machine');
    } catch {
      setError('Network error');
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
            {/* Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => set('code', e.target.value)}
                  placeholder="EXC-005"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  value={formData.type}
                  onChange={(e) => set('type', e.target.value)}
                  required
                >
                  <option value="">Select type...</option>
                  {MACHINE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Make & Model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Make</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  value={formData.make}
                  onChange={(e) => {
                    set('make', e.target.value);
                    set('model', '');
                  }}
                >
                  <option value="">Select make...</option>
                  {MAKES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  value={formData.model}
                  onChange={(e) => set('model', e.target.value)}
                  disabled={!formData.make}
                >
                  <option value="">{formData.make ? 'Select model...' : 'Select make first'}</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year & Chassis */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Year</label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => set('year', e.target.value)}
                  placeholder="2022"
                  min="1970"
                  max="2099"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Chassis No</label>
                <Input
                  value={formData.chassis_no}
                  onChange={(e) => set('chassis_no', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Meter Type & Label */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Meter Type *</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
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
                <Input
                  value={formData.meter_unit_label}
                  onChange={(e) => set('meter_unit_label', e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Add Machine'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
