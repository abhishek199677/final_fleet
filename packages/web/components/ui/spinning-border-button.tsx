'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SpinningBorderButtonProps {
  children?: React.ReactNode;
  type?: 'button' | 'submit';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

/**
 * Pill button whose border is a rotating conic gradient (orange → teal → blue).
 *
 * The spinning ring is decorative (`aria-hidden`), lives inside the pill's
 * `overflow-hidden` clip so it never spills onto the page, and stands still
 * under `prefers-reduced-motion`. Keyframes are in globals.css so the ring
 * can speed up on hover/focus without an inline `animation-duration` fighting
 * the stylesheet.
 */
export default function SpinningBorderButton({
  children = 'Request Demo',
  type = 'button',
  onClick,
  className,
  disabled,
  title,
  'aria-label': ariaLabel,
}: SpinningBorderButtonProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'spinning-border relative isolate inline-flex items-center justify-center',
        'overflow-hidden rounded-full p-[2px]',
        className,
      )}
    >
      {/* Rotating conic gradient — the "spinning border" itself */}
      <span
        aria-hidden="true"
        className="spinning-border__ring pointer-events-none absolute left-1/2 top-1/2 h-[300%] w-[300%] rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, #f97316 0deg, #f59e0b 55deg, #14b8a6 150deg, #3b82f6 245deg, #f97316 360deg)',
        }}
      />

      {/* Opaque core, inset by 2px, so only a 2px ring of gradient shows */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[2px] rounded-full bg-gray-900 dark:bg-gray-900"
      />

      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        className={cn(
          'relative z-10 inline-flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-full',
          'bg-transparent px-4 text-[13px] font-semibold tracking-wide text-white',
          /* inset ring: the wrapper clips anything painted outside the pill */
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400 focus-visible:outline-none',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        {children}
      </button>
    </span>
  );
}
