'use client';

import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';
import { Clock, DollarSign, Wrench } from 'lucide-react';

interface Alert {
  id: string;
  type: 'payment' | 'maintenance' | 'deadline';
  message: string;
  detail: string;
  severity: 'action' | 'urgent' | 'soon';
  icon: 'payment' | 'maintenance' | 'deadline';
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const SEVERITY_CONFIG = {
  action: { label: 'Action', bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-200' },
  urgent: { label: 'Urgent', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200' },
  soon: { label: 'Soon', bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200' },
};

const ICON_MAP = {
  payment: DollarSign,
  maintenance: Wrench,
  deadline: Clock,
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <GlassCard className="h-full">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Needs Attention</h3>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const severity = SEVERITY_CONFIG[alert.severity];
          const Icon = ICON_MAP[alert.icon];

          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 rounded-xl p-3',
                'border transition-all duration-200',
                'hover:shadow-sm',
                severity.border, severity.bg
              )}
            >
              <div className={cn('mt-0.5 rounded-lg p-1.5', severity.bg)}>
                <Icon className={cn('h-4 w-4', severity.text)} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                <p className="text-xs text-slate-500 mt-0.5">{alert.detail}</p>
              </div>

              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                severity.bg, severity.text
              )}>
                {severity.label}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
