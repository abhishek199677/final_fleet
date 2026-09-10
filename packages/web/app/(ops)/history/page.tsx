'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { sampleSessions, sampleFuelLogs, sampleDowntime, sampleExpenses, sampleReceipts, sampleMachines } from '@/lib/sample-data';
import { History as HistoryIcon, Fuel, Droplets, Clock, Receipt, Banknote } from 'lucide-react';

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

const KIND_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Session: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <Fuel className="h-3 w-3" /> },
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

  useEffect(() => {
    const id = myId();
    if (!id) {
      setLoading(false);
      return;
    }
    void Promise.all([
      fetchList<Row>('/api/v1/work-sessions'),
      fetchList<Row>('/api/v1/fuel-downtime/fuel-logs'),
      fetchList<Row>('/api/v1/fuel-downtime/downtime'),
      fetchList<Row>('/api/v1/expenses'),
      fetchList<Row>('/api/v1/client-money/events'),
      fetchList<Row>('/api/v1/machines'),
    ]).then(([s, f, d, e, c, m]) => {
      const code = new Map(m.map((x) => [String(x.id), String(x.code ?? '')]));
      const mine = (rows: Row[]) => rows.filter((r) => String(r.created_by ?? '') === id);
      
      let all: Entry[] = [];
      
      if (s.length > 0 && f.length > 0) {
        all = [
          ...mine(s).map((x) => ({ id: String(x.id), kind: 'Session', text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${new Date(String(x.start_at)).toLocaleString()}`, t: ts(x.start_at ?? x.created_at) })),
          ...mine(f).map((x) => ({ id: String(x.id), kind: 'Fuel', text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${x.litres} L`, t: ts(x.created_at) })),
          ...mine(d).map((x) => ({ id: String(x.id), kind: 'Downtime', text: `${code.get(String(x.machine_id)) ?? 'Machine'} · ${String(x.reason_code ?? '').replace(/_/g, ' ')}`, t: ts(x.started_at ?? x.created_at) })),
          ...mine(e).map((x) => ({ id: String(x.id), kind: 'Expense', text: `${String(x.category_name ?? x.category ?? 'Expense')}`, t: ts(x.date ?? x.created_at) })),
          ...mine(c).map((x) => ({ id: String(x.id), kind: 'Receipt', text: `${String(x.event_type)}`, t: ts(x.event_date ?? x.created_at) })),
        ];
      } else {
        const machineMap = new Map(sampleMachines.map(m => [m.id, m.code]));
        all = [
          ...sampleSessions.map((x) => ({ id: String(x.id), kind: 'Session', text: `${machineMap.get(x.machine_id) || 'Machine'} · ${new Date(x.start_at).toLocaleString()}`, t: ts(x.start_at) })),
          ...sampleFuelLogs.map((x) => ({ id: String(x.id), kind: 'Fuel', text: `${machineMap.get(x.machine_id) || 'Machine'} · ${x.litres} L`, t: ts(x.created_at) })),
          ...sampleDowntime.map((x) => ({ id: String(x.id), kind: 'Downtime', text: `${machineMap.get(x.machine_id) || 'Machine'} · ${x.reason_code.replace(/_/g, ' ')}`, t: ts(x.started_at) })),
          ...sampleExpenses.map((x) => ({ id: String(x.id), kind: 'Expense', text: `${x.expense_categories?.name ?? 'Expense'}`, t: ts(x.date) })),
          ...sampleReceipts.map((x) => ({ id: String(x.id), kind: 'Receipt', text: `${x.event_type}`, t: ts(x.event_date) })),
        ];
      }
      
      setEntries(all.sort((a, b) => b.t - a.t).slice(0, 50));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 p-6 text-white">
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
                  <span className="text-slate-500">{new Date(x.t).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
