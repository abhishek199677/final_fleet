'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

const TABLES = ['', 'work_sessions', 'fuel_logs', 'downtime_segments', 'expenses', 'client_money_events', 'cash_transfers', 'cash_counts', 'maintenance_visits'];

export default function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [machines, setMachines] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ user_id: '', table: '', machine_id: '', from: '', to: '' });
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filters.user_id) q.set('user_id', filters.user_id);
    if (filters.table) q.set('table', filters.table);
    if (filters.machine_id) q.set('machine_id', filters.machine_id);
    if (filters.from) q.set('from', filters.from);
    if (filters.to) q.set('to', filters.to);
    const [a, m] = await Promise.all([
      fetchList<Row>(`/api/v1/audit?${q.toString()}`),
      fetchList<Row>('/api/v1/machines'),
    ]);
    setRows(a);
    setMachines(m);
    try {
      const res = await authFetch('/api/v1/auth/users').catch(() => null);
      if (res && res.ok) {
        const j = await res.json();
        if (Array.isArray(j)) setUsers(j);
      }
    } catch {
      /* users endpoint optional */
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const voidEntry = async (row: Row) => {
    if (!reason.trim()) return;
    setVoiding(String(row.id));
    try {
      const table = String(row.table_name);
      const recordId = String(row.record_id);
      if (table === 'work_sessions') {
        await authFetch(`/api/v1/work-sessions/${recordId}/corrections`, {
          method: 'POST',
          body: JSON.stringify({ billable: false, notes: `VOID: ${reason.trim()}`, client_uuid: crypto.randomUUID() }),
        });
      } else if (table === 'expenses') {
        await authFetch(`/api/v1/expenses/${recordId}/corrections`, {
          method: 'POST',
          body: JSON.stringify({ note: `VOID: ${reason.trim()}`, client_uuid: crypto.randomUUID() }),
        });
      }
    } finally {
      setVoiding(null);
      setReason('');
      load();
    }
  };

  const voidable = (table: string) => table === 'work_sessions' || table === 'expenses';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit</h1>
        <p className="text-muted-foreground">Every write, filterable. Voids create new versions with a reason.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="text-sm font-medium">User</label>
              <select className="w-full border rounded-md p-2" value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}>
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={String(u.id)} value={String(u.id)}>{String(u.name ?? u.email)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select className="w-full border rounded-md p-2" value={filters.table} onChange={(e) => setFilters({ ...filters, table: e.target.value })}>
                {TABLES.map((t) => (
                  <option key={t} value={t}>{t === '' ? 'All types' : t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Machine</label>
              <select className="w-full border rounded-md p-2" value={filters.machine_id} onChange={(e) => setFilters({ ...filters, machine_id: e.target.value })}>
                <option value="">All machines</option>
                {machines.map((m) => (
                  <option key={String(m.id)} value={String(m.id)}>{String(m.code)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button onClick={load}>Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">No audit entries match.</p>
          ) : (
            <div className="space-y-2">
              {rows.slice(0, 50).map((r) => (
                <div key={String(r.id)} className="rounded border p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{String(r.operation)} · {String(r.table_name)}</span>
                    <span className="text-muted-foreground">
                      {String(r.user_name ?? r.user_email ?? 'system')} · {new Date(String(r.created_at)).toLocaleString()}
                    </span>
                  </div>
                  {voidable(String(r.table_name)) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        placeholder="Void reason…"
                        className="h-8 max-w-xs"
                        value={voiding === String(r.id) ? reason : ''}
                        onChange={(e) => {
                          setVoiding(String(r.id));
                          setReason(e.target.value);
                        }}
                      />
                      <Button size="sm" variant="destructive" disabled={!reason.trim() || voiding !== String(r.id)} onClick={() => voidEntry(r)}>
                        Void with reason
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
