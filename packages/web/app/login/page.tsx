'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Truck, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-teal-600">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIvPjwvc3ZnPg==')] opacity-40" />
        <div className="relative flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Fleet OS</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Manage your fleet with confidence
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Real-time visibility into work, billing, cash, and maintenance
              — all in one platform.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Active tenants', value: '50+' },
                { label: 'Machines tracked', value: '2,000+' },
                { label: 'Uptime SLA', value: '99.5%' },
                { label: 'Support response', value: '<4h' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-white/70">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/50">
            © 2026 Perceptiqx. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center bg-white px-4 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Fleet OS</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-brand-700 hover:text-brand-600"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-brand-700 text-white hover:bg-brand-600 shadow-sm shadow-brand-700/20"
              disabled={loading}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-600">
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
