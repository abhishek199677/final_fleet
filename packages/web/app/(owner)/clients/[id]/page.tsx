'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

interface AgeingBucket {
  label: string;
  amount: number;
  count: number;
}

export default function ClientDetail() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [deployments, setDeployments] = useState<Record<string, unknown>[]>([]);
  const [receivable, setReceivable] = useState<Record<string, unknown> | null>(null);
  const [ageing, setAgeing] = useState<AgeingBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const getClient = async (): Promise<Record<string, unknown> | null> => {
      try {
        const res = await authFetch(`/api/v1/clients/${id}`);
        if (!res.ok) return null;
        const j = await res.json();
        return j && typeof j === 'object' && !Array.isArray(j)
          ? (j as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    };
    void Promise.all([
      getClient(),
      fetchList<Record<string, unknown>>('/api/v1/deployments'),
      fetchList<Record<string, unknown>>('/api/v1/billing/receivables'),
    ]).then(([c, d, r]) => {
      setClient(c);
      setDeployments(d.filter((dep) => dep.client_id === id));
      const recv = r.find((rec) => rec.client_id === id) || null;
      setReceivable(recv);
      
      // Calculate ageing from ledger entries
      if (recv && recv.ledger) {
        const now = new Date();
        const buckets: AgeingBucket[] = [
          { label: 'Current', amount: 0, count: 0 },
          { label: '1-30 days', amount: 0, count: 0 },
          { label: '31-60 days', amount: 0, count: 0 },
          { label: '61-90 days', amount: 0, count: 0 },
          { label: '90+ days', amount: 0, count: 0 },
        ];
        
        for (const entry of recv.ledger as Record<string, unknown>[]) {
          if (entry.kind === 'invoice' && entry.due_date) {
            const dueDate = new Date(entry.due_date as string);
            const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const amount = Number(entry.amount_minor || 0);
            
            if (daysPastDue <= 0) {
              buckets[0].amount += amount;
              buckets[0].count++;
            } else if (daysPastDue <= 30) {
              buckets[1].amount += amount;
              buckets[1].count++;
            } else if (daysPastDue <= 60) {
              buckets[2].amount += amount;
              buckets[2].count++;
            } else if (daysPastDue <= 90) {
              buckets[3].amount += amount;
              buckets[3].count++;
            } else {
              buckets[4].amount += amount;
              buckets[4].count++;
            }
          }
        }
        setAgeing(buckets);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!client) return <p>Client not found</p>;

  const formatMoney = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name as string}</h1>
          <p className="text-muted-foreground">{client.contact as string || client.phone as string}</p>
        </div>
        <Link href="/clients">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      {/* Client Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.currency as string}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.payment_terms_days as number} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{receivable ? formatMoney(receivable.balance_minor as number) : '₹0'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{deployments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Ageing */}
      {ageing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Receivables Ageing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {ageing.map((bucket) => (
                <div key={bucket.label} className="text-center">
                  <p className="text-sm text-muted-foreground">{bucket.label}</p>
                  <p className={`text-lg font-bold ${bucket.label === 'Current' ? 'text-green-600' : bucket.amount > 0 ? 'text-red-600' : ''}`}>
                    {formatMoney(bucket.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{bucket.count} invoices</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Deployments */}
      <Card>
        <CardHeader>
          <CardTitle>Active Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          {deployments.length === 0 ? (
            <p className="text-muted-foreground">No active deployments</p>
          ) : (
            <div className="space-y-2">
              {deployments.map((d: Record<string, unknown>) => (
                <div key={d.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <span className="font-medium">{d.machine_code as string}</span>
                    <span className="text-sm text-muted-foreground ml-2">{d.site_name as string}</span>
                  </div>
                  <span className="text-sm">Since {new Date(d.start_date as string).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
