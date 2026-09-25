'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function Spotlight({
  className,
  fill = 'rgba(255, 255, 255, 0.15)',
}: {
  className?: string;
  fill?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = divRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500',
        className,
      )}
      style={{
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${fill}, transparent 40%)`,
        opacity,
      }}
    />
  );
}
