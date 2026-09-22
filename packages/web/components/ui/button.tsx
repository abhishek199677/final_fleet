'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 outline-none overflow-hidden group rounded-xl",
  {
    variants: {
      variant: {
        default:
          'border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:border-neutral-900 dark:hover:border-neutral-100',
        destructive:
          'border border-red-300 dark:border-red-600 bg-white dark:bg-neutral-900 text-red-700 dark:text-red-400 hover:border-red-600 dark:hover:border-red-400',
        outline:
          'border border-neutral-300 dark:border-neutral-600 bg-transparent text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-neutral-100',
        secondary:
          'border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-neutral-100',
        ghost:
          'border border-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800',
        link: 'text-neutral-900 dark:text-neutral-100 underline-offset-4 hover:underline bg-transparent border-none p-0 h-auto',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 rounded-lg px-3.5 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10 rounded-xl p-0',
        'icon-sm': 'h-8 w-8 rounded-lg p-0',
        'icon-xs': 'h-7 w-7 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  if (asChild) {
    return (
      <Slot
        className={cn(buttonVariants({ variant, size, className }))}
      >
        {props.children}
      </Slot>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* Slide-in fill overlay */}
      <span className="absolute inset-0 z-0 -translate-x-full rounded-[inherit] bg-neutral-900 dark:bg-neutral-100 transition-transform duration-300 ease-in-out group-hover:translate-x-0" />
      {/* Arrow icon */}
      <svg
        className="relative z-10 h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 transition-colors duration-300 group-hover:text-white dark:group-hover:text-black">
        {props.children}
      </span>
    </button>
  );
}

export { Button, buttonVariants }
export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }
