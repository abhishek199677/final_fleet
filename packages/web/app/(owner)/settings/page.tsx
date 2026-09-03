'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Settings() {
  const [tab, setTab] = useState<'users' | 'machines' | 'categories' | 'fx'>('users');
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/v1/users').then(r => r.json()).catch(() => []),
      fetch('/v1/expenses/categories').then(r => r.json()).catch(() => []),
    ]).then(([u, c]) => {
      setUsers(u || []);
      setCategories(c || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['users', 'machines', 'categories', 'fx'] as const).map(t => (
          <button
            key={t}
            className={`px-4 py-2 font-medium ${tab === t ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {tab === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((u: Record<string, unknown>) => (
                    <div key={u.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <span className="font-medium">{u.email as string}</span>
                        <span className="text-sm text-muted-foreground ml-2">{u.role as string}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'machines' && (
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure maintenance tasks and intervals per machine type.</p>
              </CardContent>
            </Card>
          )}

          {tab === 'categories' && (
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((c: Record<string, unknown>) => (
                    <div key={c.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{c.name as string}</span>
                      <span className="text-sm text-muted-foreground">{c.type as string}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'fx' && (
            <Card>
              <CardHeader>
                <CardTitle>FX Defaults</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Configure default exchange rates for multi-currency transactions.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Base Currency</label>
                    <Input value="USD" disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default FX Rate</label>
                    <Input type="number" step="0.0001" defaultValue="1.0" />
                  </div>
                </div>
                <Button>Save</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
