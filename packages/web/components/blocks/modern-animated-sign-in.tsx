'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PasswordInput } from '@/components/password-input';

/* ============================================
   RIPPLE — Animated concentric circles
   ============================================ */
interface RippleProps {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export function Ripple({
  mainCircleSize = 100,
  mainCircleOpacity = 0.24,
  numCircles = 8,
}: RippleProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: mainCircleSize * 2.5,
          height: mainCircleSize * 2.5,
        }}
      >
        {Array.from({ length: numCircles }).map((_, i) => {
          const size = mainCircleSize * 2 + i * (mainCircleSize * 0.8);
          const opacity = mainCircleOpacity * (1 - i * 0.1);
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]"
              style={{
                width: size,
                height: size,
                opacity,
                animation: `ripple-pulse ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ============================================
   TECH ORBIT DISPLAY — Rotating icons in orbit
   ============================================ */
interface OrbitIcon {
  component: () => ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
}

interface TechOrbitDisplayProps {
  iconsArray: OrbitIcon[];
  orbits?: number;
}

export function TechOrbitDisplay({ iconsArray, orbits = 3 }: TechOrbitDisplayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: orbits }).map((_, i) => {
        const radius = 100 + i * 65;
        return (
          <div
            key={i}
            className="absolute rounded-full border border-white/[0.06]"
            style={{
              width: radius * 2,
              height: radius * 2,
            }}
          />
        );
      })}
      {iconsArray.map((icon, i) => (
        <OrbitItem key={i} icon={icon} />
      ))}
    </div>
  );
}

function OrbitItem({ icon }: { icon: OrbitIcon }) {
  const radius = icon.radius ?? 150;
  const duration = icon.duration ?? 20;
  const delay = icon.delay ?? 0;
  const reverse = icon.reverse ?? false;
  const [angle, setAngle] = useState(delay * 1.5);
  const [mounted, setMounted] = useState(false);
  const animRef = useRef<number>(0);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    const tick = (time: number) => {
      if (lastTime.current === 0) lastTime.current = time;
      const delta = (time - lastTime.current) / 1000;
      lastTime.current = time;
      setAngle((prev) => {
        const speed = 360 / duration;
        const next = prev + (reverse ? -speed * delta : speed * delta);
        return next % 360;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [duration, reverse]);

  const rad = (angle * Math.PI) / 180;
  // Pre-round to 3 decimal places so server SSR truncation and client
  // render identical strings, avoiding a hydration mismatch.
  const x = Math.round(Math.cos(rad) * radius * 1000) / 1000;
  const y = Math.round(Math.sin(rad) * radius * 1000) / 1000;

  return (
    <div
      className="absolute"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: mounted ? undefined : 'none',
      }}
    >
      <div className={icon.className}>
        {icon.component()}
      </div>
    </div>
  );
}

/* ============================================
   AUTH TABS — Login / Sign up form
   ============================================ */
interface AuthField {
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface AuthFormFields {
  login: {
    header: string;
    subHeader: string;
    fields: AuthField[];
    submitButton: string;
    textVariantButton?: string;
  };
  signup: {
    header: string;
    subHeader: string;
    fields: AuthField[];
    submitButton: string;
    textVariantButton?: string;
  };
}

interface AuthTabsProps {
  formFields: AuthFormFields;
  goTo?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  defaultTab?: 'login' | 'signup';
}

export function AuthTabs({ formFields, goTo, handleSubmit, defaultTab = 'login' }: AuthTabsProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);
  const current = formFields[activeTab];

  return (
    <div className="w-full max-w-[380px]">
      {/* Logo (mobile) */}
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
          <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
            <circle cx="17" cy="18" r="2" />
            <circle cx="7" cy="18" r="2" />
          </svg>
        </div>
        <span className="text-xl font-bold text-white">FleetOS</span>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex items-center gap-1 rounded-full bg-white/[0.08] p-1 backdrop-blur-sm">
        {(['login', 'signup'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'relative flex-1 rounded-full py-2.5 text-sm font-medium transition-all duration-300',
              activeTab === tab
                ? 'text-white'
                : 'text-white/40 hover:text-white/60',
            )}
          >
            {activeTab === tab && (
              <div className="absolute inset-0 rounded-full bg-white/[0.12] shadow-sm" />
            )}
            <span className="relative z-10">{tab === 'login' ? 'Log in' : 'Sign up'}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <div>
        <h2 className="text-2xl font-bold text-white">{current.header}</h2>
        <p className="mt-2 text-sm text-white/50">{current.subHeader}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {current.fields.map((field) => (
            <div key={field.label} className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                {field.label}
              </label>
              {field.type === 'password' ? (
                <PasswordInput
                  placeholder={field.placeholder}
                  required={field.required}
                  onChange={field.onChange}
                  inputClassName={cn(
                    'h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 pe-11',
                    'text-sm text-white placeholder:text-white/25',
                    'outline-none transition-all duration-200',
                    'focus:border-white/20 focus:bg-white/[0.08] focus:ring-2 focus:ring-white/[0.06]',
                  )}
                />
              ) : (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                  onChange={field.onChange}
                  className={cn(
                    'h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4',
                    'text-sm text-white placeholder:text-white/25',
                    'outline-none transition-all duration-200',
                    'focus:border-white/20 focus:bg-white/[0.08] focus:ring-2 focus:ring-white/[0.06]',
                  )}
                />
              )}
            </div>
          ))}

          {activeTab === 'login' && current.textVariantButton && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={goTo}
                className="text-xs font-medium text-white/40 transition-colors hover:text-white/70"
              >
                {current.textVariantButton}
              </button>
            </div>
          )}

          <button
            type="submit"
            className={cn(
              'group relative h-12 w-full overflow-hidden rounded-xl',
              'border border-white/20 bg-white text-sm font-semibold text-gray-900',
              'transition-all duration-300',
              'hover:border-transparent',
            )}
          >
            {/* Slide-in fill overlay */}
            <span className="absolute inset-0 z-0 -translate-x-full rounded-[inherit] bg-neutral-900 transition-transform duration-300 ease-in-out group-hover:translate-x-0" />
            <span className="relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 group-hover:text-white">
              {current.submitButton}
              <svg
                className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
        </form>

        {activeTab === 'signup' && (
          <p className="mt-6 text-center text-xs text-white/30">
            By signing up, you agree to our{' '}
            <span className="text-white/50 hover:text-white/70 cursor-pointer">Terms</span>
            {' '}and{' '}
            <span className="text-white/50 hover:text-white/70 cursor-pointer">Privacy Policy</span>
          </p>
        )}
      </div>
    </div>
  );
}
