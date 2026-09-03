import type { Metadata } from 'next';
import './globals.css';
import { AmbientBackground } from '@/components/fx';

export const metadata: Metadata = {
  title: 'Fleet OS',
  description: 'Multi-tenant SaaS for heavy-equipment operators',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AmbientBackground />
        <div className="fleet-shell">{children}</div>
      </body>
    </html>
  );
}
