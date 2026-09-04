'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fetchList } from '@/lib/api/fetch-list';

export default function OwnerMachines() {
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/machines')
      .then(setMachines)
      .catch(() => setMachines([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Machines</h1>
        <Link href="/machines/new">
          <Button>Add Machine</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : machines.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No machines yet. Add your first machine to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {machines.map((m: Record<string, unknown>) => (
            <Link key={m.id as string} href={`/machines/${m.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{m.code as string}</span>
                    <span className="text-sm font-normal text-muted-foreground">{m.status_flag as string}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{m.type as string} — {m.make as string} {m.model as string}</p>
                  <p className="text-sm text-muted-foreground">Meter: {String(m.current_meter)} {m.meter_unit_label as string}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
