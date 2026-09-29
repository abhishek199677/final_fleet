import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Truck } from 'lucide-react';
import { LegalNav } from '@/components/legal/legal-nav';
import { CookiePreferencesButton } from '@/components/cookie-preferences-button';
import { BUSINESS, LEGAL_LINKS } from '@/lib/site-info';

export const metadata: Metadata = {
  title: {
    default: 'Fleet OS — Legal',
    template: '%s — Fleet OS',
  },
  description: 'Policies and terms for Fleet OS by Perceptiqx.',
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div
      style={{ colorScheme: 'light' }}
      className="flex min-h-screen flex-col bg-white text-gray-900"
    >
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gray-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-600">
              <Truck aria-hidden="true" className="h-4 w-4 text-white" />
            </span>
            <span className="text-sm font-bold tracking-tight text-gray-900">
              Fleet OS <span className="font-medium text-gray-500">· {BUSINESS.legalName}</span>
            </span>
          </Link>
          <LegalNav />
        </div>
      </header>

      <main id="content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="legal-doc mx-auto max-w-3xl">{children}</div>
      </main>

      <footer className="border-t border-gray-200 bg-gray-950">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-white">{BUSINESS.legalName}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Operator of {BUSINESS.productName}. {BUSINESS.registeredAddress}{' '}
              {BUSINESS.placeOfRegistration}
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Privacy enquiries:{' '}
              <span className="text-gray-300">{BUSINESS.privacyContact}</span>
            </p>
          </div>

          <nav aria-label="Legal">
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookiePreferencesButton className="text-gray-300 transition-colors hover:text-white focus-visible:ring-teal-500" />
              </li>
            </ul>
          </nav>

          <div className="text-sm text-gray-400 lg:text-right">
            <p>
              © {year} {BUSINESS.legalName}. All rights reserved.
            </p>
            <p className="mt-2">
              <Link
                href="/"
                className="text-gray-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Back to Fleet OS
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
