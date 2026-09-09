'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';

interface KPICardProps {
  label: string;
  value: number | string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  sparkline?: number[];
  sparklineColor?: string;
  statusDot?: string;
}

export function KPICard({
  label,
  value,
  suffix = '',
  trend,
  trendLabel = 'vs last period',
  sparkline = [],
  sparklineColor = '#10b981',
  statusDot,
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
    <GlassCard className="relative overflow-hidden">
      {statusDot && (
        <div className="absolute right-4 top-4">
          <span
            className="relative flex h-2.5 w-2.5"
            style={{ backgroundColor: statusDot }}
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
        </div>
      )}

      <p className="truncate text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-1 truncate text-3xl font-bold tracking-tight text-slate-900">
        {displayValue}
        {suffix && <span className="ml-1 text-lg text-slate-500">{suffix}</span>}
      </p>

      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              trend >= 0
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-red-500/10 text-red-600'
            )}
          >
            {trend >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
          <span className="text-xs text-slate-400">{trendLabel}</span>
        </div>
      )}

      {sparkline.length > 0 && (
        <svg
          className="mt-3 h-8 w-full"
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={sparklineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={generateSparklinePath(sparkline)}
            fill={`url(#grad-${label})`}
          />
          <path
            d={generateSparklinePath(sparkline, false)}
            fill="none"
            stroke={sparklineColor}
            strokeWidth="1.5"
          />
        </svg>
      )}
    </GlassCard>
  );
}

function generateSparklinePath(data: number[], fill = true): string {
  if (data.length === 0) return '';
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * height,
  }));

  if (fill) {
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    return `${line} L${width},${height} L0,${height} Z`;
  }

  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}
