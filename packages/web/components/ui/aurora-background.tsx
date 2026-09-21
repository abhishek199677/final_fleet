'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  /** Show radial gradient overlays */
  showRadials?: boolean;
  /** Show grid pattern */
  showGrid?: boolean;
  /** Aurora color 1 */
  color1?: string;
  /** Aurora color 2 */
  color2?: string;
  /** Aurora color 3 */
  color3?: string;
}

export function AuroraBackground({
  children,
  className,
  showRadials = true,
  showGrid = true,
  color1 = 'hsla(260, 60%, 20%, 0.5)',
  color2 = 'hsla(220, 50%, 15%, 0.4)',
  color3 = 'hsla(280, 40%, 10%, 0.3)',
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-hidden',
        'bg-zinc-950',
        className
      )}
    >
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, 
              hsl(240, 10%, 3%) 0%, 
              hsl(240, 15%, 6%) 50%, 
              hsl(240, 10%, 4%) 100%
            )
          `,
        }}
      />

      {/* Animated aurora orbs */}
      {showRadials && (
        <div className="absolute inset-0">
          {/* Top-left aurora */}
          <div
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-aurora1"
            style={{
              background: `radial-gradient(circle, ${color1} 0%, transparent 70%)`,
            }}
          />

          {/* Center-right aurora */}
          <div
            className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-aurora2"
            style={{
              background: `radial-gradient(circle, ${color2} 0%, transparent 70%)`,
            }}
          />

          {/* Bottom-center aurora */}
          <div
            className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full blur-[80px] animate-aurora3"
            style={{
              background: `radial-gradient(circle, ${color3} 0%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {/* Grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes aurora1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.5;
          }
          33% {
            transform: translate(5%, 5%) scale(1.1);
            opacity: 0.7;
          }
          66% {
            transform: translate(-3%, 2%) scale(0.95);
            opacity: 0.4;
          }
        }
        @keyframes aurora2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.4;
          }
          33% {
            transform: translate(-5%, -3%) scale(1.05);
            opacity: 0.6;
          }
          66% {
            transform: translate(3%, -5%) scale(0.9);
            opacity: 0.5;
          }
        }
        @keyframes aurora3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(8%, -4%) scale(1.15);
            opacity: 0.5;
          }
        }
        .animate-aurora1 {
          animation: aurora1 12s ease-in-out infinite;
        }
        .animate-aurora2 {
          animation: aurora2 15s ease-in-out infinite;
          animation-delay: -5s;
        }
        .animate-aurora3 {
          animation: aurora3 10s ease-in-out infinite;
          animation-delay: -3s;
        }
      `}</style>
    </div>
  );
}

export type { AuroraBackgroundProps };
