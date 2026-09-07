'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';

interface ExpenseEntry {
  id: string;
  date: string;
  description: string;
  currency: string;
  amount_minor: number;
  needs_verification: boolean;
  expense_categories?: { name: string };
}

export default function OpsExpense() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchList<ExpenseEntry>('/api/v1/expenses').then(setExpenses).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Link href="/expense/new">
          <Button>Log Expense</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading expenses...</p>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No expenses yet. Tap &quot;Log Expense&quot; to record your first entry.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <Card key={exp.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{exp.description || (exp.expense_categories?.name ?? 'Expense')}</p>
                  <p className="text-sm text-muted-foreground">
                    {exp.date}
                    {exp.needs_verification ? ' &middot; Needs verification' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{exp.currency} {(exp.amount_minor / 100).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
