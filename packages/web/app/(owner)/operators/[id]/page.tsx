'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/api/auth-fetch';
import { apiPatch } from '@/lib/api/mutations';

export default function OperatorDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [operator, setOperator] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    license: '',
    experience_years: '',
    specialization: '',
    is_active: true,
  });

  useEffect(() => {
    if (!id) return;
    const getOperator = async () => {
      try {
        const res = await authFetch(`/api/v1/operators/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data === 'object') {
          setOperator(data);
          setForm({
            name: data.name || '',
            phone: data.phone || '',
            license: data.license || '',
            experience_years: data.experience_years?.toString() || '',
            specialization: data.specialization || '',
            is_active: data.is_active !== false,
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    void getOperator();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/v1/operators/${id}`, {
        name: form.name,
        phone: form.phone || null,
        license: form.license || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        specialization: form.specialization || null,
        is_active: form.is_active,
      });
      setEditing(false);
      // Refresh data
      const res = await authFetch(`/api/v1/operators/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOperator(data);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading operator...</p>;
  if (!operator) return <p className="text-muted-foreground">Operator not found.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{editing ? 'Edit Operator' : (operator.name as string)}</h1>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => router.back()}>Back</Button>
              <Button onClick={() => setEditing(true)}>Edit</Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Operator Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
              <input
                type="text"
                value={form.license}
                onChange={(e) => setForm({ ...form, license: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <input
                type="text"
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-4">
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">👷</span> Operator Information
              </CardTitle>
            </div>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Name</span>
                <span className="font-semibold text-gray-800">{operator.name as string}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Phone</span>
                <span className="font-medium text-gray-800">{(operator.phone as string) ?? 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">License</span>
                <span className="font-medium text-gray-800">{(operator.license as string) ?? 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Experience</span>
                <span className="font-medium text-gray-800">
                  {operator.experience_years ? `${operator.experience_years} years` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Specialization</span>
                <span className="font-medium text-gray-800">{(operator.specialization as string) ?? 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  operator.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {operator.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">📋</span> Assignment
              </CardTitle>
            </div>
            <CardContent className="pt-6">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600 mb-2">Current Assignment</p>
                <p className="font-medium text-gray-800">
                  {(operator.assigned_machine as string) ?? 'No current assignment'}
                </p>
                {(operator.site as string) && (
                  <p className="text-sm text-gray-500 mt-1">{operator.site as string}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
