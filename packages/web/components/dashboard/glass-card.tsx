'use client';

import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/18 bg-white/72 p-5',
        'shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl',
        'transition-all duration-300',
        hover && 'hover:bg-white/82 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}
