import { describe, expect, it } from 'vitest';
import { toMinor, fromMinor, applyFx, outstanding, contribution } from './money.js';

describe('money utils (TSD §4)', () => {
  it('converts major to minor units as bigint', () => {
    expect(toMinor('10.50')).toBe(1050n);
    expect(toMinor(3)).toBe(300n);
    expect(toMinor('0.07')).toBe(7n);
  });

  it('formats minor units back to major', () => {
    expect(fromMinor(1050n)).toBe('10.50');
    expect(fromMinor(-5n)).toBe('-0.05');
  });

  it('applies fx with half-up rounding', () => {
    expect(applyFx(10000n, '1.5')).toBe(15000n);
    expect(applyFx(100n, '83.45678912')).toBe(8346n);
  });

  it('computes outstanding receivable (BIL-05)', () => {
    expect(
      outstanding({ billedMinor: 10000n, extrasMinor: 1000n, creditsMinor: 500n, receiptsMinor: 4000n, advancesConsumedMinor: 1000n }),
    ).toBe(5500n);
  });

  it('computes contribution (BIL-06)', () => {
    expect(contribution(10000n, 6000n, 1000n)).toBe(3000n);
  });
});
