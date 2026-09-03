'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AmbientBackground — app-wide Chat Bucket backdrop.
 * Fixed, pointer-events-none, aria-hidden. Grid + top glare + 3 drifting
 * orbs + noise + hairline beam. Disabled motion under prefers-reduced-motion
 * via CSS. Must render once in root layout, never per-page.
 */
export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div className={cn('fleet-ambient', className)} aria-hidden="true" data-testid="fleet-ambient">
      <div className="fleet-ambient-orb fleet-ambient-orb-a" />
      <div className="fleet-ambient-orb fleet-ambient-orb-b" />
      <div className="fleet-ambient-orb fleet-ambient-orb-c" />
      <div className="fleet-ambient-grid" />
      <div className="fleet-ambient-topglare" />
      <div className="fleet-ambient-beam" />
      <div className="fleet-ambient-noise" />
    </div>
  );
}
