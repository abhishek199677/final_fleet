'use client';

import { openCookiePreferences } from '@/lib/cookie-consent';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2';

/**
 * Footer control that re-opens the consent banner so a visitor can change or
 * withdraw their cookie choice at any time (WCAG + ePrivacy expectation).
 */
export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={`text-left text-sm underline underline-offset-2 transition-colors ${focusRing} ${className ?? ''}`}
    >
      Cookie preferences
    </button>
  );
}
