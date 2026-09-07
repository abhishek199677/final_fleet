'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/api/auth-fetch';
import { useOfflineQueue } from '@/hooks/use-offline-queue';

export default function EndWorkSession() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { isOnline, pendingCount, enqueue } = useOfflineQueue();
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState({
    end_meter: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    authFetch(`/api/v1/work-sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => router.push('/work-session'))
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedOffline(false);
    try {
      const body = {
        end_meter: parseFloat(formData.end_meter),
        end_at: new Date().toISOString(),
        notes: formData.notes || undefined,
      };

      const result = await enqueue(`/api/v1/work-sessions/${sessionId}/end`, 'POST', body, {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('fleetos_token') : ''}`,
      });

      if (result.offline) {
        setSavedOffline(true);
        setTimeout(() => router.push('/work-session'), 1500);
      } else {
        router.push('/work-session');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading session...</p>;
  if (!session) return <p>Session not found</p>;

  const startMeter = Number(session.start_meter || 0);
  const machineCode = String((session as Record<string, unknown>).machine_code || 'Unknown');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">End Work Session</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
          {pendingCount > 0 && (
            <span className="text-yellow-600">({pendingCount} pending)</span>
          )}
        </div>
      </div>
      {savedOffline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
          Saved offline. It will sync when you're back online.
        </div>
      )}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Machine</p>
            <p className="font-medium">{machineCode}</p>
            <p className="text-sm text-muted-foreground mt-2">Start Meter</p>
            <p className="font-medium">{startMeter}</p>
            <p className="text-sm text-muted-foreground mt-2">Started At</p>
            <p className="font-medium">{new Date(session.start_at as string).toLocaleString()}</p>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">End Meter *</label>
              <Input
                type="number"
                step="0.1"
                min={startMeter}
                value={formData.end_meter}
                onChange={e => setFormData({ ...formData, end_meter: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Units run: {formData.end_meter ? (parseFloat(formData.end_meter) - startMeter).toFixed(1) : '—'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full border rounded-md p-2"
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this session..."
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Ending...' : 'End Session'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
