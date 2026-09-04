'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/api/fetch-list';
import { useLocale, type Locale } from '@/components/i18n-provider';

export default function Settings() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { locale, setLocale } = useLocale();
  const [tab, setTab] = useState<'users' | 'machines' | 'categories' | 'fx' | 'language'>('users');
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/users'),
      fetchList<Record<string, unknown>>('/api/v1/expenses/categories'),
    ]).then(([u, c]) => {
      setUsers(u);
      setCategories(c);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['users', 'machines', 'categories', 'fx', 'language'] as const).map((t2) => (
          <button
            key={t2}
            className={`px-4 py-2 font-medium ${tab === t2 ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setTab(t2)}
          >
            {t2 === 'language' ? (locale === 'fr' ? 'Langue' : 'Language') : t(t2 as 'users' | 'machines' | 'categories' | 'fx')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {tab === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('users')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((u: Record<string, unknown>) => (
                    <div key={u.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <span className="font-medium">{u.email as string}</span>
                        <span className="text-sm text-muted-foreground ml-2">{u.role as string}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? tCommon('active') : tCommon('inactive')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'machines' && (
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure maintenance tasks and intervals per machine type.</p>
              </CardContent>
            </Card>
          )}

          {tab === 'categories' && (
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((c: Record<string, unknown>) => (
                    <div key={c.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{c.name as string}</span>
                      <span className="text-sm text-muted-foreground">{c.type as string}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'fx' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('fx')} Defaults</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Configure default exchange rates for multi-currency transactions.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Base Currency</label>
                    <Input value="INR" disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default FX Rate</label>
                    <Input type="number" step="0.0001" defaultValue="1.0" />
                  </div>
                </div>
                <Button>{tCommon('save')}</Button>
              </CardContent>
            </Card>
          )}

          {tab === 'language' && (
            <Card>
              <CardHeader>
                <CardTitle>{locale === 'fr' ? 'Langue' : 'Language'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {(['en', 'fr'] as Locale[]).map((l) => (
                    <Button
                      key={l}
                      variant={locale === l ? 'default' : 'outline'}
                      onClick={() => setLocale(l)}
                    >
                      {l === 'en' ? 'English' : 'Français'}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {locale === 'fr'
                    ? 'Les écrans convertis suivent cette langue ; les autres suivront.'
                    : 'Converted screens follow this language; the rest follow next.'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
