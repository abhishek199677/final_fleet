'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

function NewDeploymentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSiteId = searchParams.get('site_id') ?? '';
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [sites, setSites] = useState<Record<string, unknown>[]>([]);
  const [deployedMachineIds, setDeployedMachineIds] = useState<Set<string>>(new Set());
  const [deployedSiteByMachine, setDeployedSiteByMachine] = useState<Map<string, string>>(new Map());
  const [formData, setFormData] = useState({
    machine_id: '',
    client_id: '',
    site_id: preselectedSiteId,
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
      fetchList<Record<string, unknown>>('/api/v1/deployments'),
    ]).then(([m, c, s, d]) => {
      setMachines(m);
      setClients(c);
      setSites(s);
      // Mark machines that already have an active deployment so the user
      // can't pick them (prevents the unique-constraint 500).
      const siteNameById = new Map(s.map((site) => [String(site.id), String(site.name ?? 'Unknown site')]));
      const activeIds = new Set<string>();
      const siteByMachine = new Map<string, string>();
      for (const dep of d) {
        if (String(dep.status ?? 'active') === 'active') {
          activeIds.add(String(dep.machine_id));
          siteByMachine.set(String(dep.machine_id), siteNameById.get(String(dep.site_id)) ?? 'another site');
        }
      }
      setDeployedMachineIds(activeIds);
      setDeployedSiteByMachine(siteByMachine);
      // If site is pre-selected (from Deploy Machine button), auto-select client
      if (preselectedSiteId) {
        const preselectedSite = s.find((site) => site.id === preselectedSiteId);
        if (preselectedSite?.client_id) {
          setFormData((f) => ({ ...f, client_id: String(preselectedSite.client_id), site_id: preselectedSiteId }));
        }
      }
    }).finally(() => setFetching(false));
  }, []);

  // Deduplicate clients by name (keep first occurrence)
  const uniqueClients = useMemo(() => {
    const seen = new Set<string>();
    return clients.filter((c) => {
      const name = String(c.name ?? '');
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [clients]);

  // Build a lookup: client_id → client name
  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(String(c.id), String(c.name ?? '')));
    return map;
  }, [clients]);

  // Sort sites: selected client's sites first, then all others
  const sortedSites = useMemo(() => {
    if (!formData.client_id) return sites;
    const selected = sites.filter((s) => String(s.client_id) === String(formData.client_id));
    const others = sites.filter((s) => String(s.client_id) !== String(formData.client_id));
    return [...selected, ...others];
  }, [sites, formData.client_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deployedMachineIds.has(formData.machine_id)) {
      alert(`This machine is already deployed at ${deployedSiteByMachine.get(formData.machine_id)}. End that deployment first.`);
      return;
    }
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
          await authFetch('/api/v1/billing/rate-cards', {
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
        alert('Deployment created successfully');
        router.push('/deployments');
        return;
      }
      const body = await res.json().catch(() => null);
      alert(body?.detail || 'Failed to create deployment');
    } catch {
      alert('Network error');
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                value={formData.machine_id}
                onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                required
              >
                <option value="">Select machine...</option>
                {machines.map((m: Record<string, unknown>) => {
                  const mid = String(m.id);
                  const deployed = deployedMachineIds.has(mid);
                  return (
                    <option key={mid} value={mid} disabled={deployed}>
                      {m.code as string} — {m.type as string}{deployed ? ` (deployed at ${deployedSiteByMachine.get(mid)})` : ''}
                    </option>
                  );
                })}
              </select>
              {formData.machine_id && deployedMachineIds.has(formData.machine_id) && (
                <p className="mt-1 text-xs text-amber-700">
                  This machine is already deployed at {deployedSiteByMachine.get(formData.machine_id)}. End that deployment first.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Client *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value, site_id: '' })}
                required
              >
                <option value="">Select client...</option>
                {uniqueClients.map((c: Record<string, unknown>) => (
                  <option key={c.id as string} value={c.id as string}>
                    {c.name as string}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Site *</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                required
              >
                <option value="">Select site...</option>
                {sortedSites.map((s: Record<string, unknown>) => {
                  const siteClient = clientNameById.get(String(s.client_id)) ?? '';
                  const isSelectedClient = formData.client_id && String(s.client_id) === String(formData.client_id);
                  return (
                    <option key={s.id as string} value={s.id as string}>
                      {s.name as string}{!isSelectedClient && siteClient ? ` (${siteClient})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Start Date *</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-2">Rate Card (optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Strategy</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    value={formData.rate_strategy}
                    onChange={(e) => setFormData({ ...formData, rate_strategy: e.target.value as 'hourly' | 'daily' | 'monthly' })}
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
                    onChange={(e) => setFormData({ ...formData, rate_minor: e.target.value })}
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

export default function NewDeployment() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <NewDeploymentInner />
    </Suspense>
  );
}
