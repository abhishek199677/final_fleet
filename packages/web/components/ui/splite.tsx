'use client';

import Spline from '@splinetool/react-spline';
import { cn } from '@/lib/utils';

export default function SplineScene({ scene, className }: { scene: string; className?: string }) {
  return (
    <div className={cn('h-full w-full', className)}>
      <Spline scene={scene} />
    </div>
  );
}
