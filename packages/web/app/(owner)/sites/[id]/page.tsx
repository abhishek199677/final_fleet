'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';

export default function SiteDetail() {
  const params = useParams();
  const router = useRouter();
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [deployments, setDeployments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/sites'),
      fetchList<Record<string, unknown>>('/api/v1/deployments'),
    ]).then(([sites, deploys]) => {
      const found = sites.find((s) => s.id === params.id);
      setSite(found ?? null);
      setDeployments(deploys.filter((d) => d.site_id === params.id));
    }).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-muted-foreground">Loading site...</p>;
  if (!site) return <p className="text-muted-foreground">Site not found.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{site.name as string}</h1>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Site Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">{(site.clients as Record<string, unknown>)?.name as string ?? site.client_id as string}</span>
          </div>
          {Boolean(site.location) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{site.location as string}</span>
            </div>
          )}
          {Boolean(site.start_date) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date</span>
              <span className="font-medium">{site.start_date as string}</span>
            </div>
          )}
          {Boolean(site.end_date) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date</span>
              <span className="font-medium">{site.end_date as string}</span>
            </div>
          )}
        </CardContent>
      </Card>
      {deployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deployments at this Site ({deployments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deployments.map((d) => (
                <div key={d.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="font-medium">{(d.machines as Record<string, unknown>)?.code as string ?? d.machine_id as string}</span>
                  <span className={`text-xs px-2 py-1 rounded ${d.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {(d.status as string).replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
