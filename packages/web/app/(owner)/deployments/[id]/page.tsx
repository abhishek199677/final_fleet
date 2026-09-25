'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/api/auth-fetch';
import { apiPatch } from '@/lib/api/mutations';
import { fetchList } from '@/lib/api/fetch-list';

export default function DeploymentDetail() {
  const params = useParams();
  const router = useRouter();
  const [deployment, setDeployment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  // Editing state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    machine_id: '',
    site_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });

  useEffect(() => {
    if (!params.id) return;
    void fetchList<Record<string, unknown>>(`/api/v1/deployments`).then((list) => {
      const found = list.find((d) => d.id === params.id);
      setDeployment(found ?? null);

      // Populate form for editing
      if (found) {
        setForm({
          machine_id: String(found.machine_id ?? ''),
          site_id: String(found.site_id ?? ''),
          start_date: String(found.start_date ?? ''),
          end_date: String(found.end_date ?? ''),
          status: String(found.status ?? 'active'),
        });
      }
    }).finally(() => setLoading(false));
  }, [params.id]);

  const handleHold = async () => {
    if (!deployment) return;
    await authFetch(`/api/v1/deployments/${deployment.id as string}/hold`, { method: 'POST' });
    setDeployment({ ...deployment, status: 'on_hold_payment' });
  };

  const handleRelease = async () => {
    if (!deployment) return;
    await authFetch(`/api/v1/deployments/${deployment.id as string}/release`, { method: 'POST' });
    setDeployment({ ...deployment, status: 'active' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/v1/deployments/${params.id}`, {
        machine_id: form.machine_id || undefined,
        site_id: form.site_id || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        status: form.status,
      });
      setEditing(false);
      // Refresh data by refetching the deployment
      const res = await authFetch(`/api/v1/deployments/${params.id}`);
      if (res.ok) {
        const updatedDeployment = await res.json();
        setDeployment(updatedDeployment);
        // Also update the form with the refreshed data
        setForm({
          machine_id: updatedDeployment.machine_id ?? '',
          site_id: updatedDeployment.site_id ?? '',
          start_date: updatedDeployment.start_date ?? '',
          end_date: updatedDeployment.end_date ?? '',
          status: updatedDeployment.status ?? 'active',
        });
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!deployment) return <p>Deployment not found</p>;

  return (
    <>
      {editing ? (
        <div className="space-y-6">
          {/* Edit Form */}
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Machine ID</label>
                  <input
                    type="text"
                    value={form.machine_id}
                    onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site ID</label>
                  <input
                    type="text"
                    value={form.site_id}
                    onChange={(e) => setForm({ ...form, site_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold_payment">On Hold (Payment)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* View Mode - Original Content */}
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Deployment Detail</h1>
                <Button variant="outline" onClick={() => router.back()}>Back</Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Deployment Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Machine</span>
                    <span className="font-medium">{(deployment.machines as Record<string, unknown>)?.code as string ?? deployment.machine_id as string}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Site</span>
                    <span className="font-medium">{(deployment.sites as Record<string, unknown>)?.name as string ?? deployment.site_id as string}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{deployment.start_date as string}</span>
                  </div>
                  {Boolean(deployment.end_date) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date</span>
                      <span className="font-medium">{deployment.end_date as string}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`text-xs px-2 py-1 rounded ${deployment.status === 'active' ? 'bg-green-100 text-green-800' : deployment.status === 'on_hold_payment' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {(deployment.status as string).replace(/_/g, ' ')}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-4">
                {deployment.status === 'active' ? (
                  <Button variant="destructive" onClick={() => { void handleHold(); }}>Place on Hold</Button>
                ) : deployment.status === 'on_hold_payment' ? (
                  <Button onClick={() => { void handleRelease(); }}>Release Hold</Button>
                ) : null}
              </div>
            </div>
          )}
      </>
  );
}
