'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchList } from '@/lib/api/fetch-list';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Insights() {
  const [machines, setMachines] = useState<Record<string, unknown>[]>([]);
  const [downtime, setDowntime] = useState<Record<string, unknown>[]>([]);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetchList<Record<string, unknown>>('/api/v1/machines'),
      fetchList<Record<string, unknown>>('/api/v1/fuel-downtime/downtime'),
      fetchList<Record<string, unknown>>('/api/v1/work-sessions'),
    ]).then(([m, d, s]) => {
      setMachines(m);
      setDowntime(d);
      setSessions(s);
    }).finally(() => setLoading(false));
  }, []);

  // Calculate downtime by reason (count hours if endedAt-startAt available, else count events)
  const downtimeByReason = downtime.reduce<Record<string, number>>((acc, d) => {
    const reason = (d.reason_code as string) || 'unknown';
    if (d.started_at && d.ended_at) {
      const hours = (new Date(d.ended_at).getTime() - new Date(d.started_at).getTime()) / (1000 * 60 * 60);
      acc[reason] = (acc[reason] || 0) + Math.round(hours * 10) / 10;
    } else {
      acc[reason] = (acc[reason] || 0) + 1;
    }
    return acc;
  }, {});

  const downtimeData = Object.entries(downtimeByReason).map(([reason, value]) => ({
    name: reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
  }));

  // Calculate machine status based on today's sessions
  const today = new Date().toISOString().split('T')[0];
  const machinesWithSessionToday = new Set(
    sessions
      .filter(s => s.start_at && (s.start_at as string).startsWith(today))
      .map(s => s.machine_id)
  );

  const activeMachines = machines.filter(m => m.status_flag !== 'retired');
  const machinesWithDowntime = new Set(downtime.map(d => d.machine_id));

  const utilisationData = [
    { name: 'Operating', value: activeMachines.filter(m => machinesWithSessionToday.has(m.id)).length },
    { name: 'In Downtime', value: activeMachines.filter(m => machinesWithDowntime.has(m.id) && !machinesWithSessionToday.has(m.id)).length },
    { name: 'Idle', value: activeMachines.filter(m => !machinesWithSessionToday.has(m.id) && !machinesWithDowntime.has(m.id)).length },
  ].filter(d => d.value > 0);

  // Calculate total units from sessions
  const totalUnits = sessions.reduce((sum, s) => sum + ((s.units_run as number) || 0), 0);
  const billableUnits = sessions.filter(s => s.billable).reduce((sum, s) => sum + ((s.units_run as number) || 0), 0);

  if (loading) return <p className="text-muted-foreground">Loading insights...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Insights</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Downtime by Reason */}
        <Card>
          <CardHeader>
            <CardTitle>Downtime by Reason</CardTitle>
          </CardHeader>
          <CardContent>
            {downtimeData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No downtime recorded</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={downtimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Machine Utilisation */}
        <Card>
          <CardHeader>
            <CardTitle>Machine Status (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {utilisationData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No machines</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={utilisationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {utilisationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{machines.length}</p>
                <p className="text-sm text-muted-foreground">Total Machines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{activeMachines.length}</p>
                <p className="text-sm text-muted-foreground">Active Machines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totalUnits.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Units</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totalUnits > 0 ? Math.round((billableUnits / totalUnits) * 100) : 0}%</p>
                <p className="text-sm text-muted-foreground">Billable Ratio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
