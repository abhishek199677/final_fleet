'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { User, Phone, Award, MapPin, Truck, Pencil, Trash2 } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { apiDelete, confirmDelete } from '@/lib/api/mutations';

interface OperatorEntry {
  id: string;
  name: string;
  phone?: string;
  license?: string;
  experience_years?: number;
  specialization?: string;
  is_active?: boolean;
  assigned_machine?: string | null;
  site?: string | null;
}

export default function OwnerOperators() {
  const router = useRouter();
  const [operators, setOperators] = useState<OperatorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList<OperatorEntry>('/api/v1/operators')
      .then((data) => {
        setOperators(data);
      })
      .catch(() => {
        setOperators([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!(confirmDelete(name))) return;
    try {
      await apiDelete(`/api/v1/operators/${id}`);
      setOperators((prev) => prev.filter((o) => o.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const uniqueOperators = useMemo(() => {
    const seen = new Set<string>();
    return operators.filter((o) => {
      const name = String(o.name ?? '');
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [operators]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operators</h1>
          <p className="text-muted-foreground mt-1">Manage your machine operators and assignments</p>
        </div>
        <Link href="/operators/new">
          <Button >
            <span className="mr-2">+</span> Add Operator
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
      ) : operators.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">👷</div>
            <p className="text-gray-500 text-lg mb-2">No operators yet</p>
            <p className="text-gray-400 text-sm">Add your first operator to get started</p>
            <Button className="mt-6">
              <span className="mr-2">+</span> Add First Operator
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uniqueOperators.map((o) => (
            <Card key={o.id} className={`hover:shadow-lg transition-all overflow-hidden ${!o.is_active ? 'opacity-75' : ''}`}>
              <div className={`h-1.5 ${o.is_active ? 'bg-gradient-to-r from-gray-900 to-gray-800' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                      o.is_active ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{o.name}</h3>
                      <p className="text-xs text-gray-500">{o.specialization ?? 'Operator'}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    o.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {o.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  {o.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{o.phone}</span>
                    </div>
                  )}
                  {o.license && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span>{o.license}</span>
                    </div>
                  )}
                  {o.experience_years && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-gray-400">⏱️</span>
                      <span>{o.experience_years} years experience</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  {o.assigned_machine ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">{o.assigned_machine}</span>
                      </div>
                      {o.site && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{o.site}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center">No assignment</p>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/operators/${o.id}`)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void handleDelete(o.id, o.name)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
