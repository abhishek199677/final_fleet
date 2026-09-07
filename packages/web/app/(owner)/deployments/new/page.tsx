'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

export default function NewDeployment() {
  const router = useRouter();
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [sites, setSites] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    machine_id: '',
    client_id: '',
    site_id: '',
    start_date: new Date().toISOString().split('T')[0],
    rate_strategy: 'daily' as 'hourly' | 'daily' | 'monthly',
    rate_minor: '',
    currency: 'INR',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/machines'),
      fetchList<Record<string, unknown>>('/api/v1/clients'),
      fetchList<Record<string, unknown>>('/api/v1/sites'),
    ]).then(([m, c, s]) => {
      setMachines(m);
      setClients(c);
      setSites(s);
    }).finally(() => setFetching(false));
  }, []);

  // Filter sites by selected client
  const filteredSites = formData.client_id
    ? sites.filter(s => s.client_id === formData.client_id)
    : sites;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/deployments', {
        method: 'POST',
        body: JSON.stringify({
          machine_id: formData.machine_id,
          site_id: formData.site_id,
          start_date: formData.start_date,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        const deployment = await res.json();
        // Create rate card
        if (formData.rate_minor) {
          await authFetch('/api/v1/billing-engine/rate-cards', {
            method: 'POST',
            body: JSON.stringify({
              deployment_id: deployment.id,
              effective_from: formData.start_date,
              strategy: formData.rate_strategy,
              rate_minor: parseInt(formData.rate_minor),
              currency: formData.currency,
            }),
          });
        }
        router.push('/machines');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">New Deployment</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                  <option key={m.id as string} value={m.id as string}>
                    {m.code as string} — {m.type as string}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Client *</label>
              <select
                className="w-full border rounded-md p-2"
                value={formData.client_id}
                onChange={e => setFormData({ ...formData, client_id: e.target.value, site_id: '' })}
                required
              >
                <option value="">Select client...</option>
                {clients.map((c: Record<string, unknown>) => (
                  <option key={c.id as string} value={c.id as string}>
                    {c.name as string}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Site *</label>
              <select
                className="w-full border rounded-md p-2"
                value={formData.site_id}
                onChange={e => setFormData({ ...formData, site_id: e.target.value })}
                required
                disabled={!formData.client_id}
              >
                <option value="">Select site...</option>
                {filteredSites.map((s: Record<string, unknown>) => (
                  <option key={s.id as string} value={s.id as string}>
                    {s.name as string}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Start Date *</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-2">Rate Card (optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Strategy</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={formData.rate_strategy}
                    onChange={e => setFormData({ ...formData, rate_strategy: e.target.value as 'hourly' | 'daily' | 'monthly' })}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily Fixed</option>
                    <option value="monthly">Monthly Hire</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Rate (minor units)</label>
                  <Input
                    type="number"
                    value={formData.rate_minor}
                    onChange={e => setFormData({ ...formData, rate_minor: e.target.value })}
                    placeholder="e.g., 50000 = ₹500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Deployment'}
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
