'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type GlareCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Set data-hot on touch so the glare stays visible briefly for touch users. */
  touchHoldMs?: number;
};

/**
 * GlareCard — Chat Bucket specular highlight wrapper.
 * Pointer: mousemove sets --gx/--gy. Touch: touchmove sets same + data-hot.
 * Keyboard: :focus-visible shows centred glare via CSS (tabIndex 0 when interactive).
 * Loading: pair with .fleet-shimmer + aria-busy. Error: use aria-invalid + role=alert outside.
 */
export const GlareCard = React.forwardRef<HTMLDivElement, GlareCardProps>(
  ({ className, touchHoldMs = 900, onMouseMove, onTouchMove, ...props }, ref) => {
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const hotTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const setRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );

    React.useEffect(
      () => () => {
        if (hotTimer.current) clearTimeout(hotTimer.current);
      },
      [],
    );

    const setGlare = (clientX: number, clientY: number) => {
      const el = innerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gx = ((clientX - r.left) / Math.max(r.width, 1)) * 100;
      const gy = ((clientY - r.top) / Math.max(r.height, 1)) * 100;
      el.style.setProperty('--gx', `${gx.toFixed(1)}%`);
      el.style.setProperty('--gy', `${gy.toFixed(1)}%`);
    };

    return (
      <div
        ref={setRef}
        className={cn('fleet-glare', className)}
        onMouseMove={(e) => {
          setGlare(e.clientX, e.clientY);
          onMouseMove?.(e);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) setGlare(t.clientX, t.clientY);
          const el = innerRef.current;
          if (el) {
            el.dataset.hot = 'true';
            if (hotTimer.current) clearTimeout(hotTimer.current);
            hotTimer.current = setTimeout(() => {
              if (innerRef.current) innerRef.current.dataset.hot = 'false';
            }, touchHoldMs);
          }
          onTouchMove?.(e);
        }}
        {...props}
      />
    );
  },
);
GlareCard.displayName = 'GlareCard';
