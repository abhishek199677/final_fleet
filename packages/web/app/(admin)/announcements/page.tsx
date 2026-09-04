'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Row[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = () => fetchList<Row>('/api/admin/support/announcements').then(setItems).catch(() => undefined);

  useEffect(() => {
    void load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const res = await authFetch('/api/admin/support/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    }).catch(() => null);
    if (res && res.ok) {
      setTitle('');
      setBody('');
      void load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Announcements</h1>
        <p className="text-muted-foreground">Broadcast to tenants. Requires platform sign-in.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Body *</label>
                <textarea className="w-full border rounded-md p-2 text-sm" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
              </div>
              <Button type="submit">Broadcast</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sent ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground">Nothing broadcast yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
                  <div key={String(a.id)} className="rounded border p-2 text-sm">
                    <p className="font-medium">{String(a.title)}</p>
                    <p className="text-muted-foreground">{String(a.body)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
