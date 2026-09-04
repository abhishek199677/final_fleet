'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Row[]>([]);

  const load = () => fetchList<Row>('/api/admin/support/tickets').then(setTickets).catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    await authFetch(`/api/admin/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).catch(() => undefined);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">Tenant issues — update status as they are handled. Requires platform sign-in.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-muted-foreground">No tickets yet.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={String(t.id)} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{String(t.subject)}</span>
                    <span className="text-muted-foreground">{String(t.tenant_name ?? '')} · {new Date(String(t.created_at)).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{String(t.description ?? '')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={String(t.status) === s ? 'default' : 'outline'}
                        onClick={() => setStatus(String(t.id), s)}
                      >
                        {s.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
