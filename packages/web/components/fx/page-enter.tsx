'use client';

import { cn } from '@/lib/utils';

/**
 * PageEnter — one-shot page transition wrapper.
 * Uses --fleet-motion-slow + ease-out. No JS, CSS-only, reduced-motion safe.
 * Apply in route group layouts around <main> content.
 */
export function PageEnter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('fleet-page-enter', className)}>{children}</div>;
}
