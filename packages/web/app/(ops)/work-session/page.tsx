'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fetchList } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { sampleSessions, sampleMachines } from '@/lib/sample-data';
import { Play, Clock, ArrowRight, CheckCircle, Gauge } from 'lucide-react';

export default function OpsWorkSession() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const [activeSessions, setActiveSessions] = useState<Record<string, unknown>[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    void fetchList<Record<string, unknown>>('/api/v1/work-sessions')
      .then(sessions => {
        if (sessions.length > 0) {
          setActiveSessions(sessions.filter(s => !s.end_at));
          setCompletedSessions(sessions.filter(s => s.end_at).slice(0, 5));
        } else {
          const sampleActive = sampleSessions.filter(s => !s.end_at).map(s => ({
            ...s,
            machine_code: sampleMachines.find(m => m.id === s.machine_id)?.code || 'Unknown',
          }));
          const sampleCompleted = sampleSessions.filter(s => s.end_at).slice(0, 5).map(s => ({
            ...s,
            machine_code: sampleMachines.find(m => m.id === s.machine_id)?.code || 'Unknown',
          }));
          setActiveSessions(sampleActive);
          setCompletedSessions(sampleCompleted);
        }
      })
      .catch(() => {
        const sampleActive = sampleSessions.filter(s => !s.end_at).map(s => ({
          ...s,
          machine_code: sampleMachines.find(m => m.id === s.machine_id)?.code || 'Unknown',
        }));
        setActiveSessions(sampleActive);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Work Sessions</h1>
            <p className="text-sm text-amber-100">Track machine operating hours and activity</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{activeSessions.length}</p>
              <p className="text-xs text-amber-100">Active Now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {!isReadOnly && (
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/work-session/new">
            <div className="group rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Start New Session</h3>
                  <p className="text-sm text-slate-500">Begin tracking a new machine session</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 ml-auto group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>
          <Link href="/today">
            <div className="group rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Back to Today</h3>
                  <p className="text-sm text-slate-500">View fleet dashboard</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 ml-auto group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="rounded-xl border border-[#E5E2DB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Play className="h-5 w-5" /> Active Sessions ({activeSessions.length})
            </h2>
          </div>
          <div className="divide-y divide-[#E5E2DB]">
            {activeSessions.map((session: Record<string, unknown>) => (
              <div key={session.id as string} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Gauge className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{session.machine_code as string || 'Machine'}</p>
                    <p className="text-sm text-slate-500">
                      Started {new Date(session.start_at as string).toLocaleTimeString()} · Meter: {session.start_meter as number}
                    </p>
                  </div>
                </div>
                {!isReadOnly && (
                  <Link href={`/work-session/${session.id as string}/end`}>
                    <Button variant="destructive" size="sm">End Session</Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed Sessions */}
      {completedSessions.length > 0 && (
        <div className="rounded-xl border border-[#E5E2DB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600 to-gray-700 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CheckCircle className="h-5 w-5" /> Recent Sessions
            </h2>
          </div>
          <div className="divide-y divide-[#E5E2DB]">
            {completedSessions.map((session: Record<string, unknown>) => (
              <div key={session.id as string} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{session.machine_code as string || 'Machine'}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(session.start_at as string).toLocaleTimeString()} → {session.end_at ? new Date(session.end_at as string).toLocaleTimeString() : '—'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Meter: {session.start_meter as number} → {session.end_meter as number || '—'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  {session.end_at ? `${((new Date(session.end_at as string).getTime() - new Date(session.start_at as string).getTime()) / 3600000).toFixed(1)} hrs` : 'Running'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeSessions.length === 0 && completedSessions.length === 0 && (
        <div className="rounded-xl border border-[#E5E2DB] bg-white p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No sessions yet</h3>
          <p className="text-slate-500 mb-6">Start your first work session to begin tracking machine activity.</p>
          {!isReadOnly && (
            <Link href="/work-session/new">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Play className="mr-2 h-4 w-4" /> Start First Session
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
