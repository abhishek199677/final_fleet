'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CosmicBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  /** Number of animated orbs */
  orbCount?: number;
  /** Show grid overlay */
  showGrid?: boolean;
  /** Show star particles */
  showStars?: boolean;
  /** Show grain/noise texture */
  showGrain?: boolean;
  /** Base color hue (0-360) */
  hue?: number;
  /** Animation speed multiplier */
  speed?: number;
}

export function CosmicBackground({
  children,
  className,
  orbCount = 4,
  showGrid = true,
  showStars = true,
  showGrain = true,
  hue = 250,
  speed = 1,
}: CosmicBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Generate stars
  React.useEffect(() => {
    if (!showStars || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create stars
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      opacity: number;
      twinkleSpeed: number;
      twinkleOffset: number;
    }> = [];

    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    let animationFrame: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016 * speed;

      stars.forEach((star) => {
        const twinkle =
          Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [showStars, speed]);

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
            radial-gradient(ellipse at 50% 0%, hsla(${hue}, 60%, 15%, 1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 50%, hsla(${hue + 30}, 50%, 10%, 1) 0%, transparent 40%),
            radial-gradient(ellipse at 20% 80%, hsla(${hue - 30}, 40%, 8%, 1) 0%, transparent 40%),
            linear-gradient(to bottom, hsl(240, 10%, 3%) 0%, hsl(240, 10%, 5%) 100%)
          `,
        }}
      />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0">
        {Array.from({ length: orbCount }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-[100px] animate-float"
            style={{
              width: `${300 + i * 100}px`,
              height: `${300 + i * 100}px`,
              left: `${10 + (i * 60) / orbCount}%`,
              top: `${20 + (i * 40) / orbCount}%`,
              background: `radial-gradient(circle, hsla(${hue + i * 30}, 60%, 30%, 0.3) 0%, transparent 70%)`,
              animation: `float${i % 2 === 0 ? '' : 'Reverse'} ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * -2}s`,
            }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      )}

      {/* Star canvas */}
      {showStars && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      )}

      {/* Grain/noise texture */}
      {showGrain && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.05);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.95);
          }
        }
        @keyframes floatReverse {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-30px, 30px) scale(1.05);
          }
          66% {
            transform: translate(20px, -20px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}

export type { CosmicBackgroundProps };
