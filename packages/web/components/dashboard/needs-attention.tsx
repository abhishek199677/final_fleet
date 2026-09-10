'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';

interface AlertItem {
  id: string;
  type: 'payment' | 'maintenance' | 'fuel';
  message: string;
  subtitle: string;
  urgency: 'action' | 'urgent' | 'soon';
}

interface NeedsAttentionProps {
  alerts: AlertItem[];
}

const URGENCY_CONFIG = {
  action: { label: 'Action', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  urgent: { label: 'Urgent', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  soon: { label: 'Soon', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const TYPE_ICONS = {
  payment: CreditCard,
  maintenance: AlertTriangle,
  fuel: Clock,
};

export function NeedsAttention({ alerts }: NeedsAttentionProps) {
  return (
    <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Needs attention</h3>
      
      <div className="space-y-3">
        {alerts.map((alert) => {
          const config = URGENCY_CONFIG[alert.urgency];
          const Icon = TYPE_ICONS[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3',
                config.border, config.bg
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.text)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                <p className="text-xs text-slate-500">{alert.subtitle}</p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                config.bg, config.text
              )}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
