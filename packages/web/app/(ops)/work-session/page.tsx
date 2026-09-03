'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OpsWorkSession() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Work Session</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Select a machine to start logging a work session.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/work-session/new">
              <Button className="w-full" size="lg">Start New Session</Button>
            </Link>
            <Link href="/today">
              <Button variant="outline" className="w-full" size="lg">Back to Today</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
