'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: number | string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  statusDot?: string;
  subtitle?: string;
}

export function KPICard({
  label,
  value,
  suffix = '',
  trend,
  trendLabel = 'vs last period',
  statusDot,
  subtitle,
}: KPICardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;

  useEffect(() => {
    if (typeof value !== 'number') return;
    
    const duration = 1200;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setAnimatedValue(numericValue);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [numericValue, value]);

  const displayValue = typeof value === 'number'
    ? animatedValue.toLocaleString('en-IN')
    : value;

  return (
    <div className="rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {statusDot && (
          <span
            className="relative flex h-2.5 w-2.5"
          >
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: statusDot }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: statusDot }}
            />
          </span>
        )}
      </div>

      <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        {displayValue}
        {suffix && <span className="ml-1 text-sm sm:text-base text-slate-500">{suffix}</span>}
      </p>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      )}

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              trend >= 0
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-600'
            )}
          >
            {trend >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
          <span className="text-xs text-slate-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
