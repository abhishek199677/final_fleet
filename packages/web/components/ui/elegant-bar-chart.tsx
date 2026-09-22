'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
  gradient?: [string, string];
}

interface ElegantBarChartProps {
  data: BarChartDataItem[];
  className?: string;
  /** Chart height in pixels */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show tooltips */
  showTooltip?: boolean;
  /** Show values on bars */
  showValues?: boolean;
  /** Layout: vertical or horizontal */
  layout?: 'vertical' | 'horizontal';
  /** Bar radius */
  barRadius?: [number, number, number, number];
  /** Bar size (width for vertical, height for horizontal) */
  barSize?: number;
  /** Default color if not specified in data */
  defaultColor?: string;
  /** Gradient colors [start, end] */
  defaultGradient?: [string, string];
  /** Title */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Icon */
  icon?: React.ReactNode;
  /** Max value for Y axis */
  maxValue?: number;
  /** Show average line */
  showAverage?: boolean;
  /** Average value */
  averageValue?: number;
  /** Average label */
  averageLabel?: string;
}

export function ElegantBarChart({
  data,
  className,
  height = 300,
  showGrid = true,
  showTooltip = true,
  showValues = false,
  layout = 'horizontal',
  barRadius = [6, 6, 0, 0],
  barSize = 40,
  defaultColor = '#6366f1',
  title,
  subtitle,
  icon,
  maxValue,
  showAverage = false,
  averageValue,
  averageLabel = 'Average',
}: ElegantBarChartProps) {
  const gradientId = React.useId();

  const processedData = data.map((item, index) => ({
    ...item,
    fill: item.color || defaultColor,
    gradientId: `${gradientId}-${index}`,
  }));

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: { label?: string; value?: number | string } }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload;
    return (
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-zinc-400 text-xs mb-1">{item.label || label}</p>
        <p className="text-white font-semibold text-lg">
          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
        </p>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {(title || subtitle || icon) && (
        <div className="mb-6">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-zinc-400">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData}
            layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            barCategoryGap="20%"
          >
            <defs>
              {processedData.map((item) => (
                <linearGradient
                  key={item.gradientId}
                  id={item.gradientId}
                  x1={layout === 'vertical' ? '0' : '0'}
                  y1={layout === 'vertical' ? '0' : '0'}
                  x2={layout === 'vertical' ? '1' : '0'}
                  y2={layout === 'vertical' ? '0' : '1'}
                >
                  <stop
                    offset="0%"
                    stopColor={item.gradient?.[0] || item.fill}
                    stopOpacity={0.9}
                  />
                  <stop
                    offset="100%"
                    stopColor={item.gradient?.[1] || item.fill}
                    stopOpacity={0.7}
                  />
                </linearGradient>
              ))}
            </defs>

            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                horizontal={layout !== 'vertical'}
                vertical={layout === 'vertical'}
              />
            )}

            {layout === 'vertical' ? (
              <>
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  domain={maxValue ? [0, maxValue] : undefined}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  domain={maxValue ? [0, maxValue] : undefined}
                />
              </>
            )}

            {showTooltip && <Tooltip content={<CustomTooltip />} />}

            {showAverage && averageValue !== undefined && (
              <ReferenceLine
                y={layout === 'vertical' ? undefined : averageValue}
                x={layout === 'vertical' ? averageValue : undefined}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: averageLabel,
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              />
            )}

            <Bar
              dataKey="value"
              radius={barRadius}
              barSize={barSize}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
              label={
                showValues
                  ? {
                      position: 'top',
                      fill: '#a1a1aa',
                      fontSize: 12,
                      fontWeight: 500,
                      formatter: (value: number) => value.toLocaleString(),
                    }
                  : undefined
              }
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#${entry.gradientId})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {data.some((item) => item.color || item.gradient) && (
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: item.gradient
                    ? `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`
                    : item.color || defaultColor,
                }}
              />
              <span className="text-xs text-zinc-400">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { ElegantBarChartProps, BarChartDataItem };
