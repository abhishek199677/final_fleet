'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ title = 'Error', message, onRetry }: ErrorDisplayProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800">{title}</h3>
            <p className="text-sm text-red-700 mt-1">{message}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onRetry}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
