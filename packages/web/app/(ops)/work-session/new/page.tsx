'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewWorkSession() {
  const router = useRouter();
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [operators, setOperators] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    machine_id: '',
    operator_id: '',
    start_meter: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/v1/machines').then(r => r.json()),
      fetch('/v1/operators').then(r => r.json()),
    ]).then(([m, o]) => {
      setMachines(m || []);
      setOperators(o || []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/v1/work-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          start_meter: parseFloat(formData.start_meter),
          start_at: new Date().toISOString(),
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) router.push('/work-session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Start Work Session</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Machine *</label>
              <select
                className="w-full border rounded-md p-2"
                value={formData.machine_id}
                onChange={e => setFormData({ ...formData, machine_id: e.target.value })}
                required
              >
                <option value="">Select machine...</option>
                {machines.map((m: Record<string, unknown>) => (
                  <option key={m.id as string} value={m.id as string}>{m.code as string} — {m.type as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Operator *</label>
              <select
                className="w-full border rounded-md p-2"
                value={formData.operator_id}
                onChange={e => setFormData({ ...formData, operator_id: e.target.value })}
                required
              >
                <option value="">Select operator...</option>
                {operators.map((o: Record<string, unknown>) => (
                  <option key={o.id as string} value={o.id as string}>{o.name as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Start Meter *</label>
              <Input
                type="number"
                step="0.1"
                value={formData.start_meter}
                onChange={e => setFormData({ ...formData, start_meter: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full border rounded-md p-2"
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? 'Starting...' : 'Start Session'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
