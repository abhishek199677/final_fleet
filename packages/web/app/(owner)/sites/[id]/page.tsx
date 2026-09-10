'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';
import { sampleSites, sampleMachines } from '@/lib/sample-data';

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
      if (found) {
        setSite(found);
        setDeployments(deploys.filter((d) => d.site_id === params.id));
      } else {
        const sampleSite = sampleSites.find((s) => s.id === params.id);
        if (sampleSite) {
          setSite(sampleSite as Record<string, unknown>);
          const siteMachines = sampleMachines.filter((m) => m.site === sampleSite.name?.split(' ')[0]);
          setDeployments(siteMachines.map((m) => ({
            id: `dep-${m.id}`,
            machine_id: m.id,
            site_id: m.site,
            status: 'active',
            machines: { code: m.code }
          })));
        }
      }
    }).catch(() => {
      const sampleSite = sampleSites.find((s) => s.id === params.id);
      if (sampleSite) {
        setSite(sampleSite as Record<string, unknown>);
        const siteMachines = sampleMachines.filter((m) => m.site === sampleSite.name?.split(' ')[0]);
        setDeployments(siteMachines.map((m) => ({
          id: `dep-${m.id}`,
          machine_id: m.id,
          site_id: m.site,
          status: 'active',
          machines: { code: m.code }
        })));
      }
    }).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-muted-foreground">Loading site...</p>;
  if (!site) return <p className="text-muted-foreground">Site not found.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{site.name as string}</h1>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">📍</span> Site Information
            </CardTitle>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Client</span>
              <span className="font-semibold text-gray-800">{site.client_name as string ?? (site.clients as Record<string, unknown>)?.name as string ?? site.client_id as string}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Location</span>
              <span className="font-medium text-gray-800">{site.address as string ?? site.location as string ?? 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                site.status === 'active' ? 'bg-green-100 text-green-700' :
                site.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {site.status as string}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">📅</span> Timeline
            </CardTitle>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Start Date</span>
              <span className="font-medium text-gray-800">{site.start_date as string ?? 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Est. End Date</span>
              <span className="font-medium text-gray-800">{site.estimated_end_date as string ?? site.end_date as string ?? 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Machines Deployed</span>
              <span className="text-2xl font-bold text-emerald-600">{deployments.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {deployments.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">🚜</span> Deployed Machines ({deployments.length})
            </CardTitle>
          </div>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deployments.map((d) => (
                <div key={d.id as string} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">🔧</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{(d.machines as Record<string, unknown>)?.code as string ?? d.machine_id as string}</p>
                      <p className="text-xs text-gray-500">ID: {d.machine_id as string}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {(d.status as string).replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {deployments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🏗️</div>
            <p className="text-gray-500 text-lg">No machines deployed at this site yet.</p>
            <Button className="mt-4">Deploy Machine</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
