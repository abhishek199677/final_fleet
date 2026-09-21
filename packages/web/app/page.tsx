'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowRight, BarChart3, Shield, Zap, Globe, Users, CheckCircle2,
  Truck, Clock, FileText, ChevronRight, Building2, TrendingUp,
} from 'lucide-react';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Real-time Fleet Intelligence',
    desc: 'Live dashboards show utilisation, billing, and maintenance across every machine — by the hour.',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    desc: 'Row-level tenant isolation, append-only records, and role-based access enforced at the database level.',
  },
  {
    icon: Zap,
    title: 'Automated Billing Engine',
    desc: 'Hourly, daily, and monthly rate strategies with automatic invoice generation and receivable tracking.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency & Multi-Site',
    desc: 'Any ISO currency, per-row FX rates, and unlimited site deployments across geographies.',
  },
  {
    icon: Clock,
    title: 'Maintenance Predictive Alerts',
    desc: 'Meter-interval and calendar-interval tasks with alerts before failure — never miss a service.',
  },
  {
    icon: FileText,
    title: 'Photo Evidence & OCR',
    desc: 'Camera capture with automatic meter reading verification. Audit-ready documentation.',
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

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
      </div>
    );
  }

  if (user) {
    const href = user.role === 'ops' ? '/today' : '/home';
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 shadow-lg shadow-brand-600/20">
              <Truck className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fleet OS</h1>
          <p className="text-gray-500">Welcome back, {user.email}</p>
          <Link
            href={href}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-sm font-semibold text-white shadow-md shadow-brand-700/20 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-600/25"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">Fleet OS</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">Features</a>
            <a href="#security" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">Security</a>
            <a href="#metrics" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">Performance</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 to-white" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
              <Zap className="h-3.5 w-3.5" />
              Built for heavy-equipment operators
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Know your fleet.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent">
                Bill with confidence.
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-500 sm:text-xl">
              Fleet OS gives equipment operators real-time visibility into daily work, billing,
              cash flow, and maintenance — without spreadsheets or manual data entry.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-8 text-base font-semibold text-white shadow-lg shadow-brand-700/25 transition-all hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-600/30 hover:-translate-y-0.5"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-8 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400"
              >
                Sign in to existing account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-gray-100 bg-gray-25 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider">
            Trusted by leading equipment operators
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {LOGOS.map((name) => (
              <div key={name} className="flex items-center gap-2 text-gray-300">
                <Building2 className="h-5 w-5" />
                <span className="text-sm font-semibold">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {METRICS.map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-3xl font-bold tracking-tight text-brand-700 sm:text-4xl">{m.value}</p>
                <p className="mt-2 text-sm text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-gray-100 bg-gray-25 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to run your fleet
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              From daily work logging to monthly billing — one platform, zero spreadsheets.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-xs transition-all hover:shadow-md hover:border-gray-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20">
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
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span className="text-sm text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Tenant Isolation</p>
                      <p className="text-xs text-gray-500">RLS enforced on every table</p>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <Lock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Finance Data Isolation</p>
                      <p className="text-xs text-gray-500">Operations cannot access billing</p>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Append-Only Records</p>
                      <p className="text-xs text-gray-500">No deletes, only corrections</p>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 bg-gradient-to-b from-brand-50 to-white py-20">
        <div className="mx-auto max-w-3xl text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ready to take control of your fleet?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Start your free trial today. No credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-8 text-base font-semibold text-white shadow-lg shadow-brand-700/25 transition-all hover:bg-brand-600 hover:shadow-xl hover:-translate-y-0.5"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
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

function Lock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
