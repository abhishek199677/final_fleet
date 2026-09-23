'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Truck, MapPin, Clock, CheckCircle, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { apiDelete } from '@/lib/api/mutations';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AlertTriangle } from 'lucide-react';
import {
  Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
} from '@/components/ui/empty';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  working: { label: 'Working', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
  service: { label: 'In Service', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  stopped: { label: 'Stopped', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
  transit: { label: 'In Transit', color: 'text-gray-700', bg: 'bg-blue-100', icon: Truck },
};

export default function OwnerMachines() {
  const router = useRouter();
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMachines = () => {
    setApiError(false);
    fetchList<Record<string, unknown>>('/api/v1/machines')
      .then(data => { setMachines(data); if (data.length === 0) setApiError(false); })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMachines(); }, []);

  const handleDelete = (id: string, name: string) => setDeleteTarget({ id, label: name });

  const confirmDeleteMachine = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v1/machines/${deleteTarget.id}`);
      setMachines((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const workingCount = machines.filter(m => m.status_flag === 'working').length;
  const serviceCount = machines.filter(m => m.status_flag === 'service').length;
  const stoppedCount = machines.filter(m => m.status_flag === 'stopped').length;

  return (
    <div className="space-y-6">
      {apiError && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">API server unavailable</p>
            <p className="text-sm opacity-80">Could not connect to the Fleet OS backend. Make sure the API server is running on port 3001. Data shown may be stale.</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadMachines} className="ml-auto shrink-0">Retry</Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Machines</h1>
          <p className="text-muted-foreground mt-1">Manage your heavy equipment fleet</p>
        </div>
        <Link href="/machines/new">
          <Button >
            <span className="mr-2">+</span> Add Machine
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{machines.length}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Fleet</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{workingCount}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Working</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{serviceCount}</p>
            </div>
            <p className="text-amber-100 text-xs mt-1">In Service</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4">
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
          <CardContent className="pt-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Truck /></EmptyMedia>
                <EmptyTitle>No machines yet</EmptyTitle>
                <EmptyDescription>Add your first machine to get started</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button>
                  <span className="mr-2">+</span> Add First Machine
                </Button>
              </EmptyContent>
            </Empty>
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
                    m.status_flag === 'working' ? 'bg-gradient-to-r from-gray-900 to-gray-800' :
                    m.status_flag === 'service' ? 'bg-gradient-to-r from-gray-800 to-gray-700' :
                    m.status_flag === 'stopped' ? 'bg-gradient-to-r from-gray-800 to-gray-700' :
                    'bg-gradient-to-r from-gray-950 to-gray-900'
                  }`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white">
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 group-hover:text-gray-600 transition-colors text-lg">
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
                        <span>{(m).site as string || 'No site assigned'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-400">
                        {m.status_flag === 'working' ? 'Active deployment' : 
                         m.status_flag === 'service' ? 'Under maintenance' :
                         m.status_flag === 'stopped' ? 'Out of service' : 'Moving to site'}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.preventDefault(); router.push(`/machines/${m.id}`); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); void handleDelete(m.id as string, m.code as string); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete machine"
        desc={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        isLoading={deleting}
        handleConfirm={() => { void confirmDeleteMachine(); }}
      />
    </div>
  );
}
