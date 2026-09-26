'use client';

import { useState } from 'react';
import { Loader2, Pencil, UserCheck, UserX } from 'lucide-react';
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
import { apiPut } from '@/lib/api/mutations';

// Mirrors `tenant.users_role_check`: only these two roles exist. Offering
// anything else sends a value Postgres rejects, which used to surface as a 500.
const ROLES = [
  { value: 'ops', label: 'Operator' },
  { value: 'owner', label: 'Owner' },
];

/**
 * Rename / change role, and deactivate or reactivate a tenant user.
 *
 * Users are never hard-deleted: deactivation keeps their sessions, expenses
 * and audit trail attributed to a real person, which is why the API exposes
 * `PUT /users/:id/deactivate|reactivate` instead of DELETE.
 */
export function UserActions({
  user,
  isSelf,
  onChanged,
}: {
  user: Record<string, unknown>;
  isSelf?: boolean;
  onChanged: () => void;
}) {
  const id = String(user.id ?? '');
  const email = String(user.email ?? id);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('ops');

  if (!id) return null;

  const active = Boolean(user.is_active);

  const openEdit = () => {
    setName(String(user.name ?? ''));
    setRole(String(user.role ?? 'ops'));
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPut(`/api/v1/users/${id}`, { name: name.trim(), role });
      setOpen(false);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const verb = active ? 'deactivate' : 'reactivate';
    const prompt = active
      ? `Deactivate ${email}? They will not be able to sign in until reactivated.`
      : `Reactivate ${email}?`;
    if (!window.confirm(prompt)) return;

    setToggling(true);
    setError('');
    try {
      await apiPut(`/api/v1/users/${id}/${verb}`, {});
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setError('');
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={openEdit} aria-label={`Edit ${email}`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit user <span className="text-muted-foreground">— {email}</span>
            </DialogTitle>
            <DialogDescription>Change the display name or the role&apos;s permissions.</DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`${id}-name`} className="text-xs uppercase text-muted-foreground">
                Name
              </Label>
              <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-role`} className="text-xs uppercase text-muted-foreground">
                Role
              </Label>
              <NativeSelect id={`${id}-role`} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <NativeSelectOption key={r.value} value={r.value}>
                    {r.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={busy || !name.trim()}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isSelf && (
        <Button
          variant={active ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => void toggleActive()}
          disabled={toggling}
          aria-label={active ? `Deactivate ${email}` : `Reactivate ${email}`}
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : active ? (
            <UserX className="h-3.5 w-3.5" />
          ) : (
            <UserCheck className="h-3.5 w-3.5" />
          )}
          {active ? 'Deactivate' : 'Reactivate'}
        </Button>
      )}
    </div>
  );
}
