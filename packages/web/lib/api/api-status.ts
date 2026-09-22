'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Check if the Fleet OS API is reachable.
 * Returns { available, check } — call check() to re-probe.
 */
export function useApiStatus() {
  const [available, setAvailable] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health', { method: 'GET', signal: AbortSignal.timeout(5000) });
      setAvailable(res.ok);
    } catch {
      setAvailable(false);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  return { available, check };
}
