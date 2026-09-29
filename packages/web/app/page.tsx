import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: {
    absolute: 'Fleet OS — complete fleet visibility for equipment fleets',
  },
  description:
    'Fleet OS tracks utilisation, billing, maintenance and records for heavy-equipment fleets — hourly rates, multi-site and multi-currency, append-only history, row-level tenant isolation.',
};

export default function Page() {
  return <LandingPage />;
}
