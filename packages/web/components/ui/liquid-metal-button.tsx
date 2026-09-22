'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const liquidMetalVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 outline-none overflow-hidden group",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-zinc-700 via-zinc-600 to-zinc-800 text-white border border-zinc-500/30',
        destructive:
          'bg-gradient-to-br from-red-900 via-red-800 to-red-950 text-white border border-red-500/30',
        outline:
          'bg-transparent border border-zinc-500/30 text-zinc-100',
        secondary:
          'bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900 text-zinc-100 border border-zinc-600/30',
        ghost:
          'bg-transparent text-zinc-100 border border-transparent hover:bg-zinc-800/50',
        link: 'text-zinc-100 underline-offset-4 hover:underline bg-transparent border-none p-0 h-auto',
      },
      size: {
        default: 'h-10 px-5 py-2.5 rounded-xl',
        sm: 'h-8 rounded-lg px-3.5 text-xs',
        lg: 'h-12 rounded-xl px-7 text-base',
        icon: 'h-10 w-10 rounded-xl p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type LiquidMetalButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof liquidMetalVariants> & {
    asChild?: boolean;
  };

const LiquidMetalButton = React.forwardRef<HTMLButtonElement, LiquidMetalButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const [mousePosition, setMousePosition] = React.useState({ x: 50, y: 50 });
    const [isPressed, setIsPressed] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosition({ x, y });
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => {
      setIsHovered(false);
      setIsPressed(false);
      setMousePosition({ x: 50, y: 50 });
    };

    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        (buttonRef).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    return (
      <Comp
        ref={mergedRef}
        className={cn(liquidMetalVariants({ variant, size, className }))}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isPressed ? 'scale(0.97)' : isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
        {...props}
      >
        {/* Metallic shimmer layer */}
        <div
          className="absolute inset-0 z-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.05) 40%, transparent 60%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Liquid metal edge glow */}
        <div
          className="absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(180,180,220,0.5) 0%, rgba(120,120,180,0.3) 30%, transparent 60%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Top highlight bar */}
        <div
          className="absolute top-0 left-0 right-0 z-0 h-[1px] opacity-60"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 80%, transparent 100%)',
          }}
        />

        {/* Bottom highlight bar */}
        <div
          className="absolute bottom-0 left-0 right-0 z-0 h-[1px] opacity-40"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 80%, transparent 100%)',
          }}
        />

        {/* Liquid ripple effect */}
        <div
          className="absolute inset-0 z-0 rounded-[inherit] transition-all duration-300"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
            transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          }}
        />

        {/* Metallic border glow */}
        <div
          className="absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-500"
          style={{
            boxShadow: `
              inset 0 0 20px rgba(180,180,220,0.3),
              0 0 20px rgba(180,180,220,0.2),
              0 0 40px rgba(120,120,180,0.1)
            `,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </Comp>
    );
  }
);

LiquidMetalButton.displayName = 'LiquidMetalButton';

export { LiquidMetalButton, liquidMetalVariants };
export type { LiquidMetalButtonProps };
