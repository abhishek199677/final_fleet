import { getCookie, setCookie } from './cookies';

/** Preference cookie written by the consent banner (first-party, non-HttpOnly). */
export const CONSENT_COOKIE = 'fleetos_cookie_consent';
/** Bump when the consent categories change so old choices are re-collected. */
export const CONSENT_VERSION = 1;
/** Preference is re-asked for after this many days. */
export const CONSENT_LIFETIME_DAYS = 180;
/** Window event fired by the "Cookie preferences" links in the footers. */
export const COOKIE_PREFERENCES_EVENT = 'fleetos:cookie-preferences';

export interface CookieConsent {
  /** Schema version of this record. */
  version: number;
  /** Strictly necessary cookies are always on — they run the service. */
  necessary: true;
  /**
   * Analytics / measurement cookies. There are none in the product today, and
   * nothing may be set in this category until this flag is true.
   */
  analytics: boolean;
  /** ISO timestamp of the choice. */
  updatedAt: string;
}

function parseConsent(raw: string): CookieConsent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.version !== 'number') return null;
  if (typeof candidate.analytics !== 'boolean') return null;
  return {
    version: candidate.version,
    necessary: true,
    analytics: candidate.analytics,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '',
  };
}

/** Returns the stored choice, or null when the visitor has not decided yet. */
export function readConsent(): CookieConsent | null {
  const raw = getCookie(CONSENT_COOKIE);
  if (!raw) return null;
  return parseConsent(raw);
}

/** Persists the visitor's choice and returns the stored record. */
export function saveConsent(analytics: boolean): CookieConsent {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  setCookie(CONSENT_COOKIE, JSON.stringify(consent), CONSENT_LIFETIME_DAYS);
  return consent;
}

/**
 * Gate for any future analytics or advertising code: nothing in that category
 * may load unless the visitor explicitly opted in and has not withdrawn it.
 */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

/** Asks the mounted banner to open its preference panel. */
export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
}
