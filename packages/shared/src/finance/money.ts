/**
 * Money utilities (TSD §4, S14). All money moves as bigint minor units.
 * fx_rate is numeric(18,8) on the wire; base_minor = round(amount × fx).
 * Never use JS Number arithmetic for money outside these helpers.
 */

/** Convert a decimal major-unit string/number to minor units (bigint). */
export function toMinor(major: string | number, decimals = 2): bigint {
  const [whole = '0', frac = ''] = String(major).split('.');
  const norm = `${whole.replace(/[^0-9-]/g, '') || '0'}.${(frac + '0'.repeat(decimals)).slice(0, decimals)}`;
  const negative = norm.trim().startsWith('-');
  const digits = norm.replace(/[^0-9]/g, '');
  const value = BigInt(digits === '' ? '0' : digits);
  return negative ? -value : value;
}

/** Minor units back to a display string in major units. */
export function fromMinor(minor: bigint, decimals = 2): string {
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, '0');
  return `${neg ? '-' : ''}${whole.toString()}.${frac}`;
}

/** base_minor = round(amount_minor × fx_rate). fx_rate as string to keep precision. */
export function applyFx(amountMinor: bigint, fxRate: string | number): bigint {
  const [w = '0', f = ''] = String(fxRate).split('.');
  const scale = 10 ** 8;
  const fxScaled = BigInt(w) * BigInt(scale) + BigInt((f + '0'.repeat(8)).slice(0, 8) || '0');
  const sign = String(fxRate).trim().startsWith('-') ? -1n : 1n;
  const abs = (amountMinor * (fxScaled < 0n ? -fxScaled : fxScaled) + BigInt(scale) / 2n) / BigInt(scale);
  return sign < 0 ? -abs : abs;
}

/** Outstanding receivable = billed + extras − credits − receipts − advances consumed. */
export function outstanding(parts: {
  billedMinor: bigint;
  extrasMinor?: bigint;
  creditsMinor?: bigint;
  receiptsMinor?: bigint;
  advancesConsumedMinor?: bigint;
}): bigint {
  return (
    parts.billedMinor +
    (parts.extrasMinor ?? 0n) -
    (parts.creditsMinor ?? 0n) -
    (parts.receiptsMinor ?? 0n) -
    (parts.advancesConsumedMinor ?? 0n)
  );
}

/** Contribution = billed − direct costs − allocated overhead (BIL-06). */
export function contribution(billedMinor: bigint, directCostsMinor: bigint, overheadMinor = 0n): bigint {
  return billedMinor - directCostsMinor - overheadMinor;
}
