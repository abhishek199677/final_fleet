'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/api/fetch-list';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useAuth } from '@/lib/auth/context';
import { Calculator, X } from 'lucide-react';

export default function CashCount() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const router = useRouter();
  const { enqueue } = useOfflineQueue();
  const [accounts, setAccounts] = useState<Record<string, unknown>[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [denominations, setDenominations] = useState({
    '0.01': '', '0.05': '', '0.10': '', '0.25': '', '0.50': '', '1.00': '',
    '2.00': '', '5.00': '', '10.00': '', '20.00': '', '50.00': '', '100.00': '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchList<Record<string, unknown>>('/api/v1/cash/accounts').then(setAccounts);
  }, []);

  const total = Object.entries(denominations).reduce((sum, [val, qty]) => {
    return sum + parseFloat(val) * 100 * (parseInt(qty) || 0);
  }, 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const counted = Object.entries(denominations)
        .filter(([, qty]) => qty)
        .map(([value, quantity]) => ({ value: parseFloat(value), quantity: parseInt(quantity) }));

      const body = {
        cash_account_id: selectedAccount,
        count_date: new Date().toISOString().split('T')[0],
        counted,
        client_uuid: crypto.randomUUID(),
      };
      const token = localStorage.getItem('fleetos_token');
      await enqueue('/api/v1/cash/counts', 'POST', body, token ? { Authorization: `Bearer ${token}` } : {});
      router.push('/today');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 p-2">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cash Count</h1>
            <p className="text-white/80">Perform a blind cash count for reconciliation.</p>
          </div>
        </div>
      </div>

      {isReadOnly ? (
        <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <X className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">View Only</h2>
          </div>
          <p className="text-slate-500">Cash counts can only be performed by operations staff.</p>
          <Button variant="outline" className="mt-4 border-[#E5E2DB] text-slate-700 hover:bg-slate-50" onClick={() => router.back()}>Go Back</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E2DB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">Blind Count</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Account *</label>
              <select className="w-full rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-violet-400 focus:outline-none" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} required>
                <option value="">Select account...</option>
                {accounts.map((a: Record<string, unknown>) => (
                  <option key={a.id as string} value={a.id as string}>{a.name as string}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(denominations).map(([value, qty]) => (
                <div key={value}>
                  <label className="text-sm font-medium text-slate-700">₹{value}</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-[#E5E2DB] p-2.5 text-slate-900 focus:border-violet-400 focus:outline-none"
                    value={qty}
                    onChange={e => setDenominations({ ...denominations, [value]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-violet-50 p-3 text-right text-xl font-bold text-violet-700">
              Total: ₹{(total / 100).toFixed(2)}
            </div>
            <div className="flex gap-4">
              <Button onClick={() => void handleSubmit()} disabled={!selectedAccount || loading} className="bg-violet-600 text-white hover:bg-violet-700">{loading ? 'Saving...' : 'Submit Count'}</Button>
              <Button variant="outline" onClick={() => router.back()} className="border-[#E5E2DB] text-slate-700 hover:bg-slate-50">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
