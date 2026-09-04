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

export default function SupportPage() {
  const [tickets, setTickets] = useState<Row[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = () => fetchList<Row>('/api/v1/support/tickets').then(setTickets).catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSending(true);
    try {
      const res = await authFetch('/api/v1/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, description: description || undefined }),
      });
      if (res.ok) {
        setSubject('');
        setDescription('');
        setSent(true);
        load();
        setTimeout(() => setSent(false), 4000);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support</h1>
        <p className="text-muted-foreground">Report a problem to Perceptiqx — issues route to WhatsApp.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report a problem</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Subject *</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Billing total looks off" required />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened, which machine/client, when…"
                />
              </div>
              <Button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send ticket'}</Button>
              {sent && <p className="text-sm text-green-700">Ticket sent — Perceptiqx will respond on WhatsApp.</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My tickets ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-muted-foreground">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={String(t.id)} className="rounded border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{String(t.subject)}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">{String(t.status)}</span>
                    </div>
                    <p className="text-muted-foreground">{new Date(String(t.created_at)).toLocaleString()}</p>
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
