import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-gray-900 text-white shadow-xs hover:bg-gray-800 focus-visible:ring-gray-900',
        primary: 'bg-brand-700 text-white shadow-xs shadow-brand-700/20 hover:bg-brand-600 focus-visible:ring-brand-700',
        destructive: 'bg-red-600 text-white shadow-xs hover:bg-red-500 focus-visible:ring-red-600',
        outline: 'border border-gray-300 bg-white text-gray-700 shadow-xs hover:bg-gray-50 focus-visible:ring-gray-400',
        secondary: 'bg-gray-100 text-gray-900 shadow-xs hover:bg-gray-200 focus-visible:ring-gray-400',
        ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
        link: 'text-brand-700 underline-offset-4 hover:underline focus-visible:ring-brand-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6',
        xl: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
