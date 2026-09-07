'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

export default function DeploymentDetail() {
  const params = useParams();
  const router = useRouter();
  const [deployment, setDeployment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchList<Record<string, unknown>>(`/api/v1/deployments`).then((list) => {
      const found = list.find((d) => d.id === params.id);
      setDeployment(found ?? null);
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

  if (loading) return <p className="text-muted-foreground">Loading deployment...</p>;
  if (!deployment) return <p className="text-muted-foreground">Deployment not found.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
          {deployment.end_date && (
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
  );
}
