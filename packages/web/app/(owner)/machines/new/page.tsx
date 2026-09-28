'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList,
} from '@/components/ui/combobox';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { Hash } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { MACHINE_TYPES, MAKES, METER_TYPES, YEARS, modelsForMake } from '@/lib/machine-options';

export default function NewMachine() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    code: '',
    type: '',
    make: '',
    model: '',
    year: '',
    chassis_no: '',
    primary_meter_type: 'hours',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setFormData((f) => ({ ...f, [k]: v }));

  const availableModels = modelsForMake(formData.make);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/v1/machines', {
        method: 'POST',
        body: JSON.stringify({
          code: formData.code,
          type: formData.type,
          make: formData.make || undefined,
          model: formData.model || undefined,
          year: formData.year ? parseInt(formData.year) : undefined,
          chassis_no: formData.chassis_no || undefined,
          primary_meter_type: formData.primary_meter_type,
          meter_unit_label: formData.primary_meter_type,
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        alert('Machine added successfully');
        router.push('/machines');
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.detail || 'Failed to create machine');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Add Machine</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* Code */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="machine-code">Code *</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <Hash />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="machine-code"
                    value={formData.code}
                    onChange={(e) => set('code', e.target.value)}
                    placeholder="EXC-005"
                    required
                  />
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="machine-type">Type *</FieldLabel>
                <NativeSelect
                  id="machine-type"
                  className="w-full"
                  value={formData.type}
                  onChange={(e) => set('type', e.target.value)}
                  required
                >
                  <NativeSelectOption value="">Select type…</NativeSelectOption>
                  {MACHINE_TYPES.map((t) => (
                    <NativeSelectOption key={t.value} value={t.value}>{t.label}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            {/* Make & Model */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Make</FieldLabel>
                <Combobox
                  items={MAKES}
                  itemToStringValue={(m) => m.label}
                  value={MAKES.find((m) => m.value === formData.make) ?? null}
                  onValueChange={(m) =>
                    setFormData((f) => ({ ...f, make: m ? m.value : '', model: '' }))
                  }
                >
                  <ComboboxInput placeholder="Search make…" />
                  <ComboboxContent>
                    <ComboboxEmpty>No makes found.</ComboboxEmpty>
                    <ComboboxList>
                      {(m) => (
                        <ComboboxItem key={m.value} value={m}>
                          {m.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
              <Field>
                <FieldLabel htmlFor="machine-model">Model</FieldLabel>
                {availableModels.length > 0 ? (
                  <NativeSelect
                    id="machine-model"
                    className="w-full"
                    value={formData.model}
                    onChange={(e) => set('model', e.target.value)}
                    disabled={!formData.make}
                  >
                    <NativeSelectOption value="">
                      {formData.make ? 'Select model…' : 'Select make first'}
                    </NativeSelectOption>
                    {availableModels.map((m) => (
                      <NativeSelectOption key={m} value={m}>{m}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    id="machine-model"
                    value={formData.model}
                    onChange={(e) => set('model', e.target.value)}
                    disabled={!formData.make}
                    placeholder={formData.make ? 'Enter model…' : 'Select make first'}
                  />
                )}
              </Field>
            </div>

            {/* Year & Chassis */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="machine-year">Year</FieldLabel>
                <NativeSelect
                  id="machine-year"
                  className="w-full"
                  value={formData.year}
                  onChange={(e) => set('year', e.target.value)}
                >
                  <NativeSelectOption value="">Select year…</NativeSelectOption>
                  {YEARS.map((y) => (
                    <NativeSelectOption key={y} value={y}>{y}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="machine-chassis">Chassis No</FieldLabel>
                <Input
                  id="machine-chassis"
                  value={formData.chassis_no}
                  onChange={(e) => set('chassis_no', e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            {/* Meter Type */}
            <Field>
              <FieldLabel htmlFor="machine-meter">Meter Type *</FieldLabel>
              <NativeSelect
                id="machine-meter"
                className="w-full"
                value={formData.primary_meter_type}
                onChange={(e) => set('primary_meter_type', e.target.value)}
                required
              >
                {METER_TYPES.map((t) => (
                  <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                Used for tracking usage — hours, distance, cycles, etc.
              </FieldDescription>
            </Field>

            {error && <FieldError>{error}</FieldError>}

            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner /> Saving…
                  </>
                ) : (
                  'Add Machine'
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
