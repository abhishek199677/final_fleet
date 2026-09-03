'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ClientDetail() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [deployments, setDeployments] = useState<Record<string, unknown>[]>([]);
  const [receivable, setReceivable] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/v1/clients/${id}`).then(r => r.json()),
      fetch('/v1/deployments').then(r => r.json()).catch(() => []),
      fetch('/v1/billing/receivables').then(r => r.json()).catch(() => []),
    ]).then(([c, d, r]) => {
      setClient(c);
      setDeployments((d || []).filter((dep: Record<string, unknown>) => dep.client_id === id));
      setReceivable((r || []).find((rec: Record<string, unknown>) => rec.client_id === id) || null);
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
