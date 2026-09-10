'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { sampleDeployments } from '@/lib/sample-data';

interface DeploymentEntry {
  id: string;
  machine_id: string;
  site_id: string;
  site_name?: string;
  machine_code?: string;
  machine_type?: string;
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
    void fetchList<DeploymentEntry>('/api/v1/deployments').then((data) => {
      setDeployments(data.length > 0 ? data : sampleDeployments);
    }).catch(() => {
      setDeployments(sampleDeployments);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployments</h1>
          <p className="text-muted-foreground mt-1">Track machine assignments across all sites</p>
        </div>
        <Link href="/deployments/new">
          <Button className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600">
            <span className="mr-2">+</span> New Deployment
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : deployments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">🚜</div>
            <p className="text-gray-500 text-lg mb-2">No deployments yet</p>
            <p className="text-gray-400 text-sm">Create one to assign a machine to a site</p>
            <Button className="mt-6 bg-gradient-to-r from-violet-500 to-purple-500">
              <span className="mr-2">+</span> Create First Deployment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deployments.map((d) => (
            <Link key={d.id} href={`/deployments/${d.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden h-full">
                <div className={`h-1.5 ${
                  d.status === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  d.status === 'pending' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  d.status === 'on_hold_payment' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                  'bg-gradient-to-r from-gray-400 to-gray-500'
                }`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                        <Truck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-violet-600 transition-colors">
                          {d.machine_code ?? d.machines?.code ?? d.machine_id}
                        </h3>
                        <p className="text-xs text-gray-500">{d.machine_type ?? 'Machine'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' :
                      d.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      d.status === 'on_hold_payment' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{d.site_name ?? d.sites?.name ?? d.site_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Since {d.start_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-400">
                      {d.end_date ? `Until ${d.end_date}` : 'Ongoing'}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
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
