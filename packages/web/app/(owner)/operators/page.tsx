'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fetchList } from '@/lib/api/fetch-list';

export default function OwnerOperators() {
  const [operators, setOperators] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/operators')
      .then(setOperators)
      .catch(() => setOperators([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Operators</h1>
        <Link href="/operators/new">
          <Button>Add Operator</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : operators.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No operators yet. Add your first operator to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {operators.map((o: Record<string, unknown>) => (
                <div key={o.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <span className="font-medium">{o.name as string}</span>
                    {o.phone ? <span className="text-sm text-muted-foreground ml-2">{o.phone as string}</span> : null}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${o.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {o.is_active !== false ? 'Active' : 'Inactive'}
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
