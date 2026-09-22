'use client';

import { useMemo, useState } from 'react';
import useMeasure from 'react-use-measure';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Grid } from '@visx/grid';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type BarChartProps = {
  data: { label: string; value: number; color?: string }[];
  className?: string;
  height?: number;
  barColor?: string;
  hoverColor?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  rounded?: boolean;
  animated?: boolean;
  layout?: 'vertical' | 'horizontal';
  gap?: number;
  valuePrefix?: string;
  valueSuffix?: string;
};

export function BarChart({
  data,
  className,
  height = 300,
  barColor = '#6366f1',
  hoverColor = '#818cf8',
  showGrid = true,
  showLabels = true,
  showValues = true,
  rounded = true,
  animated = true,
  layout = 'vertical',
  valuePrefix = '',
  valueSuffix = '',
}: BarChartProps) {
  const [ref, { width }] = useMeasure();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value)), [data]);

  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, maxValue * 1.1],
        range: layout === 'vertical' ? [0, width] : [0, height],
      }),
    [maxValue, width, height, layout]
  );

  const yScale = useMemo(
    () =>
      scaleBand({
        domain: data.map((d) => d.label),
        range: layout === 'vertical' ? [0, height] : [0, width],
        padding: 0.3,
      }),
    [data, height, width, layout]
  );

  if (width === 0) {
    return (
      <div ref={ref} className={cn('w-full', className)} style={{ height }} />
    );
  }

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Grid */}
        {showGrid && layout === 'vertical' && (
          <Grid
            xScale={xScale}
            yScale={yScale}
            width={width}
            height={height}
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />
        )}
        {showGrid && layout === 'horizontal' && (
          <Grid
            xScale={yScale}
            yScale={xScale}
            width={width}
            height={height}
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />
        )}

        {/* Bars */}
        {data.map((item, index) => {
          const isHovered = hoveredIndex === index;
          const barLength = xScale(item.value);
          const barPosition = yScale(item.label) ?? 0;
          const barThickness = yScale.bandwidth();
          const color = item.color || barColor;

          if (layout === 'vertical') {
            return (
              <g
                key={item.label}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <motion.rect
                  x={0}
                  y={barPosition}
                  width={animated ? barLength : barLength}
                  height={barThickness}
                  rx={rounded ? 6 : 0}
                  ry={rounded ? 6 : 0}
                  fill={isHovered ? hoverColor : color}
                  opacity={isHovered ? 1 : 0.85}
                  initial={animated ? { width: 0 } : false}
                  animate={{ width: barLength }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 }}
                  className="cursor-pointer"
                />
                {/* Value label */}
                {showValues && (
                  <motion.text
                    x={barLength + 8}
                    y={barPosition + barThickness / 2}
                    dy="0.35em"
                    fill="#a1a1aa"
                    fontSize={12}
                    fontWeight={500}
                    initial={animated ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 + 0.3 }}
                  >
                    {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
                  </motion.text>
                )}
              </g>
            );
          }

          // Horizontal layout
          return (
            <g
              key={item.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <motion.rect
                x={barPosition}
                y={height - barLength}
                width={barThickness}
                height={barLength}
                rx={rounded ? 6 : 0}
                ry={rounded ? 6 : 0}
                fill={isHovered ? hoverColor : color}
                opacity={isHovered ? 1 : 0.85}
                initial={animated ? { height: 0, y: height } : false}
                animate={{ height: barLength, y: height - barLength }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 }}
                className="cursor-pointer"
              />
              {/* Value label */}
              {showValues && (
                <motion.text
                  x={barPosition + barThickness / 2}
                  y={height - barLength - 8}
                  textAnchor="middle"
                  fill="#a1a1aa"
                  fontSize={12}
                  fontWeight={500}
                  initial={animated ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.05 + 0.3 }}
                >
                  {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
                </motion.text>
              )}
            </g>
          );
        })}

        {/* Labels */}
        {showLabels && data.map((item) => {
          const barPosition = yScale(item.label) ?? 0;
          const barThickness = yScale.bandwidth();

          if (layout === 'vertical') {
            return (
              <text
                key={`label-${item.label}`}
                x={-8}
                y={barPosition + barThickness / 2}
                dy="0.35em"
                textAnchor="end"
                fill="#71717a"
                fontSize={12}
                fontWeight={500}
              >
                {item.label}
              </text>
            );
          }

          return (
            <text
              key={`label-${item.label}`}
              x={barPosition + barThickness / 2}
              y={height + 20}
              textAnchor="middle"
              fill="#71717a"
              fontSize={12}
              fontWeight={500}
            >
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
