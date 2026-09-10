'use client';

import { cn } from '@/lib/utils';

interface Machine {
  code: string;
  make: string;
  model: string;
  status: 'working' | 'idle' | 'breakdown' | 'transit' | 'service' | 'log_pending';
  site: string;
  todayHours?: number;
}

interface ActivityTableProps {
  machines: Machine[];
}

const STATUS_CONFIG = {
  working: { label: 'Working', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  idle: { label: 'Idle', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  breakdown: { label: 'Breakdown', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  stopped: { label: 'Stopped', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  transit: { label: 'In transit', dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  service: { label: 'In service', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  log_pending: { label: 'Log pending', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
};

export function ActivityTable({ machines }: ActivityTableProps) {
  return (
    <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Machine activity</h3>
        <p className="text-sm text-slate-500">{machines.length} machines · live operating board</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div className="mb-3 grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 px-4 text-xs font-medium uppercase tracking-wider text-slate-400 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <div>Machine</div>
            <div>Status</div>
            <div>Site</div>
            <div className="text-right">Today</div>
          </div>

          <div className="space-y-2">
            {machines.map((machine) => {
              const config = STATUS_CONFIG[machine.status];
              return (
                <div
                  key={machine.code}
                  className={cn(
                    'grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-4 rounded-lg px-4 py-3 sm:grid-cols-[2fr_1fr_1fr_auto]',
                    'border border-slate-100 bg-slate-50/50',
                    'transition-all duration-200 hover:bg-white hover:shadow-sm'
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{machine.code}</p>
                    <p className="text-xs text-slate-500">{machine.make} {machine.model}</p>
                  </div>

                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      config.bg, config.text
                    )}>
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', config.dot)} />
                      {config.label}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600">{machine.site}</p>
                  </div>

                  <div className="text-right">
                    <span className="whitespace-nowrap text-sm font-medium text-slate-900">
                      {machine.todayHours ? `+${machine.todayHours} hrs` : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
