'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

interface Entry {
  id: string;
  kind: string;
  text: string;
  t: number;
}

function ts(v: unknown): number {
  const t = new Date(String(v ?? '')).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function myId(): string | null {
  try {
    const token = localStorage.getItem('fleetos_token');
    if (!token) return null;
    return String(JSON.parse(atob(token.split('.')[1])).sub ?? '');
  } catch {
    return null;
  }
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = myId();
    if (!id) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetchList<Row>('/api/v1/work-sessions'),
      fetchList<Row>('/api/v1/fuel-downtime/fuel-logs'),
      fetchList<Row>('/api/v1/fuel-downtime/downtime'),
      fetchList<Row>('/api/v1/expenses'),
      fetchList<Row>('/api/v1/client-money/events'),
      fetchList<Row>('/api/v1/machines'),
    ]).then(([s, f, d, e, c, m]) => {
      const code = new Map(m.map((x) => [String(x.id), String(x.code ?? '')]));
      const mine = (rows: Row[]) => rows.filter((r) => String(r.created_by ?? '') === id);
      const all: Entry[] = [
        ...mine(s).map((x) => ({ id: String(x.id), kind: 'Session', text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${new Date(String(x.start_at)).toLocaleString()}`, t: ts(x.start_at ?? x.created_at) })),
        ...mine(f).map((x) => ({ id: String(x.id), kind: 'Fuel', text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${x.litres} L`, t: ts(x.created_at) })),
        ...mine(d).map((x) => ({ id: String(x.id), kind: 'Downtime', text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${String(x.reason_code ?? '').replace(/_/g, ' ')}`, t: ts(x.started_at ?? x.created_at) })),
        ...mine(e).map((x) => ({ id: String(x.id), kind: 'Expense', text: `${String(x.category_name ?? x.category ?? 'Expense')}`, t: ts(x.date ?? x.created_at) })),
        ...mine(c).map((x) => ({ id: String(x.id), kind: 'Receipt', text: `${String(x.event_type)}`, t: ts(x.event_date ?? x.created_at) })),
      ];
      setEntries(all.sort((a, b) => b.t - a.t).slice(0, 50));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My History</h1>
        <p className="text-muted-foreground">Everything you logged — amounts stay yours alone.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground">
              Nothing yet. <Link href="/work-session/new" className="text-primary hover:underline">Start a session</Link>.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((x) => (
                <div key={`${x.kind}-${x.id}`} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                  <span><span className="font-medium">{x.kind}</span> · {x.text}</span>
                  <span className="text-muted-foreground">{new Date(x.t).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
