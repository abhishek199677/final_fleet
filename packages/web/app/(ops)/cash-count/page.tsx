'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/api/auth-fetch';

export default function CashCount() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Record<string, unknown>[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [denominations, setDenominations] = useState({
    '0.01': '', '0.05': '', '0.10': '', '0.25': '', '0.50': '', '1.00': '',
    '2.00': '', '5.00': '', '10.00': '', '20.00': '', '50.00': '', '100.00': '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch('/api/v1/cash/accounts').then(r => r.json()).then(setAccounts).catch(() => setAccounts([]));
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

      const res = await authFetch('/api/v1/cash/counts', {
        method: 'POST',
        body: JSON.stringify({
          cash_account_id: selectedAccount,
          count_date: new Date().toISOString().split('T')[0],
          counted,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) router.push('/today');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Cash Count</h1>
      <Card>
        <CardHeader>
          <CardTitle>Blind Count</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Account *</label>
            <select className="w-full border rounded-md p-2" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} required>
              <option value="">Select account...</option>
              {accounts.map((a: Record<string, unknown>) => (
                <option key={a.id as string} value={a.id as string}>{a.name as string}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(denominations).map(([value, qty]) => (
              <div key={value}>
                <label className="text-sm font-medium">₹{value}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded-md p-2"
                  value={qty}
                  onChange={e => setDenominations({ ...denominations, [value]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="text-right text-xl font-bold">Total: ₹{(total / 100).toFixed(2)}</div>
          <div className="flex gap-4">
            <Button onClick={handleSubmit} disabled={!selectedAccount || loading}>{loading ? 'Saving...' : 'Submit Count'}</Button>
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
