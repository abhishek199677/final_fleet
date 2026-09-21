'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
          'placeholder:text-gray-400',
          'transition-all duration-fast',
          'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
