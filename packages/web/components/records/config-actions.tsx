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
import { apiDelete, apiPatch, confirmDelete } from '@/lib/api/mutations';
import { fieldKind, labelFor, type FieldOptions } from './record-actions';

type Row = Record<string, unknown>;

/**
 * Edit + delete for a config row: reference data the API mutates in place.
 *
 * Deliberately separate from `RecordActions`, which drives append-only money
 * records — those are corrected (new version) or voided (retired with a
 * reason), never patched or dropped, so offering the same two buttons would
 * promise the wrong guarantees.
 *
 * `path` is the API route prefix that owns the resource, e.g.
 * `expenses/categories` or `billing/rate-cards`.
 */
export function ConfigActions({
  path,
  row,
  label,
  fields,
  options,
  onChanged,
}: {
  path: string;
  row: Row;
  label: string;
  /** Keys to offer; defaults to every non-system column on the row. */
  fields?: string[];
  options?: FieldOptions;
  onChanged?: () => void;
}) {
  const id = String(row.id ?? '');
  const name = String(row.name ?? row.subject ?? id);

  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (!id) return null;

  const keys = fields ?? Object.keys(row).filter((key) => fieldKind(key, row[key]) !== 'hidden');

  const openEdit = () => {
    const next: Record<string, string> = {};
    for (const key of keys) {
      const v = row[key];
      next[key] = v === null || v === undefined ? '' : String(v);
    }
    setDraft(next);
    setError('');
    setEditOpen(true);
  };

  const save = async () => {
    const payload: Row = {};
    for (const key of keys) {
      const kind = fieldKind(key, row[key]);
      const original = row[key];
      const next = draft[key] ?? '';

      if (kind === 'boolean') {
        if ((next === 'true') !== Boolean(original)) payload[key] = next === 'true';
        continue;
      }
      if (kind === 'number') {
        if (next.trim() === '') {
          if (original !== null && original !== undefined) payload[key] = null;
          continue;
        }
        const parsed = Number(next);
        if (Number.isNaN(parsed)) {
          setError(`${labelFor(key)} must be a number`);
          return;
        }
        if (String(original ?? '') !== String(parsed)) payload[key] = parsed;
        continue;
      }
      const before = original === null || original === undefined ? '' : String(original);
      if (next !== before) payload[key] = next === '' ? null : next;
    }

    if (Object.keys(payload).length === 0) {
      setEditOpen(false);
      return;
    }

    setBusy(true);
    setError('');
    try {
      await apiPatch(`/api/v1/${path}/${id}`, payload);
      setEditOpen(false);
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete(name)) return;
    setDeleting(true);
    setError('');
    try {
      await apiDelete(`/api/v1/${path}/${id}`);
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {error && (
        <p role="alert" className="max-w-[22rem] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (open) setError('');
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={openEdit} aria-label={`Edit ${label}`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {label} <span className="text-muted-foreground">— {name}</span>
            </DialogTitle>
            <DialogDescription>Reference data: saved in place.</DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-3">
            {keys.map((key) => {
              const kind = fieldKind(key, row[key]);
              const choices = options?.[key];
              const value = draft[key] ?? '';

              if (choices) {
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`${id}-${key}`} className="text-xs uppercase text-muted-foreground">
                      {labelFor(key)}
                    </Label>
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
                      rows={3}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                  </div>
                );
              }

              if (kind === 'ref') {
                return (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs uppercase text-muted-foreground">{labelFor(key)}</Label>
                    <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all">{value || '—'}</p>
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
                    step={kind === 'number' ? 'any' : undefined}
                    value={value}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => void remove()}
        disabled={deleting}
        aria-label={`Delete ${label}`}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete
      </Button>
    </div>
  );
}
