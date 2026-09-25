'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ApiErrorVariant = 'unavailable' | 'session';

export function ApiErrorBanner({
  onRetry,
  variant = 'unavailable',
  onSignIn,
}: {
  onRetry?: () => void;
  variant?: ApiErrorVariant;
  onSignIn?: () => void;
}) {
  const session = variant === 'session';

  return (
    <div
      className={
        session
          ? 'flex items-center gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200'
          : 'flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'
      }
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{session ? 'Session expired' : 'API server unavailable'}</p>
        <p className="text-sm opacity-80">
          {session
            ? 'Your sign-in session has ended. Sign in again to continue.'
            : 'Could not connect to the Fleet OS backend. Make sure the API server is running on port 3001.'}
        </p>
      </div>
      {session ? (
        onSignIn && (
          <Button size="sm" onClick={onSignIn} className="shrink-0">
            Sign in
          </Button>
        )
      ) : (
        onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
            Retry
          </Button>
        )
      )}
    </div>
  );
}
