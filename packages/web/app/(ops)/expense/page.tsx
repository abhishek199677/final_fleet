'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OpsExpense() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Expense</h1>
      <Card>
        <CardHeader>
          <CardTitle>Log Expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Record an expense with receipt.</p>
          <Link href="/expense/new">
            <Button className="w-full" size="lg">Log Expense</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
