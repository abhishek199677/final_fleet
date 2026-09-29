import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a Fleet OS workspace for your equipment fleet.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
