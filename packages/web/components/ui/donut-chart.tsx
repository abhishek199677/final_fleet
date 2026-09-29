'use client';

import * as React from 'react';

export interface DonutDatum {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  strokeWidth?: number;
  /** Seconds each segment takes to draw. */
  animationDuration?: number;
  /** Seconds of stagger between consecutive segments. */
  animationDelayPerSegment?: number;
  highlightOnHover?: boolean;
  /** Rendered in the middle of the ring (total / hovered value, etc). */
  centerContent?: React.ReactNode;
  /**
   * Fires when a segment is hovered (or left). Wire this to your centre text
   * and legend so both stay in sync with the chart.
   */
  onSegmentHover?: (segment: DonutDatum | null) => void;
  className?: string;
}

/**
 * Animated SVG donut chart.
 *
 * Drawn with plain stroke-dasharray transitions (no chart library), so it
 * stays crisp at any size, respects `prefers-reduced-motion`, and reports the
 * data through an `aria-label` — the surrounding legend carries the numbers
 * for screen-reader and keyboard users.
 */
export function DonutChart({
  data,
  size = 250,
  strokeWidth = 30,
  animationDuration = 1.2,
  animationDelayPerSegment = 0.05,
  highlightOnHover = true,
  centerContent,
  onSegmentHover,
  className,
}: DonutChartProps) {
  const [drawn, setDrawn] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Draw after the first paint so the dasharray transition actually plays;
  // skip straight to the end state when the user prefers reduced motion.
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
      setDrawn(true);
      return;
    }
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0);

  // A hairline gap keeps adjacent segments readable (like recharts' paddingAngle).
  const gap = data.length > 1 ? Math.min(6, circumference * 0.012) : 0;

  let runningOffset = 0;
  const segments = data.map((datum) => {
    const fraction = total > 0 ? Math.max(datum.value, 0) / total : 0;
    const length = fraction * circumference;
    const dash = Math.max(length - gap, 0.5);
    const offset = -runningOffset;
    runningOffset += length;
    return { datum, dash, offset };
  });

  const handleEnter = (index: number) => {
    setHoveredIndex(index);
    onSegmentHover?.(segments[index].datum);
  };
  const handleLeave = () => {
    setHoveredIndex(null);
    onSegmentHover?.(null);
  };

  const ariaLabel =
    total > 0
      ? `Donut chart: ${data
          .map((d) => `${d.label} ${d.value} (${Math.round((d.value / total) * 100)}%)`)
          .join(', ')}`
      : 'Empty donut chart';

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ''}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
        className="overflow-visible"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* Track ring: shows through as the "empty" part of the donut. */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-border"
          />
          {segments.map(({ datum, dash, offset }, index) => (
            <circle
              key={`${datum.label}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={datum.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={drawn ? `${dash} ${circumference - dash}` : `0 ${circumference}`}
              strokeDashoffset={offset}
              aria-hidden="true"
              onMouseEnter={() => handleEnter(index)}
              onMouseLeave={handleLeave}
              className="cursor-pointer"
              style={{
                // Two transitions: a slow staggered draw, a snappy hover dim.
                transition: reducedMotion
                  ? 'none'
                  : `stroke-dasharray ${animationDuration}s cubic-bezier(0.16, 1, 0.3, 1) ${
                      index * animationDelayPerSegment
                    }s, opacity 0.2s ease`,
                opacity:
                  highlightOnHover && hoveredIndex !== null && hoveredIndex !== index ? 0.3 : 1,
              }}
            />
          ))}
        </g>
      </svg>

      {/* Centre text sits above the chart but never blocks segment hovers. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {centerContent}
      </div>
    </div>
  );
}
