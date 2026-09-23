'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList,
} from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';
import { DatePicker } from '@/components/date-picker';
import { format, parse } from 'date-fns';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchListStrict } from '@/lib/api/fetch-list';
import { ApiErrorBanner } from '@/components/api-error-banner';

export default function NewSite() {
  const router = useRouter();
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    location: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    void fetchListStrict<Record<string, unknown>>('/api/v1/clients')
      .then((list) => setClients(list))
      .catch(() => setApiError(true))
      .finally(() => setFetching(false));
  }, []);

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        label: String(c.name ?? 'Untitled client'),
        value: String(c.id),
      })),
    [clients],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      setError('Please select a client.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/v1/sites', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        router.push('/sites');
        return;
      }
      setError('Site was not created — nothing was saved.');
    } catch {
      setError('Site was not created — the API is unreachable.');
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner /> Loading clients…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {apiError && <ApiErrorBanner />}
      <h1 className="text-3xl font-bold">New Site</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error && <FieldError>{error}</FieldError>}
            <Field>
              <FieldLabel>Client *</FieldLabel>
              <Combobox
                items={clientOptions}
                itemToStringValue={(c) => c.label}
                value={clientOptions.find((c) => c.value === formData.client_id) ?? null}
                onValueChange={(c) => setFormData({ ...formData, client_id: c ? c.value : '' })}
              >
                <ComboboxInput placeholder="Search clients…" />
                <ComboboxContent>
                  <ComboboxEmpty>No clients found.</ComboboxEmpty>
                  <ComboboxList>
                    {(c) => (
                      <ComboboxItem key={c.value} value={c}>
                        {c.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldDescription>Start typing to filter, then pick the client this site belongs to.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="site-name">Site Name *</FieldLabel>
              <Input
                id="site-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Yard, Project Alpha"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="site-location">Location</FieldLabel>
              <Input
                id="site-location"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Nairobi, Kenya"
              />
            </Field>
            <Field>
              <FieldLabel>Start Date</FieldLabel>
              <DatePicker
                className="w-full"
                selected={formData.start_date ? parse(formData.start_date, 'yyyy-MM-dd', new Date()) : undefined}
                onSelect={d => setFormData({ ...formData, start_date: d ? format(d, 'yyyy-MM-dd') : '' })}
                placeholder="Pick a start date"
              />
            </Field>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner /> Creating…
                  </>
                ) : (
                  'Create Site'
                )}
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
