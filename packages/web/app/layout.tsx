import type { Metadata } from 'next';
import './globals.css';
import { AmbientBackground } from '@/components/fx';
import { AuthProvider } from '@/lib/auth/context';
import { I18nProvider } from '@/components/i18n-provider';

export const metadata: Metadata = {
  title: 'Fleet OS',
  description: 'Multi-tenant SaaS for heavy-equipment operators',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <I18nProvider>
            <AmbientBackground />
            <div className="fleet-shell">{children}</div>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
