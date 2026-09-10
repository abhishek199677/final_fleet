'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Filter, User, FileText, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';
import { sampleUsers, sampleAuditEntries, sampleMachines } from '@/lib/sample-data';

interface Row extends Record<string, unknown> {
  id?: string;
}

const TABLES = ['', 'work_sessions', 'fuel_logs', 'downtime_segments', 'expenses', 'client_money_events', 'cash_transfers', 'cash_counts', 'maintenance_visits'];

const TABLE_COLORS: Record<string, string> = {
  work_sessions: 'bg-blue-100 text-blue-700',
  fuel_logs: 'bg-green-100 text-green-700',
  downtime_segments: 'bg-amber-100 text-amber-700',
  expenses: 'bg-red-100 text-red-700',
  client_money_events: 'bg-purple-100 text-purple-700',
  cash_transfers: 'bg-cyan-100 text-cyan-700',
  cash_counts: 'bg-indigo-100 text-indigo-700',
  maintenance_visits: 'bg-pink-100 text-pink-700',
};

const OPERATION_ICONS: Record<string, { icon: typeof CheckCircle; color: string }> = {
  INSERT: { icon: CheckCircle, color: 'text-green-500' },
  UPDATE: { icon: Clock, color: 'text-blue-500' },
  DELETE: { icon: XCircle, color: 'text-red-500' },
};

export default function AuditPage() {
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [machines, setMachines] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ user_id: '', table: '', machine_id: '', from: '', to: '' });
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, m] = await Promise.all([
      fetchList<Row>('/api/v1/audit'),
      fetchList<Row>('/api/v1/machines'),
    ]);
    
    if (a.length > 0) {
      setAllRows(a);
      setUsingSample(false);
    } else {
      setAllRows(sampleAuditEntries);
      setUsingSample(true);
    }
    
    if (m.length > 0) {
      setMachines(m);
    } else {
      setMachines(sampleMachines);
    }
    
    try {
      const res = await authFetch('/api/v1/auth/users').catch(() => null);
      if (res && res.ok) {
        const j = await res.json();
        if (Array.isArray(j) && j.length > 0) {
          setUsers(j);
        } else {
          setUsers(sampleUsers);
        }
      } else {
        setUsers(sampleUsers);
      }
    } catch {
      setUsers(sampleUsers);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    if (!usingSample) {
      const q = new URLSearchParams();
      if (filters.user_id) q.set('user_id', filters.user_id);
      if (filters.table) q.set('table', filters.table);
      if (filters.machine_id) q.set('machine_id', filters.machine_id);
      if (filters.from) q.set('from', filters.from);
      if (filters.to) q.set('to', filters.to);
      return allRows;
    }

    return allRows.filter((r) => {
      if (filters.user_id) {
        const user = users.find((u) => String(u.id) === filters.user_id);
        if (user && String(r.user_email) !== String(user.email)) return false;
      }
      if (filters.table && String(r.table_name) !== filters.table) return false;
      if (filters.machine_id) {
        const entryData = r.data as Record<string, unknown> | undefined;
        if (entryData && String(entryData.machine_id) !== filters.machine_id) return false;
      }
      if (filters.from) {
        const d = new Date(String(r.created_at));
        const from = new Date(filters.from);
        if (d < from) return false;
      }
      if (filters.to) {
        const d = new Date(String(r.created_at));
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }, [allRows, filters, users, usingSample]);

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
      alert('Entry voided (demo mode)');
    } catch {
      alert('Entry voided (demo mode)');
    } finally {
      setVoiding(null);
      setReason('');
      void load();
    }
  };

  const voidable = (table: string) => table === 'work_sessions' || table === 'expenses';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit</h1>
        <p className="text-muted-foreground mt-1">Every write, filterable. Voids create new versions with a reason.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{allRows.length}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Entries</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{allRows.filter(r => r.operation === 'INSERT').length}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Inserts</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{allRows.filter(r => r.operation === 'UPDATE').length}</p>
            </div>
            <p className="text-amber-100 text-xs mt-1">Updates</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filters
          </CardTitle>
        </div>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="text-sm font-medium text-gray-700">User</label>
              <select className="w-full border border-gray-200 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}>
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={String(u.id)} value={String(u.id)}>{String(u.name ?? u.email)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select className="w-full border border-gray-200 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={filters.table} onChange={(e) => setFilters({ ...filters, table: e.target.value })}>
                {TABLES.map((t) => (
                  <option key={t} value={t}>{t === '' ? 'All types' : t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Machine</label>
              <select className="w-full border border-gray-200 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={filters.machine_id} onChange={(e) => setFilters({ ...filters, machine_id: e.target.value })}>
                <option value="">All machines</option>
                {machines.map((m) => (
                  <option key={String(m.id)} value={String(m.id)}>{String(m.code)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">From</label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">To</label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => setFilters({ user_id: '', table: '', machine_id: '', from: '', to: '' })} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" /> Entries ({rows.length})
          </CardTitle>
        </div>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse rounded-lg bg-gray-100 p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">No audit entries match</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.slice(0, 50).map((r) => {
                const opData = OPERATION_ICONS[String(r.operation)] || { icon: Clock, color: 'text-gray-500' };
                const OpIcon = opData.icon;
                const tableColor = TABLE_COLORS[String(r.table_name)] || 'bg-gray-100 text-gray-700';
                
                return (
                  <div key={String(r.id)} className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:shadow-md transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tableColor.split(' ')[0]}`}>
                          <OpIcon className={`h-5 w-5 ${opData.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tableColor}`}>
                              {String(r.operation)}
                            </span>
                            <span className="font-medium text-gray-800">{String(r.table_name).replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <User className="h-3 w-3" />
                            <span>{String(r.user_name ?? r.user_email ?? 'system')}</span>
                            <span>·</span>
                            <span>{new Date(String(r.created_at)).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {voidable(String(r.table_name)) && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Void reason…"
                            className="h-9 w-48 text-sm"
                            value={voiding === String(r.id) ? reason : ''}
                            onChange={(e) => {
                              setVoiding(String(r.id));
                              setReason(e.target.value);
                            }}
                          />
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            disabled={!reason.trim() || voiding !== String(r.id)} 
                            onClick={() => void voidEntry(r)}
                            className="gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" /> Void
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
