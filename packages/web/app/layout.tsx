import type { Metadata } from 'next';
import './globals.css';
import { AmbientBackground } from '@/components/fx/ambient-background';
import { AuthProvider } from '@/lib/auth/context';
import { I18nProvider } from '@/components/i18n-provider';

export const metadata: Metadata = {
  title: 'Fleet OS',
  description: 'Multi-tenant SaaS for heavy-equipment operators',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('fleetos_dark')==='1'||(!localStorage.getItem('fleetos_dark')&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
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
