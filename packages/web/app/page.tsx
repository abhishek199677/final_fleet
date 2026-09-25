'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowRight, BarChart3, Shield, Zap, Globe, CheckCircle2,
  Truck, Clock, FileText, Building2,
} from 'lucide-react';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import InteractiveListPreview from '@/components/ui/interactive-list-preview';
import dynamic from 'next/dynamic';

// The Orbit hero boots a WebGL canvas and reads browser-only APIs, so skip SSR.
const OrbitDeliveryHero = dynamic(
  () => import('@/components/ui/orbit-delivery-hero'),
  { ssr: false },
);

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Real-time Fleet Intelligence',
    desc: 'Live dashboards show utilisation, billing, and maintenance across every machine — by the hour.',
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    desc: 'Row-level tenant isolation, append-only records, and role-based access enforced at the database level.',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Zap,
    title: 'Automated Billing Engine',
    desc: 'Hourly, daily, and monthly rate strategies with automatic invoice generation and receivable tracking.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Globe,
    title: 'Multi-Currency & Multi-Site',
    desc: 'Any ISO currency, per-row FX rates, and unlimited site deployments across geographies.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Clock,
    title: 'Maintenance Predictive Alerts',
    desc: 'Meter-interval and calendar-interval tasks with alerts before failure — never miss a service.',
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    icon: FileText,
    title: 'Photo Evidence & OCR',
    desc: 'Camera capture with automatic meter reading verification. Audit-ready documentation.',
    gradient: 'from-cyan-500 to-sky-500',
  },
];

const METRICS = [
  { value: '90%+', label: 'Same-day logging compliance' },
  { value: '<2s', label: 'Owner home on 3G' },
  { value: '100%', label: 'Append-only audit trail' },
  { value: '99.5%', label: 'Uptime SLA (commercial)' },
];

const LOGOS = [
  'Caterpillar', 'Komatsu', 'Volvo CE', 'Hitachi', 'Liebherr', 'JCB',
];

// Story dialogs owned by the Orbit hero; opened from the sticky nav below.
const ORBIT_STORIES = ['How it works', 'For business', 'Our story'] as const;

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [orbitStory, setOrbitStory] = useState<string | null>(null);
  const [heroOpacity, setHeroOpacity] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const opacity = 1 - Math.min(Math.max((scrollY - 80) / 350, 0), 1);
      setHeroOpacity(opacity);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) {
    return (
      <div style={{ colorScheme: 'light' }} className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
      </div>
    );
  }

  if (user) {
    const href = user.role === 'ops' ? '/today' : '/home';
    return (
      <div style={{ colorScheme: 'light' }} className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 shadow-lg shadow-teal-600/30">
              <Truck className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fleet OS</h1>
          <p className="text-gray-500">Welcome back, {user.email}</p>
          <Link
            href={href}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition-all hover:from-teal-500 hover:to-emerald-500 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ colorScheme: 'light' }} className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 shadow-md shadow-teal-600/20">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">Fleet OS</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-900 transition-colors hover:text-teal-600">Features</a>
            <a href="#security" className="text-sm font-medium text-gray-900 transition-colors hover:text-teal-600">Security</a>
            <a href="#metrics" className="text-sm font-medium text-gray-900 transition-colors hover:text-teal-600">Performance</a>
            {ORBIT_STORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setOrbitStory(item)}
                className="cursor-pointer text-sm font-medium text-gray-900 transition-colors hover:text-teal-600"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-gray-900 transition-all hover:text-teal-600 hover:bg-gray-100/80"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — Orbit Delivery interactive 3D hero — fades on scroll */}
      <div
        className="landing-hero transition-opacity duration-300 ease-out"
        style={{ opacity: heroOpacity }}
      >
        <OrbitDeliveryHero
          theme="auto"
          story={orbitStory}
          onStoryChange={setOrbitStory}
        />
      </div>

      {/* Social proof */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Trusted by leading equipment operators
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {LOGOS.map((name) => (
              <div key={name} className="flex items-center gap-2 text-gray-300 transition-colors hover:text-gray-400">
                <Building2 className="h-5 w-5" />
                <span className="text-sm font-semibold tracking-tight">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="py-20 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {METRICS.map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{m.value}</p>
                <p className="mt-2 text-sm text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to run your fleet
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              From daily work logging to monthly billing — one platform, zero spreadsheets.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-gray-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-300/80 hover:-translate-y-1"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-lg transition-shadow duration-300 group-hover:shadow-xl`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive fleet list preview */}
      <section id="fleet" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Every machine, one live list
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Hover any machine to preview what Fleet OS tracks — from hour meters to invoices.
            </p>
          </div>
          <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-2xl border border-black/10 shadow-2xl shadow-gray-900/10">
            <InteractiveListPreview />
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Enterprise-grade security, built in
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Your data is isolated at the database level with row-level security.
                Every record is append-only with a complete audit trail.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'PostgreSQL Row-Level Security per tenant',
                  'Three database roles: Owner, Operations, Platform',
                  'Append-only records — corrections create audit entries',
                  'Photos immutable with SHA-256 verification',
                  'SOC 2-ready architecture',
                  'Multi-factor authentication for admins',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                    </div>
                    <span className="text-sm text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Tenant Isolation</p>
                      <p className="text-xs text-gray-500">RLS enforced on every table</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                      <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Finance Data Isolation</p>
                      <p className="text-xs text-gray-500">Operations cannot access billing</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Append-Only Records</p>
                      <p className="text-xs text-gray-500">No deletes, only corrections</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900" />
        <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-teal-500/15 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="relative mx-auto max-w-3xl text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to take control of your fleet?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Start your free trial today. No credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <InteractiveHoverButton className="!bg-white dark:!bg-neutral-900 !border-white/20 !text-gray-900 dark:!text-white !px-8 !py-3.5 !text-base !rounded-xl hover:!bg-neutral-900 hover:!text-white dark:hover:!bg-white dark:hover:!text-black">
              <Link href="/register">Start free trial</Link>
            </InteractiveHoverButton>
            <InteractiveHoverButton className="!bg-white/[0.04] !border-white/12 !text-white !px-8 !py-3.5 !text-base !rounded-xl">
              <Link href="/login">Sign in to existing account</Link>
            </InteractiveHoverButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
                <Truck className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Fleet OS</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2026 Perceptiqx. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
