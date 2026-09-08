'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';
import hi from '@/messages/hi.json';
import bn from '@/messages/bn.json';
import te from '@/messages/te.json';
import mr from '@/messages/mr.json';
import ta from '@/messages/ta.json';
import gu from '@/messages/gu.json';
import kn from '@/messages/kn.json';
import ml from '@/messages/ml.json';
import pa from '@/messages/pa.json';
import or from '@/messages/or.json';
import as from '@/messages/as.json';
import ur from '@/messages/ur.json';
import ne from '@/messages/ne.json';
import sd from '@/messages/sd.json';
import ks from '@/messages/ks.json';
import doi from '@/messages/doi.json';
import kok from '@/messages/kok.json';
import mai from '@/messages/mai.json';
import sat from '@/messages/sat.json';
import mni from '@/messages/mni.json';
import brx from '@/messages/brx.json';
import sa from '@/messages/sa.json';

export type Locale =
  | 'en' | 'fr'
  | 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'gu' | 'kn' | 'ml'
  | 'pa' | 'or' | 'as' | 'ur' | 'ne' | 'sd' | 'ks' | 'doi'
  | 'kok' | 'mai' | 'sat' | 'mni' | 'brx' | 'sa';

const MESSAGES: Record<Locale, Record<string, unknown>> = {
  en, fr,
  hi, bn, te, mr, ta, gu, kn, ml,
  pa, or, as, ur, ne, sd, ks, doi,
  kok, mai, sat, mni, brx, sa,
};
const KEY = 'fleetos_locale';

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: 'en',
  setLocale: () => undefined,
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved && (MESSAGES as Record<string, unknown>)[saved]) {
      setLocaleState(saved as Locale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* private mode */
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale] as never}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
