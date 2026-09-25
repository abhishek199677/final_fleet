'use client';

import Timeline from '@/components/ui/timeline';

export default function OwnerHome() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Timeline
        title="Product Storyline"
        periodLabel="2020 — 2026"
        backgroundColor="var(--color-background, #0a0a0a)"
        textColor="var(--color-foreground, #ffffff)"
        mutedTextColor="var(--color-muted-foreground, #a1a1aa)"
        activeColor="#ff5f00"
        imageUrl="https://cdn.21st.dev/assets/mirror/b0/b0c41784074f76ac5fb6b447da87780c901135841317a096241371f24bc13ddd.jpg"
        imageAlt="Team at work in a bright studio"
        duration={1.4}
      />
    </main>
  );
}