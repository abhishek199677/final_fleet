'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ApiErrorBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">API server unavailable</p>
        <p className="text-sm opacity-80">Could not connect to the Fleet OS backend. Make sure the API server is running on port 3001.</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">Retry</Button>
      )}
    </div>
  );
}
