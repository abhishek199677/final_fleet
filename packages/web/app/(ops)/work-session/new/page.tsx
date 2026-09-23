'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhotoCapture } from '@/components/ui/photo-capture';
import {
  Attachment, AttachmentActions, AttachmentAction, AttachmentContent,
  AttachmentDescription, AttachmentMedia, AttachmentTitle,
} from '@/components/ui/attachment';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { Image as ImageIcon, X } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { useAuth } from '@/lib/auth/context';

export default function NewWorkSession() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const router = useRouter();
  const { isOnline, pendingCount, enqueue } = useOfflineQueue();
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [operators, setOperators] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    machine_id: '',
    operator_id: '',
    start_meter: '',
    notes: '',
  });
  const [meterPhoto, setMeterPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/machines'),
      fetchList<Record<string, unknown>>('/api/v1/operators'),
    ]).then(([m, o]) => {
      setMachines(m);
      setOperators(o);
    });
  }, []);

  const uniqueOperators = useMemo(() => {
    const seen = new Set<string>();
    return operators.filter((o) => {
      const name = String(o.name ?? '');
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [operators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedOffline(false);
    try {
      const body = {
        ...formData,
        start_meter: parseFloat(formData.start_meter),
        start_at: new Date().toISOString(),
        client_uuid: crypto.randomUUID(),
      };

      const result = await enqueue('/api/v1/work-sessions', 'POST', body, {
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('fleetos_token') : ''}`,
      });

      if (result.offline) {
        setSavedOffline(true);
        setTimeout(() => router.push('/work-session'), 1500);
      } else {
        router.push('/work-session');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isReadOnly) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Start Work Session</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Work sessions can only be started by operations staff.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Start Work Session</h1>
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
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Machine *</label>
              <NativeSelect
                className="w-full"
                value={formData.machine_id}
                onChange={e => setFormData({ ...formData, machine_id: e.target.value })}
                required
              >
                <NativeSelectOption value="">Select machine…</NativeSelectOption>
                {machines.map((m: Record<string, unknown>) => (
                  <NativeSelectOption key={m.id as string} value={m.id as string}>{m.code as string} — {m.type as string}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="text-sm font-medium">Operator *</label>
              <NativeSelect
                className="w-full"
                value={formData.operator_id}
                onChange={e => setFormData({ ...formData, operator_id: e.target.value })}
                required
              >
                <NativeSelectOption value="">Select operator…</NativeSelectOption>
                {uniqueOperators.map((o: Record<string, unknown>) => (
                  <NativeSelectOption key={o.id as string} value={o.id as string}>{o.name as string}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="text-sm font-medium">Start Meter *</label>
              <Input
                type="number"
                step="0.1"
                value={formData.start_meter}
                onChange={e => setFormData({ ...formData, start_meter: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Meter Photo (optional)</label>
              <PhotoCapture
                onPhoto={setMeterPhoto}
                label="Capture Odometer"
              />
              {meterPhoto && (
                <Attachment className="mt-2">
                  <AttachmentMedia>
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{meterPhoto.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {Math.max(1, Math.round(meterPhoto.size / 1024))} KB · ready to upload
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label="Remove photo"
                      onClick={() => setMeterPhoto(null)}
                    >
                      <X />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full border rounded-md p-2"
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner /> Starting…
                  </>
                ) : (
                  'Start Session'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
