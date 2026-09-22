'use client';

import { useState, ChangeEvent } from 'react';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import { Ripple, AuthTabs, TechOrbitDisplay } from '@/components/blocks/modern-animated-sign-in';
import {
  Truck, MapPin, BarChart3, Wrench, Shield, Clock, Fuel, FileText,
} from 'lucide-react';

const iconsArray = [
  {
    component: () => (
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-teal-500/15">
        <Truck className="h-[18px] w-[18px] text-teal-400" />
      </div>
    ),
    className: 'size-[40px]',
    duration: 20,
    delay: 0,
    radius: 100,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-emerald-500/15">
        <MapPin className="h-[18px] w-[18px] text-emerald-400" />
      </div>
    ),
    className: 'size-[40px]',
    duration: 20,
    delay: 10,
    radius: 100,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <div className="flex h-[40px] w-[40px] items-center justify-center rounded-xl bg-blue-500/15">
        <BarChart3 className="h-[22px] w-[22px] text-blue-400" />
      </div>
    ),
    className: 'size-[48px]',
    duration: 25,
    delay: 5,
    radius: 180,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <div className="flex h-[40px] w-[40px] items-center justify-center rounded-xl bg-amber-500/15">
        <Wrench className="h-[22px] w-[22px] text-amber-400" />
      </div>
    ),
    className: 'size-[48px]',
    duration: 25,
    delay: 15,
    radius: 180,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-violet-500/15">
        <Shield className="h-[18px] w-[18px] text-violet-400" />
      </div>
    ),
    className: 'size-[40px]',
    duration: 30,
    delay: 8,
    radius: 240,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-rose-500/15">
        <Clock className="h-[18px] w-[18px] text-rose-400" />
      </div>
    ),
    className: 'size-[40px]',
    duration: 30,
    delay: 18,
    radius: 240,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-cyan-500/15">
        <Fuel className="h-[24px] w-[24px] text-cyan-400" />
      </div>
    ),
    className: 'size-[52px]',
    duration: 35,
    delay: 3,
    radius: 300,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-orange-500/15">
        <FileText className="h-[24px] w-[24px] text-orange-400" />
      </div>
    ),
    className: 'size-[52px]',
    duration: 35,
    delay: 22,
    radius: 300,
    path: false,
    reverse: false,
  },
];

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

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
      await register(email, password, tenantName);
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
          onChange: () => {},
        },
        {
          label: 'Password',
          type: 'password',
          placeholder: 'Enter your password',
          required: true,
          onChange: () => {},
        },
      ],
      submitButton: 'Sign in',
      textVariantButton: 'Forgot password?',
    },
    signup: {
      header: 'Create account',
      subHeader: 'Start your free trial today',
      fields: [
        {
          label: 'Company Name',
          type: 'text',
          placeholder: 'Acme Construction',
          required: true,
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'tenant'),
        },
        {
          label: 'Email',
          type: 'email',
          placeholder: 'you@company.com',
          required: true,
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'email'),
        },
        {
          label: 'Password',
          type: 'password',
          placeholder: 'At least 8 characters',
          required: true,
          onChange: (e: ChangeEvent<HTMLInputElement>) => handleInputChange(e, 'password'),
        },
      ],
      submitButton: loading ? 'Creating account...' : 'Get started',
    },
  };

  return (
    <section className="flex min-h-screen max-lg:justify-center">
      {/* Left Side — animated orbit */}
      <span className="relative flex w-1/2 flex-col justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 max-lg:hidden">
        <Ripple mainCircleSize={100} />
        <TechOrbitDisplay iconsArray={iconsArray} orbits={4} />

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
          <h2 className="text-2xl font-bold text-white">
            Fleet management,<br />
            <span className="text-teal-400/80">simplified.</span>
          </h2>
        </div>
      </span>

      {/* Right Side — auth form */}
      <span className="flex h-[100dvh] w-1/2 flex-col items-center justify-center bg-gray-950 px-[10%] max-lg:w-full max-lg:px-[8%]">
        {error && (
          <div className="mb-4 w-full max-w-[380px] rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <AuthTabs
          formFields={formFields}
          handleSubmit={(e) => { void handleSubmit(e); }}
          defaultTab="signup"
        />
        <p className="mt-8 text-center text-sm text-white/30 max-w-[380px]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-teal-400/60 hover:text-teal-300 transition-colors">
            Sign in
          </Link>
        </p>
      </span>
    </section>
  );
}
