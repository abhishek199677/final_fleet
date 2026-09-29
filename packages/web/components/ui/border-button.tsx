'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export type BorderButtonTone = 'amber' | 'destructive';
/**
 * `auto` follows the page theme (light page = dark outline, dark page = white
 * outline). Use `on-dark` / `on-light` when the surrounding surface is fixed,
 * e.g. the always-dark sign-in panel or the always-light landing nav.
 */
export type BorderButtonAppearance = 'auto' | 'on-dark' | 'on-light';
export type BorderButtonSize = 'md' | 'sm' | 'full';

interface BorderButtonProps {
  children?: React.ReactNode;
  className?: string;
  tone?: BorderButtonTone;
  appearance?: BorderButtonAppearance;
  size?: BorderButtonSize;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Swaps the label for "Working…" semantics via aria-busy. */
  loading?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Needed when the button submits a form it isn't nested in. */
  form?: string;
  title?: string;
  'aria-label'?: string;
}

const SIZES: Record<BorderButtonSize, string> = {
  md: 'w-[9.3rem] h-12 text-sm',
  sm: 'h-8 px-3 gap-1.5 text-xs',
  full: 'w-full h-12 text-sm',
};

/** Outlined pill with an amber (or red, when destructive) accent dot. */
export function BorderButton({
  children,
  className,
  tone = 'amber',
  appearance = 'auto',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  form,
  title,
  'aria-label': ariaLabel,
}: BorderButtonProps): React.JSX.Element {
  const [isPressed, setIsPressed] = useState(false);

  const destructive = tone === 'destructive';

  /* Exactly one text-colour utility per state so nothing competes:
     base colour lives here, hover colour is added only for destructive tone. */
  const outline =
    appearance === 'on-dark'
      ? cn(
          'border-white/70 text-white hover:border-white',
          destructive && 'hover:border-red-400 hover:text-red-400',
        )
      : appearance === 'on-light'
        ? cn(
            'border-gray-900/70 text-gray-900 hover:border-gray-900',
            destructive && 'hover:border-red-600 hover:text-red-600',
          )
        : cn(
            'border-gray-900/70 text-gray-900 hover:border-gray-900',
            'dark:border-white/70 dark:text-white dark:hover:border-white',
            destructive &&
              'hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400',
          );

  const dot =
    tone === 'destructive'
      ? 'bg-red-500 dark:bg-red-400 group-hover:bg-red-400'
      : 'bg-amber-500 dark:bg-amber-200 group-hover:bg-amber-300';

  const sheen =
    appearance === 'on-light'
      ? 'before:via-gray-900/5'
      : appearance === 'auto'
        ? 'before:via-gray-900/5 dark:before:via-white/10'
        : 'before:via-white/10';

  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      title={title}
      aria-label={ariaLabel}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        'group relative inline-flex items-center justify-center overflow-hidden rounded-full border-2',
        'transition-all duration-500 ease-out backdrop-blur-sm',
        'cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        'active:scale-95',
        SIZES[size],
        outline,
        sheen,
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:to-transparent',
        'before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {/* Hover glow */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          destructive
            ? 'from-red-200/0 via-red-200/20 to-red-200/0'
            : 'from-amber-200/0 via-amber-200/15 to-amber-200/0',
        )}
      />

      {/* Label */}
      <span className="relative z-10 whitespace-nowrap">
        {loading ? 'Working…' : children}
      </span>

      {/* Accent dot */}
      <span
        aria-hidden="true"
        className={cn(
          'relative z-10 block w-4 h-4 rounded-full transition-all duration-500 ease-out',
          isPressed ? 'scale-90' : 'group-hover:scale-110',
          dot,
        )}
      >
        <span
          className={cn(
            'absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-60',
            'animate-ping motion-reduce:animate-none',
            destructive ? 'bg-red-400' : 'bg-amber-300',
          )}
        />
      </span>
    </button>
  );
}
