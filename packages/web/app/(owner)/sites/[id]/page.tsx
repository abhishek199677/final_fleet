'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';

export default function SiteDetail() {
  const params = useParams();
  const router = useRouter();
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [deployments, setDeployments] = useState<Record<string, unknown>[]>([]);
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/sites'),
      fetchList<Record<string, unknown>>('/api/v1/deployments'),
      fetchList<Record<string, unknown>>('/api/v1/machines'),
    ]).then(([sites, deploys, machs]) => {
      const found = sites.find((s) => s.id === params.id);
      if (found) {
        setSite(found);
        setDeployments(deploys.filter((d) => d.site_id === params.id));
        setMachines(machs);
      }
    }).finally(() => setLoading(false));
  }, [params.id]);

  // Build machine lookup for displaying codes
  const machineById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    machines.forEach((m) => map.set(String(m.id), m));
    return map;
  }, [machines]);

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
          <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">📍</span> Site Information
            </CardTitle>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Client</span>
              <span className="font-semibold text-gray-800">
                {site.client_name as string ?? 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Location</span>
              <span className="font-medium text-gray-800">{site.location as string ?? 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
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
              <span className="text-gray-600">End Date</span>
              <span className="font-medium text-gray-800">{site.end_date as string ?? 'N/A'}</span>
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
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">🚜</span> Deployed Machines ({deployments.length})
            </CardTitle>
          </div>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deployments.map((d) => {
                const mach = machineById.get(String(d.machine_id));
                const machineCode = (d.machine_code as string) ?? (mach?.code as string) ?? 'Unknown';
                const machineType = (mach?.type as string) ?? '';
                return (
                  <div key={d.id as string} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-gray-700 font-bold">🔧</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{machineCode}</p>
                        <p className="text-xs text-gray-500">{machineType}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {(d.status as string).replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-8 text-center">
          {deployments.length === 0 && (
            <div className="mb-4">
              <div className="text-6xl mb-4">🏗️</div>
              <p className="text-gray-500 text-lg">No machines deployed at this site yet.</p>
            </div>
          )}
          <Link href={`/deployments/new?site_id=${params.id}`}>
            <Button className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-violet-600 hover:to-purple-600">
              <span className="mr-2">+</span> Deploy Machine
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
