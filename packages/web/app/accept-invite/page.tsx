'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, MailOpen } from 'lucide-react';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const { acceptInvite } = useAuth();

  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await acceptInvite(token.trim(), password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the invite');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="w-full max-w-[380px] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h1 className="mt-4 text-xl font-bold text-white">You&rsquo;re all set</h1>
        <p className="mt-2 text-sm text-white/60">
          Your password is saved and you&rsquo;re signed in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="w-full max-w-[380px] space-y-4">
      <div className="mb-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-md shadow-teal-500/20">
          <MailOpen className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Accept your invite</h1>
        <p className="mt-1 text-sm text-white/50">Set a password to join this workspace.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="invite-token" className="text-sm font-medium text-white/70">
          Invite token
        </label>
        <Input
          id="invite-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste the invite token"
          required
          className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
        />
        <p className="text-xs text-white/30">Sent to you by the workspace owner.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invite-password" className="text-sm font-medium text-white/70">
          Password
        </label>
        <Input
          id="invite-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invite-confirm" className="text-sm font-medium text-white/70">
          Confirm password
        </label>
        <Input
          id="invite-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the password"
          required
          className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600">
        {loading ? <Spinner className="mr-2" /> : null}
        {loading ? 'Setting up…' : 'Set password & join'}
      </Button>

      <p className="text-center text-sm text-white/30">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-teal-400/60 hover:text-teal-300 transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-950 px-6 py-12">
      <Suspense fallback={<Spinner className="text-white/50" />}>
        <AcceptInviteForm />
      </Suspense>
    </section>
  );
}
