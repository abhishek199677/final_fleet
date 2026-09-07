'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

export default function NewSite() {
  const router = useRouter();
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    location: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/clients')
      .then(setClients)
      .finally(() => setFetching(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/sites', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) router.push('/clients');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">New Site</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Client *</label>
              <select
                className="w-full border rounded-md p-2"
                value={formData.client_id}
                onChange={e => setFormData({ ...formData, client_id: e.target.value })}
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
              <label className="text-sm font-medium">Site Name *</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Yard, Project Alpha"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Nairobi, Kenya"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Site'}
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
