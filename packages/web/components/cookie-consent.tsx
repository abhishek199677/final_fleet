'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import {
  COOKIE_PREFERENCES_EVENT,
  readConsent,
  saveConsent,
} from '@/lib/cookie-consent';

type BannerMode = 'hidden' | 'banner' | 'preferences';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2';

const secondaryButton = `rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 ${focusRing}`;

const primaryButton = `rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 ${focusRing}`;

/**
 * First-party cookie consent.
 *
 * Strictly necessary cookies (sign-in state, sidebar layout, this preference
 * itself) are always on. Analytics is opt-in and currently has nothing to
 * switch on — the product ships no analytics scripts — but the flag is stored
 * so any analytics added later stays off until the visitor agrees.
 */
export function CookieConsent() {
  const [mode, setMode] = useState<BannerMode>('hidden');
  const [analytics, setAnalytics] = useState(false);
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      setAnalytics(existing.analytics);
    } else {
      setMode('banner');
    }

    const onOpenPreferences = () => {
      setSaved(false);
      setMode('preferences');
    };
    window.addEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, onOpenPreferences);
  }, []);

  useEffect(() => {
    if (mode === 'preferences') headingRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'preferences') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('hidden');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  const commit = (nextAnalytics: boolean) => {
    saveConsent(nextAnalytics);
    setAnalytics(nextAnalytics);
    setSaved(true);
    setMode('hidden');
  };

  if (mode === 'hidden') return null;

  if (mode === 'banner') {
    return (
      <div
        role="region"
        aria-label="Cookie consent"
        className="fixed inset-x-0 bottom-0 z-[999] p-4 sm:p-6"
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl shadow-gray-900/20">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-teal-50">
              <Cookie aria-hidden="true" className="h-4 w-4 text-teal-700" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">We use cookies</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Fleet OS uses strictly necessary cookies to keep you signed in and to remember
                interface preferences. We do not set analytics or advertising cookies. Read the{' '}
                <Link
                  href="/legal/cookies"
                  className={`font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 ${focusRing}`}
                >
                  Cookie Policy
                </Link>{' '}
                and{' '}
                <Link
                  href="/legal/privacy"
                  className={`font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 ${focusRing}`}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryButton} onClick={() => setMode('preferences')}>
              Manage preferences
            </button>
            <button type="button" className={secondaryButton} onClick={() => commit(false)}>
              Reject non-essential
            </button>
            <button type="button" className={primaryButton} onClick={() => commit(true)}>
              Accept all
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[999] p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl shadow-gray-900/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-sm font-semibold text-gray-900 focus-visible:outline-none"
            >
              Cookie preferences
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose which optional cookies Fleet OS may set. Strictly necessary cookies always
              stay on because the product cannot run without them.
            </p>
          </div>
          <button
            type="button"
            className={`rounded-lg px-2 py-1 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 ${focusRing}`}
            onClick={() => setMode('hidden')}
          >
            Close
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          <li className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <input
              id="cookie-necessary"
              type="checkbox"
              checked
              disabled
              readOnly
              className="mt-0.5 h-4 w-4 flex-none cursor-not-allowed rounded border-gray-300"
            />
            <label htmlFor="cookie-necessary" className="text-sm">
              <span className="font-medium text-gray-900">Strictly necessary</span>
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                Always on
              </span>
              <span className="mt-1 block text-gray-600">
                Sign-in state, sidebar layout and this preference are stored so the product works
                as requested.
              </span>
            </label>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              id="cookie-analytics"
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none rounded border-gray-300 text-teal-600 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            />
            <label htmlFor="cookie-analytics" className="text-sm">
              <span className="font-medium text-gray-900">Analytics and measurement</span>
              <span className="mt-1 block text-gray-600">
                Fleet OS runs no analytics tools today, so nothing is collected either way. If
                analytics are added, they stay switched off until you tick this box.
              </span>
            </label>
          </li>
        </ul>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/legal/cookies"
            className={`rounded-lg px-4 py-2.5 text-center text-sm font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 ${focusRing}`}
          >
            Read the Cookie Policy
          </Link>
          <button type="button" className={primaryButton} onClick={() => commit(analytics)}>
            {saved ? 'Saved' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
