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
  fx_defaults: Record<string, { currency: string; rate: number }>;
  cut_off_time: string;
  working_units_per_day: number;
  working_days_per_month: number;
}

export default function Settings() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tNotifications = useTranslations('notifications');
  const tPeriodClose = useTranslations('periodClose');
  const { locale, setLocale } = useLocale();
  const [tab, setTab] = useState<'users' | 'machines' | 'categories' | 'fx' | 'evidence' | 'thresholds' | 'notifications' | 'periodClose' | 'language'>('users');
  const [periodClosePeriod, setPeriodClosePeriod] = useState('');
  const [periodCloseNote, setPeriodCloseNote] = useState('');
  const [periodCloses, setPeriodCloses] = useState<Array<Record<string, unknown>>>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [fxCurrencies, setFxCurrencies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/users'),
      fetchList<Record<string, unknown>>('/api/v1/machines'),
      fetchList<Record<string, unknown>>('/api/v1/maintenance/tasks'),
      fetchList<Record<string, unknown>>('/api/v1/expenses/categories'),
      authFetch('/api/v1/tenants/settings').then(r => r.ok ? r.json() : null).catch(() => null),
      fetchList<Record<string, unknown>>('/api/v1/tenants/period-closes'),
    ]).then(([u, m, mt, c, s, pc]) => {
      setUsers(u);
      setMachines(m);
      setMaintenanceTasks(mt);
      setCategories(c);
      setPeriodCloses(pc);
      if (s) {
        setSettings(s);
        const rates: Record<string, string> = {};
        if (s.fx_defaults && typeof s.fx_defaults === 'object') {
          Object.entries(s.fx_defaults).forEach(([k, v]) => {
            rates[k] = String((v as { rate: number }).rate ?? v);
          });
        }
        setFxCurrencies(rates);
      }
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
        {(['users', 'machines', 'categories', 'fx', 'evidence', 'thresholds', 'notifications', 'periodClose', 'language'] as const).map((t2) => (
          <button
            key={t2}
            className={`px-4 py-2 font-medium whitespace-nowrap ${tab === t2 ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setTab(t2)}
          >
            {t2 === 'language' ? t('language') :
             t2 === 'evidence' ? t('evidence') :
             t2 === 'thresholds' ? t('thresholds') :
             t2 === 'notifications' ? tNotifications('title') :
             t2 === 'periodClose' ? tPeriodClose('title') : t(t2)}
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
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Machines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {machines.map((m: Record<string, unknown>) => (
                      <div key={m.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{m.code as string}</span>
                          <span className="text-sm text-muted-foreground ml-2">{m.type as string}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {m.current_meter as number} {m.meter_unit_label as string}
                        </span>
                      </div>
                    ))}
                    {machines.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No machines configured yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {maintenanceTasks.map((task: Record<string, unknown>) => (
                      <div key={task.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{task.name as string}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {task.trigger as string === 'meter' ? `Every ${task.interval_value as number}` : `Every ${task.interval_value as number} days`}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Warning: {task.warning_value as number} {task.trigger as string === 'meter' ? 'hours' : 'days'}
                        </span>
                      </div>
                    ))}
                    {maintenanceTasks.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No maintenance tasks configured.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                    <Input value={settings?.fx_defaults ? Object.keys(settings.fx_defaults)[0] ?? 'INR' : 'INR'} disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default FX Rate (USD to base)</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={fxCurrencies['USD'] ?? '1.0'}
                      onChange={(e) => setFxCurrencies(prev => ({ ...prev, USD: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default FX Rate (EUR to base)</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={fxCurrencies['EUR'] ?? '1.0'}
                      onChange={(e) => setFxCurrencies(prev => ({ ...prev, EUR: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default FX Rate (KES to base)</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={fxCurrencies['KES'] ?? '1.0'}
                      onChange={(e) => setFxCurrencies(prev => ({ ...prev, KES: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={() => {
                  const fxDefaults: Record<string, { currency: string; rate: number }> = {};
                  Object.entries(fxCurrencies).forEach(([currency, rate]) => {
                    fxDefaults[currency] = { currency, rate: parseFloat(rate) || 1 };
                  });
                  void saveSettings({ fx_defaults: fxDefaults });
                }} disabled={saving}>
                  {saving ? 'Saving...' : tCommon('save')}
                </Button>
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
                      value={value}
                      onChange={(e) => {
                        const newPolicy = { ...settings.evidence_policy, [key]: e.target.value };
                        void saveSettings({ evidence_policy: newPolicy });
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
                      onChange={(e) => { void saveSettings({ cut_off_time: e.target.value }); }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Working Units per Day</label>
                    <Input
                      type="number"
                      value={settings.working_units_per_day}
                      onChange={(e) => { void saveSettings({ working_units_per_day: parseInt(e.target.value) || 8 }); }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Working Days per Month</label>
                    <Input
                      type="number"
                      value={settings.working_days_per_month}
                      onChange={(e) => { void saveSettings({ working_days_per_month: parseInt(e.target.value) || 26 }); }}
                    />
                  </div>
                </div>
                <Button onClick={() => { void saveSettings(settings); }} disabled={saving}>
                  {saving ? 'Saving...' : tCommon('save')}
                </Button>
              </CardContent>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>{tNotifications('preferences')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {tNotifications('desc')}
                </p>
                {users.filter(u => u.is_active).map((u: Record<string, unknown>) => {
                  const prefs = (u.notification_preferences as Record<string, boolean>) ?? { whatsapp: true, sms: false, in_app: true };
                  return (
                    <div key={u.id as string} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <span className="font-medium">{u.name as string || u.email as string}</span>
                        <span className="text-sm text-muted-foreground ml-2">{u.role as string}</span>
                      </div>
                      <div className="flex gap-3">
                        {(['whatsapp', 'sms', 'in_app'] as const).map((ch) => (
                          <label key={ch} className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={prefs[ch] ?? false}
                              onChange={(e) => {
                                const newPrefs = { ...prefs, [ch]: e.target.checked };
                                void authFetch(`/api/v1/users/${u.id}/notification-prefs`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ notification_preferences: newPrefs }),
                                });
                              }}
                            />
                            {ch === 'in_app' ? tNotifications('inApp') : ch.charAt(0).toUpperCase() + ch.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {tab === 'periodClose' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tPeriodClose('title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                  {tPeriodClose('desc')}
                </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">{tPeriodClose('period')}</label>
                      <Input
                        type="month"
                        value={periodClosePeriod}
                        onChange={(e) => setPeriodClosePeriod(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{tPeriodClose('note')}</label>
                      <Input
                        value={periodCloseNote}
                        onChange={(e) => setPeriodCloseNote(e.target.value)}
                        placeholder={tPeriodClose('notePlaceholder')}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          if (!periodClosePeriod) return;
                          if (!confirm(tPeriodClose('confirmClose'))) return;
                          void authFetch(`/api/v1/tenants/period-close/${periodClosePeriod}`, {
                            method: 'POST',
                            body: JSON.stringify({ note: periodCloseNote || undefined }),
                          }).then(() => {
                            setPeriodClosePeriod('');
                            setPeriodCloseNote('');
                          });
                        }}
                      >
                        {tPeriodClose('closePeriod')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{tPeriodClose('closedPeriods')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {periodCloses.map((pc) => (
                      <div key={pc.id as string} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{pc.period as string}</span>
                          {pc.note && <span className="text-sm text-muted-foreground ml-2">{pc.note as string}</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {tPeriodClose('closedBy')} {pc.closed_by_name as string || '—'}
                        </div>
                      </div>
                    ))}
                    {periodCloses.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        {tPeriodClose('noClosed')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'language' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('language')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['en', 'English'],
                    ['fr', 'Français'],
                    ['hi', 'हिन्दी'],
                    ['bn', 'বাংলা'],
                    ['te', 'తెలుగు'],
                    ['mr', 'मराठी'],
                    ['ta', 'தமிழ்'],
                    ['gu', 'ગુજરાતી'],
                    ['kn', 'ಕನ್ನಡ'],
                    ['ml', 'മലയാളം'],
                    ['pa', 'ਪੰਜਾਬੀ'],
                    ['or', 'ଓଡ଼ିଆ'],
                    ['as', 'অসমীয়া'],
                    ['ur', 'اردو'],
                    ['ne', 'नेपाली'],
                    ['sd', 'سنڌي'],
                    ['ks', 'کٲشُر'],
                    ['doi', 'डोगरी'],
                    ['kok', 'कोंकणी'],
                    ['mai', 'मैथिली'],
                    ['sat', 'ᱥᱟᱱᱛᱟᱲᱤ'],
                    ['mni', 'মৈতৈলোন্'],
                    ['brx', 'बड़ो'],
                    ['sa', 'संस्कृतम्'],
                  ] as [Locale, string][]).map(([l, label]) => (
                    <Button
                      key={l}
                      variant={locale === l ? 'default' : 'outline'}
                      onClick={() => setLocale(l)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('languageDesc')}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
