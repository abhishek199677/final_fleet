'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { sampleFuelLogs, sampleMachines } from '@/lib/sample-data';
import { Droplets, Plus, Fuel } from 'lucide-react';

interface FuelLogEntry {
  id: string;
  machine_id: string;
  fuel_date: string;
  litres: number;
  cost_minor: number;
  currency: string;
  vendor?: string;
  notes?: string;
  machines?: { code: string };
}

export default function OpsFuel() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const [logs, setLogs] = useState<FuelLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchList<FuelLogEntry>('/api/v1/fuel-downtime/fuel-logs')
      .then(data => {
        if (data.length > 0) {
          setLogs(data);
        } else {
          setLogs(sampleFuelLogs.map(l => ({
            ...l,
            machines: { code: sampleMachines.find(m => m.id === l.machine_id)?.code || 'Unknown' },
          })));
        }
      })
      .catch(() => {
        setLogs(sampleFuelLogs.map(l => ({
          ...l,
          machines: { code: sampleMachines.find(m => m.id === l.machine_id)?.code || 'Unknown' },
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <Droplets className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fuel Logs</h1>
              <p className="text-white/80">Track fuel consumption and costs per machine.</p>
            </div>
          </div>
          {!isReadOnly && (
            <Link href="/fuel/new">
              <Button className="bg-white text-amber-600 hover:bg-amber-50">
                <Plus className="mr-2 h-4 w-4" />
                Log Fuel
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#E5E2DB] bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-slate-400">Loading fuel logs...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-[#E5E2DB] bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Fuel className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No fuel logs yet. {!isReadOnly && 'Tap "Log Fuel" to record your first entry.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-[#E5E2DB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2">
                    <Droplets className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{log.machines?.code ?? log.machine_id}</p>
                    <p className="text-sm text-slate-500">
                      {log.fuel_date} · {log.litres}L
                      {log.vendor ? ` · ${log.vendor}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{log.currency} {(log.cost_minor / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
