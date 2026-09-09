'use client';

import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';

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
  working: { label: 'Working', color: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  idle: { label: 'Idle', color: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
  breakdown: { label: 'Breakdown', color: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600' },
  transit: { label: 'In Transit', color: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600' },
  service: { label: 'In Service', color: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600' },
  log_pending: { label: 'Log Pending', color: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600' },
};

export function ActivityTable({ machines }: ActivityTableProps) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Machine Activity</h3>
        <p className="text-sm text-slate-500">{machines.length} machines · live operating board</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div className="mb-2 grid grid-cols-[1.5fr_1fr_1fr_auto] gap-3 px-3 text-xs font-medium uppercase tracking-wider text-slate-400 sm:grid-cols-[2fr_1fr_1fr_auto]">
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
                    'grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 sm:grid-cols-[2fr_1fr_1fr_auto]',
                    'border border-slate-100 bg-white/60',
                    'transition-all duration-200 hover:bg-white hover:shadow-sm'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{machine.code}</p>
                    <p className="truncate text-xs text-slate-500">{machine.make} {machine.model}</p>
                  </div>

                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                      config.bg, config.text
                    )}>
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', config.color)} />
                      {config.label}
                    </span>
                  </div>

                  <div>
                    <p className="truncate text-sm text-slate-600">{machine.site}</p>
                  </div>

                  <div className="text-right">
                    <span className="whitespace-nowrap text-sm font-medium text-slate-900">
                      {machine.todayHours ? `+${machine.todayHours}h` : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
