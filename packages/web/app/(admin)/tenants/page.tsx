'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Row[]>([]);

  useEffect(() => {
    fetchList<Row>('/api/admin/tenants').then(setTenants).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenants</h1>
        <p className="text-muted-foreground">Plan, limits, usage and status. Requires platform sign-in.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-muted-foreground">No tenants yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Name</th>
                    <th className="py-2 pr-2 font-medium">Country</th>
                    <th className="py-2 pr-2 font-medium">Currency</th>
                    <th className="py-2 pr-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={String(t.id)} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{String(t.name)}</td>
                      <td className="py-2 pr-2">{String(t.country ?? '')}</td>
                      <td className="py-2 pr-2">{String(t.base_currency ?? '')}</td>
                      <td className="py-2 pr-2">{String(t.status ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
