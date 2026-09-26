'use client';

import { useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/api/auth-fetch';
import { RECORD_LABELS, RECORD_ROUTES } from '@/lib/api/record-routes';

type Row = Record<string, unknown>;

export type SelectOption = { value: string; label: string };
/** FK columns the caller has choices for: `{ category_id: [{ value, label }] }`. */
export type FieldOptions = Record<string, SelectOption[]>;

/**
 * Columns the API will not accept from a request (versioning, ownership and
 * evidence keys) — offered nowhere, so a correction can never forge them.
 */
const SYSTEM_FIELDS = new Set([
  'id', 'tenant_id', 'created_at', 'created_by',
  'version', 'supersedes_id', 'is_current', 'client_uuid', 'source',
  'receipt_photo_key', 'start_photo_key', 'end_photo_key', 'photo_key', 'slip_photo_key',
]);

const LONG_FIELDS = new Set(['note', 'notes', 'description', 'override_reason']);
const NUMBER_KEYS = /(_minor|_rate|_litres|litres$|_meter|^meter|_units|units_|_ocr_value|_cost|_amount|_value|_threshold)/;

type Kind = 'text' | 'long' | 'number' | 'boolean' | 'date' | 'ref' | 'hidden';

export function fieldKind(key: string, value: unknown): Kind {
  if (SYSTEM_FIELDS.has(key)) return 'hidden';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value !== null && typeof value === 'object') return 'hidden'; // jsonb: edited via its own screen
  if (key.endsWith('_id')) return 'ref';
  if (typeof value === 'string') {
    if (key === 'date' || key.endsWith('_date') || key.endsWith('_on')) return 'date';
    if (LONG_FIELDS.has(key)) return 'long';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    return 'text';
  }
  // Nullable column: infer an input from the column name so an empty numeric
  // is not round-tripped as an empty string Postgres cannot cast.
  if (LONG_FIELDS.has(key)) return 'long';
  if (key === 'date' || key.endsWith('_date')) return 'date';
  if (NUMBER_KEYS.test(key)) return 'number';
  // Timestamps stay raw ISO text: converting them to a datetime-local widget
  // would silently re-base the instant onto the browser's timezone.
  return 'text';
}

export function labelFor(key: string): string {
  return key.replace(/_/g, ' ');
}

/**
 * Generic edit + void affordance for an append-only record.
 *
 * Editing posts a correction (a new version); voiding retires the current
 * version behind a reason. Neither destroys a row, so the audit trail the rest
 * of the product promises stays intact — this is the one control that lets a
 * list page offer both actions without re-implementing the rules per table.
 */
export function RecordActions({
  table,
  row,
  options,
  onChanged,
}: {
  table: string;
  row: Row;
  options?: FieldOptions;
  onChanged?: () => void;
}) {
  const route = RECORD_ROUTES[table];
  const id = String(row.id ?? '');
  const label = RECORD_LABELS[table] ?? table;

  const [editOpen, setEditOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');

  if (!route || !id) return null;

  const fields = Object.keys(row).filter((key) => fieldKind(key, row[key]) !== 'hidden');

  const openEdit = () => {
    const next: Record<string, string> = {};
    for (const key of fields) {
      const v = row[key];
      next[key] = v === null || v === undefined ? '' : String(v);
    }
    setDraft(next);
    setError('');
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setError('');
  };

  const collectChanges = (): Row => {
    const changed: Row = {};
    for (const key of fields) {
      const kind = fieldKind(key, row[key]);
      const original = row[key];
      const next = draft[key] ?? '';
      if (kind === 'boolean') {
        if ((next === 'true') !== Boolean(original)) changed[key] = next === 'true';
        continue;
      }
      if (kind === 'number') {
        if (next.trim() === '') {
          // Emptying a nullable numeric clears it; emptying a required one is
          // left to the server, which answers with a field-level 400.
          if (original !== null && original !== undefined) changed[key] = null;
          continue;
        }
        const parsed = Number(next);
        if (Number.isNaN(parsed)) throw new Error(`${labelFor(key)} must be a number`);
        if (String(original ?? '') !== String(parsed)) changed[key] = parsed;
        continue;
      }
      const before = original === null || original === undefined ? '' : String(original);
      if (next !== before) changed[key] = next === '' ? null : next;
    }
    return changed;
  };

  const save = async () => {
    let payload: Row;
    try {
      payload = collectChanges();
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (Object.keys(payload).length === 0) {
      closeEdit();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await authFetch(`/api/v1/${route}/${id}/corrections`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
        const raw = body?.message;
        setError(Array.isArray(raw) ? raw.filter(Boolean).join(', ') : typeof raw === 'string' ? raw : `Save failed (${res.status})`);
        return;
      }
      closeEdit();
      onChanged?.();
    } catch {
      setError('Save failed — the API is unreachable.');
    } finally {
      setBusy(false);
    }
  };

  const submitVoid = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await authFetch(`/api/v1/${route}/${id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
        const raw = body?.message;
        setError(Array.isArray(raw) ? raw.filter(Boolean).join(', ') : typeof raw === 'string' ? raw : `Void failed (${res.status})`);
        return;
      }
      setVoidOpen(false);
      setReason('');
      onChanged?.();
    } catch {
      setError('Void failed — the API is unreachable.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={(open) => (open ? openEdit() : closeEdit())}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={openEdit} aria-label={`Edit ${label}`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">Edit {label}</DialogTitle>
            <DialogDescription>
              Saving writes a new version — the original stays in the audit trail.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-3">
            {fields.map((key) => {
              const kind = fieldKind(key, row[key]);
              const original = row[key];
              const value = draft[key] ?? '';

              if (kind === 'ref') {
                const choices = options?.[key];
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`${id}-${key}`} className="text-xs uppercase text-muted-foreground">
                      {labelFor(key)}
                    </Label>
                    {choices ? (
                      <NativeSelect
                        id={`${id}-${key}`}
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      >
                        <NativeSelectOption value="">— none —</NativeSelectOption>
                        {choices.map((c) => (
                          <NativeSelectOption key={c.value} value={c.value}>
                            {c.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    ) : (
                      <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all">
                        {value || '—'}
                      </p>
                    )}
                  </div>
                );
              }

              if (kind === 'boolean') {
                return (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={value === 'true'}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked ? 'true' : 'false' }))}
                      className="h-4 w-4"
                    />
                    <span>{labelFor(key)}</span>
                    {String(original) !== value && <span className="text-amber-600">(changed)</span>}
                  </label>
                );
              }

              if (kind === 'long') {
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`${id}-${key}`} className="text-xs uppercase text-muted-foreground">
                      {labelFor(key)}
                    </Label>
                    <Textarea
                      id={`${id}-${key}`}
                      value={value}
                      rows={2}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                  </div>
                );
              }

              return (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`${id}-${key}`} className="text-xs uppercase text-muted-foreground">
                    {labelFor(key)}
                  </Label>
                  <Input
                    id={`${id}-${key}`}
                    type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
                    value={value}
                    step={kind === 'number' ? 'any' : undefined}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeEdit} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={voidOpen}
        onOpenChange={(open) => {
          setVoidOpen(open);
          if (open) {
            setError('');
            setReason('');
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" aria-label={`Void ${label}`}>
            <Trash2 className="h-3.5 w-3.5" />
            Void
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Void {label}</DialogTitle>
            <DialogDescription>
              It leaves every list, total and billing input immediately. Every version and the
              reason you give stay in the audit trail.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor={`${id}-void-reason`} className="text-xs uppercase text-muted-foreground">
              Reason
            </Label>
            <Textarea
              id={`${id}-void-reason`}
              rows={3}
              value={reason}
              placeholder="Entered twice after a card was retried…"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setVoidOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void submitVoid()} disabled={busy || !reason.trim()}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Void record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
