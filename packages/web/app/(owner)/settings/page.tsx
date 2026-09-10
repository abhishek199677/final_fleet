'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, Users, Truck, Tag, DollarSign, Camera, Bell, Clock, Globe, Shield, Wrench, CheckCircle } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { authFetch } from '@/lib/api/auth-fetch';
import { useLocale, type Locale } from '@/components/i18n-provider';
import { sampleUsers, sampleMachines, sampleOperators } from '@/lib/sample-data';

interface TenantSettings {
  evidence_policy: Record<string, string>;
  fx_defaults: Record<string, { currency: string; rate: number }>;
  cut_off_time: string;
  working_units_per_day: number;
  working_days_per_month: number;
}

const TAB_CONFIG = [
  { id: 'users', label: 'Users', icon: Users, color: 'from-blue-500 to-cyan-500' },
  { id: 'machines', label: 'Machines', icon: Truck, color: 'from-green-500 to-emerald-500' },
  { id: 'categories', label: 'Categories', icon: Tag, color: 'from-violet-500 to-purple-500' },
  { id: 'fx', label: 'FX', icon: DollarSign, color: 'from-amber-500 to-orange-500' },
  { id: 'evidence', label: 'Evidence', icon: Camera, color: 'from-pink-500 to-rose-500' },
  { id: 'thresholds', label: 'Thresholds', icon: Shield, color: 'from-indigo-500 to-blue-500' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'from-emerald-500 to-teal-500' },
  { id: 'periodClose', label: 'Period Close', icon: Clock, color: 'from-slate-600 to-slate-700' },
  { id: 'language', label: 'Language', icon: Globe, color: 'from-purple-500 to-pink-500' },
] as const;

const SAMPLE_SETTINGS: TenantSettings = {
  evidence_policy: { fuel_log: 'required', expense: 'optional', work_session: 'required' },
  fx_defaults: { USD: { currency: 'USD', rate: 83.5 }, EUR: { currency: 'EUR', rate: 91.2 }, KES: { currency: 'KES', rate: 0.65 } },
  cut_off_time: '18:00',
  working_units_per_day: 8,
  working_days_per_month: 26,
};

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
      setUsers(u.length > 0 ? u : sampleUsers);
      setMachines(m.length > 0 ? m : sampleMachines);
      setMaintenanceTasks(mt.length > 0 ? mt : []);
      setCategories(c.length > 0 ? c : [
        { id: 'cat1', name: 'Fuel', type: 'operational' },
        { id: 'cat2', name: 'Spare Parts', type: 'maintenance' },
        { id: 'cat3', name: 'Labour', type: 'operational' },
        { id: 'cat4', name: 'Transport', type: 'logistics' },
      ]);
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
      } else {
        setSettings(SAMPLE_SETTINGS);
        setFxCurrencies({ USD: '83.5', EUR: '91.2', KES: '0.65' });
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
    } catch { /* demo mode - continue */ }
    setSettings(prev => prev ? { ...prev, ...updates } : prev);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your tenant configuration and preferences</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{users.length}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Users</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{machines.length}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Machines</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{periodCloses.length}</p>
            </div>
            <p className="text-violet-100 text-xs mt-1">Closed Periods</p>
          </div>
        </Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {TAB_CONFIG.map((tabConfig) => {
          const Icon = tabConfig.icon;
          return (
            <button
              key={tabConfig.id}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                tab === tabConfig.id 
                  ? `bg-gradient-to-r ${tabConfig.color} text-white shadow-md` 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => setTab(tabConfig.id as typeof tab)}
            >
              <Icon className="h-4 w-4" />
              {tabConfig.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {tab === 'users' && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5" /> User Management
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {users.map((u: Record<string, unknown>) => (
                    <div key={u.id as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${u.is_active ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.email as string}</p>
                          <p className="text-xs text-gray-500">{u.role as string}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'machines' && (
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Truck className="h-5 w-5" /> Machine Configuration
                  </CardTitle>
                </div>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {machines.map((m: Record<string, unknown>) => (
                      <div key={m.id as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{m.code as string}</p>
                            <p className="text-xs text-gray-500">{m.type as string}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {m.current_meter as number} {m.meter_unit_label as string}
                        </span>
                      </div>
                    ))}
                    {machines.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🚜</div>
                        <p className="text-gray-500">No machines configured yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wrench className="h-5 w-5" /> Maintenance Tasks
                  </CardTitle>
                </div>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {maintenanceTasks.map((task: Record<string, unknown>) => (
                      <div key={task.id as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-800">{task.name as string}</p>
                          <p className="text-xs text-gray-500">
                            {task.trigger as string === 'meter' ? `Every ${task.interval_value as number} hours` : `Every ${task.interval_value as number} days`}
                          </p>
                        </div>
                        <span className="text-sm text-amber-600">Warning: {task.warning_value as number}</span>
                      </div>
                    ))}
                    {maintenanceTasks.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🔧</div>
                        <p className="text-gray-500">No maintenance tasks configured</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'categories' && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Tag className="h-5 w-5" /> Expense Categories
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {categories.map((c: Record<string, unknown>) => (
                    <div key={c.id as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                          <Tag className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-gray-800">{c.name as string}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {c.type as string}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'fx' && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" /> FX Defaults
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4">Configure default exchange rates for multi-currency transactions.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Base Currency</label>
                    <Input value={settings?.fx_defaults ? Object.keys(settings.fx_defaults)[0] ?? 'INR' : 'INR'} disabled className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">USD to INR</label>
                    <Input type="number" step="0.0001" value={fxCurrencies['USD'] ?? '83.5'} onChange={(e) => setFxCurrencies(prev => ({ ...prev, USD: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">EUR to INR</label>
                    <Input type="number" step="0.0001" value={fxCurrencies['EUR'] ?? '91.2'} onChange={(e) => setFxCurrencies(prev => ({ ...prev, EUR: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">KES to INR</label>
                    <Input type="number" step="0.0001" value={fxCurrencies['KES'] ?? '0.65'} onChange={(e) => setFxCurrencies(prev => ({ ...prev, KES: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <Button onClick={() => {
                  const fxDefaults: Record<string, { currency: string; rate: number }> = {};
                  Object.entries(fxCurrencies).forEach(([currency, rate]) => {
                    fxDefaults[currency] = { currency, rate: parseFloat(rate) || 1 };
                  });
                  void saveSettings({ fx_defaults: fxDefaults });
                }} disabled={saving} className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  {saving ? 'Saving...' : 'Save FX Rates'}
                </Button>
              </CardContent>
            </Card>
          )}

          {tab === 'evidence' && settings && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Camera className="h-5 w-5" /> Evidence Policy
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4">Configure when photo evidence is required for data entry.</p>
                <div className="space-y-3">
                  {settings.evidence_policy && Object.entries(settings.evidence_policy).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <label className="font-medium text-gray-800 capitalize">{key.replace(/_/g, ' ')}</label>
                      <select
                        className="border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'thresholds' && settings && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Thresholds & Working Hours
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cut-off Time</label>
                    <Input type="time" value={settings.cut_off_time} onChange={(e) => { void saveSettings({ cut_off_time: e.target.value }); }} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Working Units per Day</label>
                    <Input type="number" value={settings.working_units_per_day} onChange={(e) => { void saveSettings({ working_units_per_day: parseInt(e.target.value) || 8 }); }} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Working Days per Month</label>
                    <Input type="number" value={settings.working_days_per_month} onChange={(e) => { void saveSettings({ working_days_per_month: parseInt(e.target.value) || 26 }); }} className="mt-1" />
                  </div>
                </div>
                <Button onClick={() => { void saveSettings(settings); }} disabled={saving} className="mt-4 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600">
                  {saving ? 'Saving...' : 'Save Thresholds'}
                </Button>
              </CardContent>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5" /> Notification Preferences
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <p className="text-gray-600 mb-4">Configure how users receive notifications.</p>
                <div className="space-y-3">
                  {users.filter(u => u.is_active).map((u: Record<string, unknown>) => {
                    const prefs = (u.notification_preferences as Record<string, boolean>) ?? { whatsapp: true, sms: false, in_app: true };
                    return (
                      <div key={u.id as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{u.name as string || u.email as string}</p>
                            <p className="text-xs text-gray-500">{u.role as string}</p>
                          </div>
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
                                className="rounded"
                              />
                              {ch === 'in_app' ? 'In App' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'periodClose' && (
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Close Period
                  </CardTitle>
                </div>
                <CardContent className="pt-6">
                  <p className="text-gray-600 mb-4">Lock a period to prevent further edits to work sessions and expenses.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Period</label>
                      <Input type="month" value={periodClosePeriod} onChange={(e) => setPeriodClosePeriod(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Note</label>
                      <Input value={periodCloseNote} onChange={(e) => setPeriodCloseNote(e.target.value)} placeholder="Optional note" className="mt-1" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => {
                        if (!periodClosePeriod) return;
                        if (!confirm('Close this period? This action cannot be undone.')) return;
                        void authFetch(`/api/v1/tenants/period-close/${periodClosePeriod}`, {
                          method: 'POST',
                          body: JSON.stringify({ note: periodCloseNote || undefined }),
                        }).then(() => {
                          setPeriodClosePeriod('');
                          setPeriodCloseNote('');
                        });
                      }} className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800">
                        Close Period
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" /> Closed Periods
                  </CardTitle>
                </div>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {periodCloses.map((pc) => (
                      <div key={pc.id as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-800">{pc.period as string}</p>
                          {Boolean(pc.note) && <p className="text-xs text-gray-500">{pc.note as string}</p>}
                        </div>
                        <span className="text-sm text-gray-500">By {pc.closed_by_name as string || '—'}</span>
                      </div>
                    ))}
                    {periodCloses.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">📅</div>
                        <p className="text-gray-500">No closed periods yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'language' && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5" /> Language Settings
                </CardTitle>
              </div>
              <CardContent className="pt-6">
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
                  ] as [Locale, string][]).map(([l, label]) => (
                    <Button
                      key={l}
                      variant={locale === l ? 'default' : 'outline'}
                      onClick={() => setLocale(l)}
                      className={locale === l ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  Select your preferred language for the interface.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
