'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineStatus = 'completed' | 'in-progress' | 'pending' | 'on-hold';

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: LucideIcon;
  relatedIds: number[];
  status: TimelineStatus;
  /** Overrides the status badge text (e.g. "Active", "Scheduled"). */
  statusLabel?: string;
  /** 0–100: arc around the node and hub meter. Omit for a full ring. */
  energy?: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  /** Word shown under the hub count (defaults to "Milestones"). */
  hubLabel?: string;
  className?: string;
}

const STATUS_STYLES: Record<TimelineStatus, { color: string; label: string }> = {
  completed: { color: '#22C55E', label: 'Completed' },
  'in-progress': { color: '#F59E0B', label: 'In progress' },
  pending: { color: '#9CA3AF', label: 'Pending' },
  'on-hold': { color: '#EF4444', label: 'On hold' },
};

/**
 * Formats an ISO timestamp or `YYYY-MM-DD` date for node labels. Date-only
 * strings are read exactly as written, so no timezone can shift the day.
 */
export function formatTimelineDate(value: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const NODE_SIZE = 56;
const RING_RADIUS = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface NodePosition {
  item: TimelineItem;
  index: number;
  x: number;
  y: number;
}

/**
 * Radial "orbital" timeline: milestones sit on a ring around a hub, related
 * milestones are joined by orbit curves, and each node carries a status ring
 * plus an energy arc. Click (or keyboard-focus) a node to open its details in
 * the centre; its links light up and everything else dims.
 *
 * The whole canvas is measured with a ResizeObserver, so positions are pure
 * geometry — no layout thrash — and the layout scrolls horizontally below
 * 620px rather than crushing the nodes together.
 */
export function RadialOrbitalTimeline({ timelineData, hubLabel = 'Milestones', className }: RadialOrbitalTimelineProps) {
  const reduceMotion = useReducedMotion();
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [hoveredId, setHoveredId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setBox({ w: Math.round(rect.width), h: Math.round(rect.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Escape closes the centre card.
  React.useEffect(() => {
    if (selectedId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  const count = timelineData.length;
  const byId = React.useMemo(
    () => new Map(timelineData.map((item) => [item.id, item])),
    [timelineData],
  );

  const cx = box.w / 2;
  const cy = box.h / 2;
  const radius =
    count > 0 ? Math.max(150, Math.min(box.w / 2 - 64, box.h / 2 - 84)) : 0;

  const nodes: NodePosition[] = count
    ? timelineData.map((item, index) => {
        const angle = ((-90 + (360 / count) * index) * Math.PI) / 180;
        return {
          item,
          index,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        };
      })
    : [];
  const posById = new Map(nodes.map((node) => [node.item.id, node]));

  // Unique related pairs, curved outwards so they read as orbits, not chords.
  const links = React.useMemo(() => {
    const seen = new Set<string>();
    const pairs: { key: string; from: TimelineItem; a: TimelineItem; b: TimelineItem }[] = [];
    for (const item of timelineData) {
      for (const relatedId of item.relatedIds) {
        if (!byId.has(relatedId) || relatedId === item.id) continue;
        const key = [item.id, relatedId].sort((m, n) => m - n).join(':');
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ key, from: item, a: item, b: byId.get(relatedId)! });
      }
    }
    return pairs;
  }, [timelineData, byId]);

  const activeId = selectedId ?? hoveredId;
  const activeItem = activeId !== null ? byId.get(activeId) ?? null : null;
  const activeSet = new Set<number>(
    activeItem ? [activeItem.id, ...activeItem.relatedIds] : [],
  );
  const isDimmed = (id: number) => activeItem !== null && !activeSet.has(id);

  const linkPath = (a: TimelineItem, b: TimelineItem): string | null => {
    const pa = posById.get(a.id);
    const pb = posById.get(b.id);
    if (!pa || !pb) return null;
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    // Push the control point away from the hub → an orbital arc.
    const cpx = mx + (mx - cx) * 0.35;
    const cpy = my + (my - cy) * 0.35;
    return `M ${pa.x} ${pa.y} Q ${cpx} ${cpy} ${pb.x} ${pb.y}`;
  };

  const selectedItem = selectedId !== null ? byId.get(selectedId) ?? null : null;

  return (
    <div className={cn('w-full overflow-hidden rounded-2xl border bg-card', className)}>
      <div className="w-full overflow-x-auto">
        <div ref={canvasRef} className="relative h-[560px] min-w-[620px] md:h-[620px]">
          {box.w > 0 && count > 0 && (
            <>
              {/* ── Orbits and links ── */}
              <svg
                className="absolute inset-0"
                width={box.w}
                height={box.h}
                viewBox={`0 0 ${box.w} ${box.h}`}
                aria-hidden="true"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-border"
                  opacity={0.7}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius * 0.55}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="3 8"
                  className="text-border"
                  opacity={0.5}
                />
                <g
                  className={reduceMotion ? undefined : 'orbital-spin'}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius * 0.82}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="2 16"
                    strokeLinecap="round"
                    className="text-border"
                    opacity={0.6}
                  />
                </g>

                {links.map((link, index) => {
                  const d = linkPath(link.a, link.b);
                  if (!d) return null;
                  const on = activeItem !== null && (activeItem.id === link.a.id || activeItem.id === link.b.id);
                  const color = STATUS_STYLES[link.from.status].color;
                  return (
                    <motion.path
                      key={link.key}
                      d={d}
                      fill="none"
                      stroke={on ? color : 'currentColor'}
                      strokeWidth={on ? 1.75 : 1}
                      strokeLinecap="round"
                      strokeDasharray={on ? '5 12' : undefined}
                      className={cn(on && !reduceMotion && 'orbital-link-flow', 'text-border')}
                      initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: on ? 0.95 : 0.35 }}
                      transition={{
                        pathLength: reduceMotion
                          ? { duration: 0 }
                          : { duration: 0.8, delay: 0.35 + index * 0.05 },
                        opacity: { duration: 0.2 },
                      }}
                    />
                  );
                })}
              </svg>

              {/* ── Hub ── */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                <AnimatePresence mode="wait">
                  {selectedItem ? (
                    <motion.div
                      key="card"
                      role="group"
                      aria-label={`${selectedItem.title} details`}
                      className="pointer-events-auto w-[264px] rounded-2xl border bg-card p-4 shadow-xl"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 8 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {(() => {
                        const style = STATUS_STYLES[selectedItem.status];
                        const Icon = selectedItem.icon;
                        return (
                          <>
                            <button
                              type="button"
                              aria-label="Close details"
                              onClick={() => setSelectedId(null)}
                              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>

                            <div className="flex items-center gap-2.5 pr-6">
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${style.color}26`, color: style.color }}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  {selectedItem.category}
                                </p>
                                <p className="truncate text-sm font-bold leading-tight">
                                  {selectedItem.title}
                                </p>
                              </div>
                            </div>

                            <p className="mt-3 text-xs font-medium text-muted-foreground">
                              {selectedItem.date}
                            </p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">
                              {selectedItem.content}
                            </p>

                            <div className="mt-3 flex items-center justify-between">
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{ backgroundColor: `${style.color}1f`, color: style.color }}
                              >
                                {selectedItem.statusLabel ?? style.label}
                              </span>
                              {selectedItem.energy != null && (
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  Energy {selectedItem.energy}%
                                </span>
                              )}
                            </div>
                            {selectedItem.energy != null && (
                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: style.color }}
                                  initial={
                                    reduceMotion ? { width: `${selectedItem.energy}%` } : { width: 0 }
                                  }
                                  animate={{ width: `${selectedItem.energy}%` }}
                                  transition={{ duration: 0.5, delay: 0.12 }}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="hub"
                      className="pointer-events-none flex flex-col items-center text-center"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border bg-muted/40">
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{hubLabel}</p>
                      <p className="mt-1 max-w-[170px] text-xs text-muted-foreground">
                        Select a node to open its details and follow its orbit links.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Nodes ── */}
              {nodes.map(({ item, index, x, y }) => {
                const style = STATUS_STYLES[item.status];
                const Icon = item.icon;
                const selected = selectedId === item.id;
                const dimmed = isDimmed(item.id);
                const energy = item.energy ?? 100;
                const arc = (Math.min(Math.max(energy, 0), 100) / 100) * RING_CIRCUMFERENCE;

                return (
                  <div
                    key={item.id}
                    className="absolute z-10"
                    style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                  >
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: dimmed ? 0.45 : 1, scale: 1 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 220, damping: 18, delay: index * 0.07 }
                      }
                      className="flex flex-col items-center"
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${item.title}, ${item.date}, ${item.statusLabel ?? style.label}`}
                        onClick={() => setSelectedId(selected ? null : item.id)}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId((current) => (current === item.id ? null : current))}
                        onFocus={() => setHoveredId(item.id)}
                        onBlur={() => setHoveredId((current) => (current === item.id ? null : current))}
                        className={cn(
                          'relative flex items-center justify-center rounded-full border bg-card',
                          'transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          selected && 'scale-105',
                        )}
                        style={{
                          width: NODE_SIZE,
                          height: NODE_SIZE,
                          borderColor: selected ? style.color : undefined,
                          boxShadow: selected
                            ? `0 0 0 4px ${style.color}2e, 0 0 20px ${style.color}33`
                            : undefined,
                        }}
                      >
                        <svg
                          className="absolute inset-0 overflow-visible"
                          width={NODE_SIZE}
                          height={NODE_SIZE}
                          viewBox={`0 0 ${NODE_SIZE} ${NODE_SIZE}`}
                          aria-hidden="true"
                        >
                          <circle
                            cx={NODE_SIZE / 2}
                            cy={NODE_SIZE / 2}
                            r={RING_RADIUS}
                            fill="none"
                            strokeWidth={3}
                            stroke="currentColor"
                            className="text-muted"
                          />
                          <circle
                            cx={NODE_SIZE / 2}
                            cy={NODE_SIZE / 2}
                            r={RING_RADIUS}
                            fill="none"
                            strokeWidth={3}
                            strokeLinecap="round"
                            stroke={style.color}
                            strokeDasharray={`${arc} ${RING_CIRCUMFERENCE - arc}`}
                            transform={`rotate(-90 ${NODE_SIZE / 2} ${NODE_SIZE / 2})`}
                            opacity={0.9}
                          />
                        </svg>

                        <Icon
                          className="relative h-5 w-5"
                          style={{ color: style.color }}
                          aria-hidden="true"
                        />

                        {item.status === 'completed' && (
                          <span
                            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border bg-card"
                            style={{ borderColor: style.color }}
                            aria-hidden="true"
                          >
                            <Check className="h-2.5 w-2.5" style={{ color: style.color }} />
                          </span>
                        )}
                      </button>

                      <div className="absolute left-1/2 top-full mt-1.5 w-max max-w-[96px] -translate-x-1/2 text-center">
                        <p
                          className={cn(
                            'truncate text-[11px] font-semibold leading-tight',
                            dimmed && 'opacity-50',
                          )}
                        >
                          {item.title}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">{item.date}</p>
                      </div>
                    </motion.div>
                  </div>
                );
              })}

              {/* ── Status legend ── */}
              <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1">
                {(Object.keys(STATUS_STYLES) as TimelineStatus[])
                  .filter((status) => timelineData.some((item) => item.status === status))
                  .map((status) => (
                    <span
                      key={status}
                      className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_STYLES[status].color }}
                      />
                      {STATUS_STYLES[status].label}
                    </span>
                  ))}
              </div>
            </>
          )}

          {count === 0 && box.w > 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No milestones to show yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RadialOrbitalTimeline;
