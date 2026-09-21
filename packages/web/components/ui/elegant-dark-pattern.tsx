'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ElegantDarkPatternProps {
  children?: React.ReactNode;
  className?: string;
  /** Show mesh gradient overlay */
  showMesh?: boolean;
  /** Show dot pattern */
  showDots?: boolean;
  /** Show radial highlights */
  showRadials?: boolean;
  /** Show noise/grain texture */
  showGrain?: boolean;
}

export function ElegantDarkPattern({
  children,
  className,
  showMesh = true,
  showDots = true,
  showRadials = true,
  showGrain = true,
}: ElegantDarkPatternProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-hidden',
        className
      )}
    >
      {/* Base dark gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, 
              #09090b 0%, 
              #0a0a0c 25%,
              #0d0d10 50%,
              #0a0a0c 75%,
              #09090b 100%
            )
          `,
        }}
      />

      {/* Mesh gradient overlay — sophisticated color blending */}
      {showMesh && (
        <div className="absolute inset-0">
          {/* Top-left mesh blob */}
          <div
            className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
              filter: 'blur(80px)',
            }}
          />

          {/* Top-right mesh blob */}
          <div
            className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 60%)',
              filter: 'blur(70px)',
            }}
          />

          {/* Center mesh blob */}
          <div
            className="absolute top-[30%] left-[20%] w-[60%] h-[40%] rounded-full"
            style={{
              background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.04) 0%, transparent 50%)',
              filter: 'blur(100px)',
            }}
          />

          {/* Bottom-left mesh blob */}
          <div
            className="absolute -bottom-[10%] -left-[5%] w-[45%] h-[45%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 60%)',
              filter: 'blur(75px)',
            }}
          />

          {/* Bottom-right mesh blob */}
          <div
            className="absolute -bottom-[15%] -right-[10%] w-[50%] h-[50%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 60%)',
              filter: 'blur(80px)',
            }}
          />
        </div>
      )}

      {/* Radial highlights — subtle light accents */}
      {showRadials && (
        <div className="absolute inset-0">
          {/* Primary highlight — top center */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[40%]"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
            }}
          />

          {/* Secondary highlight — center */}
          <div
            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[30%]"
            style={{
              background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.015) 0%, transparent 50%)',
            }}
          />
        </div>
      )}

      {/* Dot pattern — subtle texture */}
      {showDots && (
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {/* Noise/grain texture */}
      {showGrain && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
          }}
        />
      )}

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export type { ElegantDarkPatternProps };
