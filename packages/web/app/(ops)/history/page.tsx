'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchListStrict } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { ApiErrorBanner } from '@/components/api-error-banner';
import { RecordActions } from '@/components/records/record-actions';
import { History as HistoryIcon, Fuel, Droplets, Clock, Receipt, Banknote } from 'lucide-react';

interface Row extends Record<string, unknown> {
  id?: string;
}

interface Entry {
  id: string;
  kind: string;
  /** Append-only table the entry came from, so it can be corrected or voided here. */
  table: string;
  row: Row;
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

const KIND_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Session: { bg: 'bg-gray-50', text: 'text-gray-700', icon: <Fuel className="h-3 w-3" /> },
  Fuel: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Droplets className="h-3 w-3" /> },
  Downtime: { bg: 'bg-slate-50', text: 'text-slate-700', icon: <Clock className="h-3 w-3" /> },
  Expense: { bg: 'bg-red-50', text: 'text-red-700', icon: <Receipt className="h-3 w-3" /> },
  Receipt: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <Banknote className="h-3 w-3" /> },
};

export default function HistoryPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const load = () => {
    const id = myId();
    if (!id) {
      setLoading(false);
      return;
    }
    setApiError(false);
    void Promise.all([
      fetchListStrict<Row>('/api/v1/work-sessions'),
      fetchListStrict<Row>('/api/v1/fuel-downtime/fuel-logs'),
      fetchListStrict<Row>('/api/v1/fuel-downtime/downtime'),
      fetchListStrict<Row>('/api/v1/expenses'),
      fetchListStrict<Row>('/api/v1/client-money/events'),
      fetchListStrict<Row>('/api/v1/machines'),
    ]).then(([s, f, d, e, c, m]) => {
      const code = new Map(m.map((x) => [String(x.id), String(x.code ?? '')]));
      const mine = (rows: Row[]) => rows.filter((r) => String(r.created_by ?? '') === id);

      // API up → show exactly what's in the DB (empty = empty state)
      let all: Entry[] = [];

      if (s.length > 0 || f.length > 0 || d.length > 0 || e.length > 0 || c.length > 0) {
        all = [
          ...mine(s).map((x) => ({ id: String(x.id), kind: 'Session', table: 'work_sessions', row: x, text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${new Date(String(x.start_at)).toLocaleString()}`, t: ts(x.start_at ?? x.created_at) })),
          ...mine(f).map((x) => ({ id: String(x.id), kind: 'Fuel', table: 'fuel_logs', row: x, text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${x.litres} L`, t: ts(x.created_at) })),
          ...mine(d).map((x) => ({ id: String(x.id), kind: 'Downtime', table: 'downtime_segments', row: x, text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${String(x.reason_code ?? '').replace(/_/g, ' ')}`, t: ts(x.started_at ?? x.created_at) })),
          ...mine(e).map((x) => ({ id: String(x.id), kind: 'Expense', table: 'expenses', row: x, text: `${String(x.category_name ?? x.category ?? 'Expense')}`, t: ts(x.date ?? x.created_at) })),
          ...mine(c).map((x) => ({ id: String(x.id), kind: 'Receipt', table: 'client_money_events', row: x, text: `${String(x.event_type)}`, t: ts(x.event_date ?? x.created_at) })),
        ];
      }

      setEntries(all.sort((a, b) => b.t - a.t).slice(0, 50));
    }).catch(() => {
      // API unreachable — banner only, never fake history
      setApiError(true);
      setEntries([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {apiError && <ApiErrorBanner />}
      <div className="rounded-xl bg-gradient-to-r from-gray-950 to-gray-900 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <HistoryIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{isReadOnly ? 'History' : 'My History'}</h1>
            <p className="text-white/80">{isReadOnly ? 'All entries logged by the current user.' : 'Everything you logged — amounts stay yours alone.'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">{isReadOnly ? 'Entries' : 'My Entries'} ({entries.length})</h2>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-500">
            {isReadOnly ? 'No entries found.' : <>Nothing yet. <Link href="/work-session/new" className="text-indigo-600 hover:underline">Start a session</Link>.</>}
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((x) => {
              const style = KIND_STYLES[x.kind] ?? KIND_STYLES.Session;
              return (
                <div key={`${x.kind}-${x.id}`} className="flex items-center justify-between rounded-lg border border-[#E5E2DB] bg-slate-50 p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.icon}
                      {x.kind}
                    </span>
                    <span className="text-slate-700">{x.text}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{new Date(x.t).toLocaleString()}</span>
                    <RecordActions table={x.table} row={x.row} onChanged={load} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
