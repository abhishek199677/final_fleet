'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselItem {
  id: string | number;
  title?: string;
  description?: string;
  image?: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

interface CircularCarouselProps {
  items: CarouselItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
  itemClassName?: string;
  showDots?: boolean;
  showArrows?: boolean;
  visibleCount?: number;
  gap?: number;
}

export function CircularCarousel({
  items,
  autoPlay = true,
  autoPlayInterval = 4000,
  className,
  itemClassName,
  showDots = true,
  showArrows = true,
  visibleCount = 5,
  gap = 20,
}: CircularCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const totalItems = items.length;
  const halfVisible = Math.floor(visibleCount / 2);

  // Calculate visible items with circular wrapping
  const getVisibleItems = React.useCallback(() => {
    const result: Array<{ item: CarouselItem; offset: number; index: number }> = [];
    for (let i = -halfVisible; i <= halfVisible; i++) {
      const index = (activeIndex + i + totalItems) % totalItems;
      result.push({
        item: items[index],
        offset: i,
        index,
      });
    }
    return result;
  }, [activeIndex, totalItems, halfVisible, items]);

  // Navigation
  const goTo = React.useCallback(
    (index: number) => {
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    },
    [activeIndex]
  );

  const goNext = React.useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % totalItems);
  }, [totalItems]);

  const goPrev = React.useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  }, [totalItems]);

  // Auto-play
  React.useEffect(() => {
    if (!autoPlay || totalItems <= 1) return;
    const timer = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, goNext, totalItems]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [goNext, goPrev]);

  // Calculate arc positions
  const getArcStyle = (offset: number) => {
    const isActive = offset === 0;
    const absOffset = Math.abs(offset);

    // Scale: active card is largest, diminishes toward edges
    const scale = isActive ? 1 : Math.max(0.7, 1 - absOffset * 0.12);

    // Y position: active card at center, others arc upward/downward
    const yOffset = isActive ? 0 : -Math.abs(offset) * 8;

    // X position: distribute along curve
    const xStep = 100 / (halfVisible + 1);
    const xOffset = offset * xStep;

    // Rotation: slight tilt for depth
    const rotateY = isActive ? 0 : offset * -5;

    // Z-index: active on top
    const zIndex = isActive ? 10 : 5 - absOffset;

    // Opacity: fade toward edges
    const opacity = isActive ? 1 : Math.max(0.4, 1 - absOffset * 0.3);

    return {
      transform: `translateX(calc(-50% + ${xOffset}%)) translateY(${yOffset}px) scale(${scale}) perspective(1000px) rotateY(${rotateY}deg)`,
      zIndex,
      opacity,
    };
  };

  const visibleItems = getVisibleItems();

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center w-full py-8 outline-none',
        className
      )}
      tabIndex={0}
      role="region"
      aria-label="Circular carousel"
      aria-roledescription="carousel"
    >
      {/* Carousel track */}
      <div
        className="relative w-full h-[300px] overflow-visible"
        style={{ perspective: '1000px' }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {visibleItems.map(({ item, offset, index }) => (
            <motion.div
              key={`${item.id}-${offset}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: getArcStyle(offset).opacity,
                scale: getArcStyle(offset).transform.includes('scale(')
                  ? parseFloat(getArcStyle(offset).transform.match(/scale\(([^)]+)\)/)?.[1] || '1')
                  : 1,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className={cn(
                'absolute left-1/2 top-1/2 w-[240px] h-[280px]',
                '-ml-[120px] -mt-[140px]',
                'cursor-pointer',
                itemClassName
              )}
              style={{
                transform: getArcStyle(offset).transform,
                zIndex: getArcStyle(offset).zIndex,
              }}
              onClick={() => {
                if (offset !== 0) {
                  goTo(index);
                }
              }}
              whileHover={offset !== 0 ? { scale: 1.05 } : {}}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${totalItems}`}
            >
              <CarouselCard item={item} isActive={offset === 0} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {showArrows && totalItems > 1 && (
        <>
          <button
            onClick={goPrev}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 z-20',
              'w-12 h-12 rounded-full',
              'bg-white/10 backdrop-blur-md border border-white/20',
              'flex items-center justify-center',
              'text-white/80 hover:text-white hover:bg-white/20',
              'transition-all duration-300',
              'hover:scale-110 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-white/50'
            )}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goNext}
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2 z-20',
              'w-12 h-12 rounded-full',
              'bg-white/10 backdrop-blur-md border border-white/20',
              'flex items-center justify-center',
              'text-white/80 hover:text-white hover:bg-white/20',
              'transition-all duration-300',
              'hover:scale-110 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-white/50'
            )}
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && totalItems > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                'transition-all duration-300 rounded-full',
                'focus:outline-none focus:ring-2 focus:ring-white/50',
                index === activeIndex
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              )}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CarouselCardProps {
  item: CarouselItem;
  isActive: boolean;
}

function CarouselCard({ item, isActive }: CarouselCardProps) {
  return (
    <motion.div
      className={cn(
        'relative w-full h-full rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-zinc-800/90 to-zinc-900/90',
        'border border-white/10',
        'backdrop-blur-xl',
        'shadow-2xl',
        'transition-all duration-500',
        isActive
          ? 'ring-2 ring-white/30 shadow-white/10'
          : 'shadow-black/30'
      )}
      animate={{
        boxShadow: isActive
          ? '0 0 40px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.4)'
          : '0 10px 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Background image */}
      {item.image && (
        <div className="absolute inset-0">
          <img
            src={item.image}
            alt={item.title || ''}
            className={cn(
              'w-full h-full object-cover',
              'transition-all duration-500',
              isActive ? 'scale-100' : 'scale-110 blur-sm'
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
      )}

      {/* Icon fallback */}
      {!item.image && item.icon && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'transition-all duration-500',
            isActive ? 'text-white scale-110' : 'text-white/60 scale-100'
          )}>
            {item.icon}
          </div>
        </div>
      )}

      {/* Custom content */}
      {item.content && (
        <div className="absolute inset-0">
          {item.content}
        </div>
      )}

      {/* Content overlay */}
      {(item.title || item.description) && (
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {item.title && (
            <h3
              className={cn(
                'text-xl font-semibold text-white mb-2',
                'transition-all duration-500',
                isActive ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-2'
              )}
            >
              {item.title}
            </h3>
          )}
          {item.description && (
            <p
              className={cn(
                'text-sm text-white/70 line-clamp-2',
                'transition-all duration-500',
                isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              {item.description}
            </p>
          )}
        </div>
      )}

      {/* Metallic shine effect */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          'bg-gradient-to-br from-white/10 via-transparent to-transparent',
          'transition-opacity duration-500',
          isActive ? 'opacity-100' : 'opacity-0'
        )}
      />
    </motion.div>
  );
}

export type { CircularCarouselProps, CarouselItem };
