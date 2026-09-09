'use client';

import { GlassCard } from './glass-card';

interface StatusItem {
  label: string;
  count: number;
  color: string;
}

interface FleetStatusProps {
  statuses: StatusItem[];
  total: number;
}

export function FleetStatus({ statuses, total }: FleetStatusProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Fleet Status</h3>
        <span className="text-sm text-slate-500">{total} machines</span>
      </div>

      <div className="relative mx-auto mb-6 h-40 w-40">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {statuses.map((item, i) => {
            const prevCounts = statuses
              .slice(0, i)
              .reduce((sum, s) => sum + s.count, 0);
            const offset = (prevCounts / total) * circumference;
            const dashArray = (item.count / total) * circumference;

            return (
              <circle
                key={item.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>

      <div className="space-y-3">
        {statuses.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-600">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{item.count}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
