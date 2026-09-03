'use client';

import { Card, CardContent } from '@/components/ui/card';

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

export function LoadingCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadingPage() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
      <div className="grid gap-4 md:grid-cols-3">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    </div>
  );
}
