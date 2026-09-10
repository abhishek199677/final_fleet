'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Truck, MapPin, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { sampleMachines } from '@/lib/sample-data';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  working: { label: 'Working', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
  service: { label: 'In Service', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  stopped: { label: 'Stopped', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
  transit: { label: 'In Transit', color: 'text-blue-700', bg: 'bg-blue-100', icon: Truck },
};

export default function OwnerMachines() {
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/machines')
      .then(data => {
        if (data.length > 0) {
          setMachines(data);
        } else {
          setMachines(sampleMachines);
        }
      })
      .catch(() => setMachines(sampleMachines))
      .finally(() => setLoading(false));
  }, []);

  const workingCount = machines.filter(m => m.status_flag === 'working').length;
  const serviceCount = machines.filter(m => m.status_flag === 'service').length;
  const stoppedCount = machines.filter(m => m.status_flag === 'stopped').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Machines</h1>
          <p className="text-muted-foreground mt-1">Manage your heavy equipment fleet</p>
        </div>
        <Link href="/machines/new">
          <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
            <span className="mr-2">+</span> Add Machine
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{machines.length}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Fleet</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{workingCount}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Working</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{serviceCount}</p>
            </div>
            <p className="text-amber-100 text-xs mt-1">In Service</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-500 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{stoppedCount}</p>
            </div>
            <p className="text-red-100 text-xs mt-1">Stopped</p>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : machines.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">🚜</div>
            <p className="text-gray-500 text-lg mb-2">No machines yet</p>
            <p className="text-gray-400 text-sm">Add your first machine to get started</p>
            <Button className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500">
              <span className="mr-2">+</span> Add First Machine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {machines.map((m) => {
            const status = STATUS_CONFIG[String(m.status_flag)] || STATUS_CONFIG.working;
            const StatusIcon = status.icon;
            
            return (
              <Link key={m.id as string} href={`/machines/${m.id}`}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden h-full">
                  <div className={`h-1.5 ${
                    m.status_flag === 'working' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    m.status_flag === 'service' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    m.status_flag === 'stopped' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                    'bg-gradient-to-r from-blue-500 to-cyan-500'
                  }`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white">
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors text-lg">
                            {m.code as string}
                          </h3>
                          <p className="text-xs text-gray-500">{m.type as string}</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{(m as Record<string, unknown>).site as string || 'No site assigned'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-400">
                        {m.status_flag === 'working' ? 'Active deployment' : 
                         m.status_flag === 'service' ? 'Under maintenance' :
                         m.status_flag === 'stopped' ? 'Out of service' : 'Moving to site'}
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
