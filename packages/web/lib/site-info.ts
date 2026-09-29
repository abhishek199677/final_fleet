/**
 * Single source of truth for the operator's business details and the legal
 * navigation used by the marketing site, the auth screens and the legal pages.
 *
 * ⚠️ LAUNCH BLOCKER: every value wrapped in [square brackets] is a placeholder.
 * Replace them here once — every legal page imports from this file.
 */
export const BUSINESS = {
  legalName: 'Perceptiqx',
  productName: 'Fleet OS',
  /** Street address of the legal entity that operates the service. */
  registeredAddress: '[Registered address]',
  /** City / country of company registration. */
  placeOfRegistration: '[Place of registration]',
  /** Law and courts that govern the terms. */
  governingLaw: '[Governing law and jurisdiction]',
  /** Privacy / data-protection contact (GDPR & DPDP point of contact). */
  privacyContact: '[privacy contact email]',
  /** Contractual and legal notices contact. */
  legalContact: '[legal contact email]',
  /** Product support contact. */
  supportContact: '[support contact email]',
} as const;

/** Footer + header links for the four published legal documents. */
export const LEGAL_LINKS = [
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/terms', label: 'Terms and Conditions' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
  { href: '/legal/refund', label: 'Refund Policy' },
] as const;

/** Shown as the "Last updated" date on every legal document. */
export const POLICY_LAST_UPDATED = '29 September 2026';

/** Version recorded alongside the sign-up consent receipt. */
export const TERMS_CONSENT_VERSION = '2026-09-29';
