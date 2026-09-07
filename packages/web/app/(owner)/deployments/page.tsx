'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';

interface DeploymentEntry {
  id: string;
  machine_id: string;
  site_id: string;
  start_date: string;
  end_date?: string;
  status: string;
  machines?: { code: string };
  sites?: { name: string };
}

export default function DeploymentsList() {
  const [deployments, setDeployments] = useState<DeploymentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchList<DeploymentEntry>('/api/v1/deployments').then(setDeployments).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deployments</h1>
        <Link href="/deployments/new">
          <Button>New Deployment</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading deployments...</p>
      ) : deployments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No deployments yet. Create one to assign a machine to a site.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {deployments.map((d) => (
            <Link key={d.id} href={`/deployments/${d.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{d.machines?.code ?? d.machine_id}</p>
                    <p className="text-sm text-muted-foreground">{d.sites?.name ?? d.site_id}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded ${d.status === 'active' ? 'bg-green-100 text-green-800' : d.status === 'on_hold_payment' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">Since {d.start_date}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
