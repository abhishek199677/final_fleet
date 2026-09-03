'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OpsFuel() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fuel</h1>
      <Card>
        <CardHeader>
          <CardTitle>Log Fuel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Record diesel fill for a machine.</p>
          <Link href="/fuel/new">
            <Button className="w-full" size="lg">Log Fuel</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
