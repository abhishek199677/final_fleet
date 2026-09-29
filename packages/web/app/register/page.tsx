'use client';

import { useState, ChangeEvent } from 'react';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import { AuthTabs } from '@/components/blocks/modern-animated-sign-in';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Play } from 'lucide-react';
import { TERMS_CONSENT_VERSION } from '@/lib/site-info';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const { login, register } = useAuth();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
    if (field === 'email') setEmail(e.target.value);
    else if (field === 'password') setPassword(e.target.value);
    else setTenantName(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // The Sign in tab on this page performs a real sign-in.
      if (tab === 'login') {
        await login(email, password);
        return;
      }
      // Defence in depth: the checkbox is `required`, but never sign up
      // without an explicit, recorded agreement to the legal terms.
      if (!consentGiven) {
        setError('Please agree to the Terms and Conditions and Privacy Policy to continue.');
        return;
      }
      await register(email, password, tenantName);
      // Consent receipt on this device: version of the terms accepted + when.
      window.localStorage.setItem(
        'fleetos_terms_consent',
        JSON.stringify({ version: TERMS_CONSENT_VERSION, acceptedAt: new Date().toISOString() }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const formFields = {
    login: {
      header: 'Welcome back',
      subHeader: 'Sign in to your account to continue',
      fields: [
        {
          label: 'Email',
          type: 'email',
          placeholder: 'you@company.com',
          required: true,
          autoComplete: 'email',
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'email'),
        },
        {
          label: 'Password',
          type: 'password',
          placeholder: 'Enter your password',
          required: true,
          autoComplete: 'current-password',
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'password'),
        },
      ],
      submitButton: loading && tab === 'login' ? 'Signing in...' : 'Sign in',
    },
    signup: {
      header: 'Create account',
      subHeader: 'Create your workspace in a minute',
      fields: [
        {
          label: 'Company Name',
          type: 'text',
          placeholder: 'Acme Construction',
          required: true,
          autoComplete: 'organization',
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'tenant'),
        },
        {
          label: 'Email',
          type: 'email',
          placeholder: 'you@company.com',
          required: true,
          autoComplete: 'email',
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'email'),
        },
        {
          label: 'Password',
          type: 'password',
          placeholder: 'At least 8 characters',
          required: true,
          autoComplete: 'new-password',
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'password'),
        },
      ],
      submitButton: loading && tab === 'signup' ? 'Creating account...' : 'Get started',
    },
  };

  return (
    <main id="content" className="flex min-h-screen max-lg:justify-center">
      {/* Left Side — animated orbit */}
      <div className="relative flex w-1/2 flex-col justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 max-lg:hidden">
        <AspectRatio ratio={16/9} className="w-[80%] mx-auto flex-1">
          <video
            controls
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/app-preview-poster.jpg"
            aria-label="Fleet OS product preview video"
            className="w-full h-full object-cover rounded-xl transition-transform duration-500 hover:scale-[1.02]"
          >
            <source src="/app-preview.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
          <div className="absolute inset-x-0 top-[30%] bottom-[30%] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 hover:scale-[1.05]">
            <div className="relative flex items-center space-x-3 group-hover:scale-[1.05]">
              <Play
                aria-hidden="true"
                className="h-6 w-6 text-white/90"
              />
              <span className="text-sm font-medium text-white/90">Watch Preview</span>
            </div>
          </div>
          {/* Honest description of the preview — no caption track is bundled. */}
          <p className="absolute bottom-2 left-2 right-2 text-xs text-center text-white/70">
            Product preview · plays muted · use the player controls to pause
          </p>
        </AspectRatio>

        {/* Brand overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 shadow-md shadow-teal-500/20">
              <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                <path d="M15 18H9" />
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                <circle cx="17" cy="18" r="2" />
                <circle cx="7" cy="18" r="2" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">FleetOS</span>
          </div>
          <p className="text-2xl font-bold text-white">
            Fleet management,<br />
            <span className="text-teal-400/80">simplified.</span>
          </p>
        </div>
      </div>

      {/* Right Side — auth form */}
      <div className="flex h-[100dvh] w-1/2 flex-col items-center justify-center bg-gray-950 px-[10%] max-lg:w-full max-lg:px-[8%]">
        {error && (
          <div
            role="alert"
            className="mb-4 w-full max-w-[380px] rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        )}
        <AuthTabs
          formFields={formFields}
          handleSubmit={(e) => { void handleSubmit(e); }}
          defaultTab="signup"
          onTabChange={setTab}
          onConsentChange={setConsentGiven}
        />
        <p className="mt-8 text-center text-sm text-white/60 max-w-[380px]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-teal-400 hover:text-teal-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
