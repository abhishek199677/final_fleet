'use client';

import React, { useId } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GlowButtonProps {
  /** Label inside the button surface. */
  children?: React.ReactNode;
  /** When set, renders a Next.js link (e.g. `/register`) instead of a button. */
  href?: string;
  /** Surface width in px. The shape is a 60px-tall squircle, so min 60. */
  width?: number;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  'aria-label'?: string;
}

/**
 * Dark squircle CTA with a three-layer animated glow (orange → teal).
 *
 * The glow layers and the SVG colour-matrix filters are decorative — they are
 * hidden from assistive tech, and the whole control is a single real
 * <button>/<Link> so keyboard focus and activation work normally.
 * Keyframes live in globals.css (`.glow-button:hover .glow-layer`) and are
 * switched off under `prefers-reduced-motion`.
 */
export function GlowButton({
  children = 'Register',
  href,
  width = 120,
  className,
  type = 'button',
  disabled,
  onClick,
  'aria-label': ariaLabel,
}: GlowButtonProps): React.JSX.Element {
  const rawId = useId().replace(/:/g, '');
  const filters = {
    unopaq: `unopaq-${rawId}`,
    unopaq2: `unopaq2-${rawId}`,
    unopaq3: `unopaq3-${rawId}`,
  };

  const w = Math.max(60, Math.round(width));
  // Squircle: 30px radius caps, straight top/bottom between them.
  const surfacePath = `M ${w - 30} 0 C ${w - 5} 0 ${w} 5 ${w} 30 C ${w} 55 ${w - 5} 60 ${w - 30} 60 L 30 60 C 5 60 0 55 0 30 C 0 5 5 0 30 0 Z`;
  // Border shell sits 3px outside the surface (126×66 for a 120×60 surface).
  const borderPath = `M ${w - 27} 0 C ${w + 1} 0 ${w + 6} 5 ${w + 6} 33 C ${w + 6} 61 ${w + 1} 66 ${w - 27} 66 L 33 66 C 5 66 0 61 0 33 C 0 5 5 0 33 0 Z`;

  const glowLayers = (
    <>
      {/* Outer glow */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-20 overflow-hidden opacity-50 transition-opacity duration-300 group-hover:opacity-75 group-active:opacity-100"
        style={{ filter: `blur(2em) url(#${filters.unopaq})` }}
      >
        <span
          className="glow-layer absolute inset-[-150%]"
          style={{ background: 'linear-gradient(90deg, #f50 30%, #0000 50%, #05f70%)' }}
        />
      </span>

      {/* Middle glow */}
      <span
        aria-hidden="true"
        className="absolute inset-[-0.125em] -z-20 overflow-hidden opacity-50 transition-opacity duration-300 group-hover:opacity-75 group-active:opacity-100"
        style={{
          filter: `blur(0.25em) url(#${filters.unopaq2})`,
          borderRadius: '0.75em',
        }}
      >
        <span
          className="glow-layer absolute inset-[-150%]"
          style={{ background: 'linear-gradient(90deg, #f95 20%, #0000 45% 55%, #59f80)' }}
        />
      </span>
    </>
  );

  const surface = (
    <>
      {/* Border shell — also carries the bottom edge of the glow */}
      <span
        aria-hidden="true"
        className="block bg-[#0005] p-0.5"
        style={{ clipPath: borderPath }}
      >
        <span className="relative isolate block">
          {/* Inner glow */}
          <span
            aria-hidden="true"
            className="absolute inset-[-2px] -z-10 overflow-hidden opacity-50 transition-opacity duration-300 group-hover:opacity-75 group-active:opacity-100"
            style={{
              filter: `blur(2px) url(#${filters.unopaq3})`,
              borderRadius: 'inherit',
            }}
          >
            <span
              className="glow-layer absolute inset-[-150%]"
              style={{ background: 'linear-gradient(90deg, #fc9 30%, #0000 45% 55%, #9cf 70%)' }}
            />
          </span>

          {/* Button surface — white on near-black (17.5:1) */}
          <span
            className="relative flex h-[60px] items-center justify-center overflow-hidden bg-[#111215] px-5 text-sm font-semibold tracking-wide text-white"
            style={{ clipPath: surfacePath, width: w, borderRadius: '0.875em' }}
          >
            {children}
          </span>
        </span>
      </span>
    </>
  );

  const interactiveClass = cn(
    'glow-button relative isolate block rounded-[17px] cursor-pointer border-0 bg-transparent p-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-4',
    disabled && 'pointer-events-none opacity-50',
    className,
  );

  return (
    <span className={cn('group relative isolate inline-block', glowLayers)}>
      {/* SVG colour-matrix filters used by the glow layers */}
      <svg aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter width="300%" x="-100%" height="300%" y="-100%" id={filters.unopaq}>
          <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 9 0" />
        </filter>
        <filter width="300%" x="-100%" height="300%" y="-100%" id={filters.unopaq2}>
          <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 3 0" />
        </filter>
        <filter width="300%" x="-100%" height="300%" y="-100%" id={filters.unopaq3}>
          <feColorMatrix values="1 0 0 0.2 0 0 1 0 0.2 0 0 0 1 0.2 0 0 0 0 2 0" />
        </filter>
      </svg>

      {href ? (
        <Link
          href={href}
          className={interactiveClass}
          onClick={onClick}
          aria-label={ariaLabel}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
        >
          <span className="relative isolate block">{surface}</span>
        </Link>
      ) : (
        <button
          type={type}
          className={interactiveClass}
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
        >
          <span className="relative isolate block">{surface}</span>
        </button>
      )}
    </span>
  );
}
