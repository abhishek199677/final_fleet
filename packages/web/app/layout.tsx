import type { Metadata } from 'next';
import './globals.css';
import { AmbientBackground } from '@/components/fx/ambient-background';
import { AuthProvider } from '@/lib/auth/context';
import { I18nProvider } from '@/components/i18n-provider';
import { DirectionProvider } from '@/context/direction-provider';
import { ThemeProvider } from '@/context/theme-provider';
import { SearchProvider } from '@/context/search-provider';
import { LayoutProvider } from '@/context/layout-provider';
import { NavigationProgress } from '@/components/navigation-progress';
import { CookieConsent } from '@/components/cookie-consent';
import { ChatBot } from '@/components/chat-bot';

export const metadata: Metadata = {
  title: {
    default: 'Fleet OS',
    template: '%s — Fleet OS',
  },
  description:
    'Fleet OS runs utilisation, billing, maintenance and records for heavy-equipment fleets, with row-level tenant isolation and append-only history.',
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
            <ThemeProvider>
              <DirectionProvider dir="ltr">
                <SearchProvider>
                  <LayoutProvider>
                    <NavigationProgress />
                    <AmbientBackground />
                    <div className="fleet-shell">{children}</div>
                    <CookieConsent />
                    <ChatBot />
                  </LayoutProvider>
                </SearchProvider>
              </DirectionProvider>
            </ThemeProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
