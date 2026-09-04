'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type RevealProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Delay locked to motion tokens (0 | 1 | 2 steps of --fleet-motion-fast). */
  delay?: 0 | 1 | 2;
  as?: 'div' | 'section' | 'li';
};

/**
 * Reveal — IntersectionObserver scroll reveal, Chat Bucket ease-out.
 * Respects prefers-reduced-motion (CSS forces visible). Content is always
 * in the DOM (no display:none) so AT/keyboard users are never blocked.
 */
export function Reveal({ className, delay = 0, as = 'div', children, ...props }: RevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as 'div';

  return (
    <Tag
      ref={ref}
      data-in={inView ? 'true' : 'false'}
      data-testid="fleet-reveal"
      className={cn('fleet-reveal', className)}
      style={{ transitionDelay: delay ? `${delay * 100}ms` : undefined, ...props.style }}
      {...props}
    >
      {children}
    </Tag>
  );
}
