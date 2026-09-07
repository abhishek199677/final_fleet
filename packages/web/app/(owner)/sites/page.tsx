'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';

interface SiteEntry {
  id: string;
  client_id: string;
  name: string;
  location?: string;
  start_date?: string;
  clients?: { name: string };
}

export default function SitesList() {
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchList<SiteEntry>('/api/v1/sites').then(setSites).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sites</h1>
        <Link href="/sites/new">
          <Button>New Site</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading sites...</p>
      ) : sites.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No sites yet. Create one to start deploying machines.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sites.map((s) => (
            <Link key={s.id} href={`/sites/${s.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.clients?.name ?? s.client_id}</p>
                  </div>
                  <div className="text-right">
                    {s.location && <p className="text-sm text-muted-foreground">{s.location}</p>}
                    {s.start_date && <p className="text-xs text-muted-foreground">Since {s.start_date}</p>}
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
