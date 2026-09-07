'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/api/fetch-list';
import { authFetch } from '@/lib/api/auth-fetch';
import { useLocale, type Locale } from '@/components/i18n-provider';

interface TenantSettings {
  evidence_policy: Record<string, string>;
  fx_defaults: Record<string, unknown>;
  cut_off_time: string;
  working_units_per_day: number;
  working_days_per_month: number;
}

export default function Settings() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { locale, setLocale } = useLocale();
  const [tab, setTab] = useState<'users' | 'machines' | 'categories' | 'fx' | 'evidence' | 'thresholds' | 'language'>('users');
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/users'),
      fetchList<Record<string, unknown>>('/api/v1/expenses/categories'),
      fetch('/api/v1/tenants/settings').then(r => r.json()).catch(() => null),
    ]).then(([u, c, s]) => {
      setUsers(u);
      setCategories(c);
      if (s) setSettings(s);
    }).finally(() => setLoading(false));
  }, []);

  const saveSettings = async (updates: Partial<TenantSettings>) => {
    setSaving(true);
    try {
      await authFetch('/api/v1/tenants/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setSettings(prev => prev ? { ...prev, ...updates } : prev);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {(['users', 'machines', 'categories', 'fx', 'evidence', 'thresholds', 'language'] as const).map((t2) => (
          <button
            key={t2}
            className={`px-4 py-2 font-medium whitespace-nowrap ${tab === t2 ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setTab(t2)}
          >
            {t2 === 'language' ? (locale === 'fr' ? 'Langue' : 'Language') : 
             t2 === 'evidence' ? 'Evidence' : 
             t2 === 'thresholds' ? 'Thresholds' : t(t2)}
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

          {tab === 'evidence' && settings && (
            <Card>
              <CardHeader>
                <CardTitle>Evidence Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Configure when photo evidence is required for data entry.</p>
                {settings.evidence_policy && Object.entries(settings.evidence_policy).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                    <select
                      className="border rounded-md p-2"
                      value={value as string}
                      onChange={(e) => {
                        const newPolicy = { ...settings.evidence_policy, [key]: e.target.value };
                        saveSettings({ evidence_policy: newPolicy });
                      }}
                    >
                      <option value="off">Off</option>
                      <option value="optional">Optional</option>
                      <option value="required">Required</option>
                    </select>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {tab === 'thresholds' && settings && (
            <Card>
              <CardHeader>
                <CardTitle>Thresholds & Working Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Cut-off Time</label>
                    <Input
                      type="time"
                      value={settings.cut_off_time}
                      onChange={(e) => saveSettings({ cut_off_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Working Units per Day</label>
                    <Input
                      type="number"
                      value={settings.working_units_per_day}
                      onChange={(e) => saveSettings({ working_units_per_day: parseInt(e.target.value) || 8 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Working Days per Month</label>
                    <Input
                      type="number"
                      value={settings.working_days_per_month}
                      onChange={(e) => saveSettings({ working_days_per_month: parseInt(e.target.value) || 26 })}
                    />
                  </div>
                </div>
                <Button onClick={() => saveSettings(settings)} disabled={saving}>
                  {saving ? 'Saving...' : tCommon('save')}
                </Button>
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
