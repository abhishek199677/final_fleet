'use client';

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LiquidButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LiquidButton({ children, className, onClick, href, size = 'md' }: LiquidButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState({ x: 50, y: 50, opacity: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setShine({ x, y });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setRipple({ x, y, opacity: 0.4 });
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    setTimeout(() => setRipple((r) => ({ ...r, opacity: 0 })), 150);
  };

  const sizeClasses = {
    sm: 'h-9 px-4 text-sm rounded-lg',
    md: 'h-12 px-6 text-base rounded-xl',
    lg: 'h-14 px-8 text-lg rounded-2xl',
  };

  const inner = (
    <div
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setIsPressed(false); setRipple((r) => ({ ...r, opacity: 0 })); }}
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2',
        'font-semibold text-white no-underline cursor-pointer',
        'transition-all duration-300 ease-out',
        'active:scale-[0.97]',
        isPressed && 'scale-[0.97]',
        sizeClasses[size],
        className,
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(120,120,180,0.3) 0%, rgba(80,80,140,0.2) 50%, rgba(120,120,180,0.3) 100%)',
        border: '1px solid rgba(180,180,220,0.4)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: `
          inset 0 1px 1px rgba(255,255,255,0.25),
          inset 0 -1px 1px rgba(255,255,255,0.05),
          0 4px 16px rgba(0,0,0,0.15),
          0 1px 3px rgba(0,0,0,0.1),
          0 0 20px rgba(180,180,220,0.1)
        `,
        overflow: 'hidden',
      }}
    >
      {/* Liquid metal shimmer — follows cursor */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)`,
          opacity: 1,
        }}
      />

      {/* Liquid metal edge glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(180,180,220,0.5) 0%, rgba(120,120,180,0.3) 40%, transparent 70%)`,
        }}
      />

      {/* Top highlight bar */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 z-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 80%, transparent 100%)',
        }}
      />

      {/* Bottom highlight bar */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-[1px] opacity-40"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 80%, transparent 100%)',
        }}
      />

      {/* Ripple on click */}
      <div
        className="pointer-events-none absolute z-0 rounded-full transition-opacity duration-300"
        style={{
          left: `${ripple.x}%`,
          top: `${ripple.y}%`,
          width: '200%',
          height: '200%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)',
          opacity: ripple.opacity,
        }}
      />

      {/* Metallic border glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: `
            inset 0 0 20px rgba(180,180,220,0.3),
            0 0 20px rgba(180,180,220,0.2),
            0 0 40px rgba(120,120,180,0.1)
          `,
        }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {inner}
      </Link>
    );
  }

  return inner;
}
