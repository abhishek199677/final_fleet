import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@fleetos/shared';
import { API_ERROR_CODES } from './error-codes.js';

describe('error code parity (CLAUDE.md rule 6)', () => {
  it('api mirror matches the shared source of truth', () => {
    expect({ ...API_ERROR_CODES }).toEqual({ ...ERROR_CODES });
  });
});
