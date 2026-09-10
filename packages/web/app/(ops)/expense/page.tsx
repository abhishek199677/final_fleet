'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { sampleExpenses } from '@/lib/sample-data';
import { Receipt, Plus, AlertCircle } from 'lucide-react';

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
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchList<ExpenseEntry>('/api/v1/expenses')
      .then(data => {
        if (data.length > 0) {
          setExpenses(data);
        } else {
          setExpenses(sampleExpenses);
        }
      })
      .catch(() => setExpenses(sampleExpenses))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-red-500 to-rose-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Expenses</h1>
              <p className="text-white/80">Record and manage operational expenses.</p>
            </div>
          </div>
          {!isReadOnly && (
            <Link href="/expense/new">
              <Button className="bg-white text-red-600 hover:bg-red-50">
                <Plus className="mr-2 h-4 w-4" />
                Log Expense
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#E5E2DB] bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-slate-400">Loading expenses...</div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-[#E5E2DB] bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No expenses yet. {!isReadOnly && 'Tap "Log Expense" to record your first entry.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => (
            <div key={exp.id} className="rounded-xl border border-[#E5E2DB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-50 p-2">
                    <Receipt className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{exp.description || (exp.expense_categories?.name ?? 'Expense')}</p>
                    <p className="text-sm text-slate-500">
                      {exp.date}
                      {exp.needs_verification ? ' · Needs verification' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{exp.currency} {(exp.amount_minor / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
