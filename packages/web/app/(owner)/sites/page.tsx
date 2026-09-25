'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Briefcase, Pencil, Trash2 } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { apiDelete } from '@/lib/api/mutations';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,
} from '@/components/ui/empty';

interface SiteEntry {
  id: string;
  client_id: string;
  name: string;
  address?: string;
  location?: string;
  start_date?: string;
  estimated_end_date?: string;
  client_name?: string;
  status?: string;
  machine_count?: number;
  clients?: { name: string };
}

export default function SitesList() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchList<SiteEntry>('/api/v1/sites').then((data) => {
      setSites(data);
    }).catch(() => {
      setSites([]);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string, name: string) => setDeleteTarget({ id, label: name });

  const confirmDeleteSite = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v1/sites/${deleteTarget.id}`);
      setSites((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const uniqueSites = useMemo(() => {
    const seen = new Set<string>();
    return sites.filter((s) => {
      const name = String(s.name ?? '');
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [sites]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sites</h1>
          <p className="text-muted-foreground mt-1">Manage your project locations and deployments</p>
        </div>
        <Link href="/sites/new">
          <Button >
            <span className="mr-2">+</span> New Site
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : uniqueSites.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><MapPin /></EmptyMedia>
                <EmptyTitle>No sites yet</EmptyTitle>
                <EmptyDescription>Create your first site to start deploying machines</EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="mt-6">
                <p className="text-sm text-gray-500">
                  Use the "+ New Site" button above to get started
                </p>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {uniqueSites.map((s) => (
            <Link key={s.id} href={`/sites/${s.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden">
                <div className={`h-2 ${
                  s.status === 'active' ? 'bg-gradient-to-r from-gray-900 to-gray-800' :
                  s.status === 'planning' ? 'bg-gradient-to-r from-gray-950 to-gray-900' :
                  'bg-gradient-to-r from-gray-400 to-gray-500'
                }`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-gray-600 transition-colors">
                        {s.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {s.client_name ?? s.clients?.name ?? 'Unknown Client'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      s.status === 'active' ? 'bg-green-100 text-green-700' :
                      s.status === 'planning' ? 'bg-gray-100 text-gray-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{s.address ?? s.location ?? 'No address'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{s.start_date ?? 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(s.machine_count ?? 0, 3))].map((_, i) => (
                          <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      {(s.machine_count ?? 0) > 3 && (
                        <span className="text-xs text-gray-500">+{(s.machine_count ?? 0) - 3} more</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.preventDefault(); router.push(`/sites/${s.id}`); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); void handleDelete(s.id, s.name); }}
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
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete site"
        desc={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        isLoading={deleting}
        handleConfirm={() => { void confirmDeleteSite(); }}
      />
    </div>
  );
}
