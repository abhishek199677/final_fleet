'use client';

import dynamic from 'next/dynamic';

// The hero boots a WebGL canvas and reads browser-only APIs, so skip SSR.
const OrbitDeliveryHero = dynamic(
  () => import('@/components/ui/orbit-delivery-hero'),
  { ssr: false },
);

export default function OrbitDeliveryHeroDemoPage() {
  return <OrbitDeliveryHero theme="auto" />;
}
