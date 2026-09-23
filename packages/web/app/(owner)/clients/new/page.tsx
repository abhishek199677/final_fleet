'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { Phone } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';

export default function NewClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    currency: 'INR',
    payment_terms_days: '30',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setFormData((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact || undefined,
          phone: formData.phone || undefined,
          currency: formData.currency || 'INR',
          payment_terms_days: parseInt(formData.payment_terms_days) || 30,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        router.push('/clients');
        return;
      }
      setError('Client was not created — nothing was saved.');
    } catch {
      setError('Client was not created — the API is unreachable.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Add Client</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="client-name">Name *</FieldLabel>
              <Input
                id="client-name"
                value={formData.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="BuildIt Corp"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="client-contact">Contact</FieldLabel>
                <Input
                  id="client-contact"
                  value={formData.contact}
                  onChange={(e) => set('contact', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="client-phone">Phone</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <Phone />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="client-phone"
                    value={formData.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </InputGroup>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="client-currency">Currency</FieldLabel>
                <Input
                  id="client-currency"
                  value={formData.currency}
                  onChange={(e) => set('currency', e.target.value)}
                  placeholder="INR"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="client-terms">Payment Terms</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="client-terms"
                    type="number"
                    value={formData.payment_terms_days}
                    onChange={(e) => set('payment_terms_days', e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>days</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </div>
            {error && <FieldError>{error}</FieldError>}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner /> Saving…
                  </>
                ) : (
                  'Add Client'
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
