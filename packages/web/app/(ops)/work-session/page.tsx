'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fetchListStrict } from '@/lib/api/fetch-list';
import { useAuth } from '@/lib/auth/context';
import { ApiErrorBanner } from '@/components/api-error-banner';
import { RecordActions } from '@/components/records/record-actions';
import { Play, Clock, ArrowRight, CheckCircle, Gauge } from 'lucide-react';

export default function OpsWorkSession() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'owner' || user?.role === 'admin';
  
  const [activeSessions, setActiveSessions] = useState<Record<string, unknown>[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Record<string, unknown>[]>([]);
  const [apiError, setApiError] = useState(false);

  const loadSessions = () => {
    setApiError(false);
    void fetchListStrict<Record<string, unknown>>('/api/v1/work-sessions')
      .then(sessions => {
        // API up → show exactly what's in the DB (empty = empty state)
        setActiveSessions(sessions.filter(s => !s.end_at));
        setCompletedSessions(sessions.filter(s => s.end_at).slice(0, 5));
      })
      .catch(() => setApiError(true));
  };

  useEffect(() => { loadSessions(); }, []);

  return (
    <div className="space-y-6">
      {apiError && <ApiErrorBanner onRetry={loadSessions} />}
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 p-6 shadow-lg">
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
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Start New Session</h3>
                  <p className="text-sm text-slate-500">Begin tracking a new machine session</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 ml-auto group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          </Link>
          <Link href="/today">
            <div className="group rounded-xl border border-[#E5E2DB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Back to Today</h3>
                  <p className="text-sm text-slate-500">View fleet dashboard</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 ml-auto group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="rounded-xl border border-[#E5E2DB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Play className="h-5 w-5" /> Active Sessions ({activeSessions.length})
            </h2>
          </div>
          <div className="divide-y divide-[#E5E2DB]">
            {activeSessions.map((session: Record<string, unknown>) => (
              <div key={session.id as string} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center">
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
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
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
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    {session.end_at ? `${((new Date(session.end_at as string).getTime() - new Date(session.start_at as string).getTime()) / 3600000).toFixed(1)} hrs` : 'Running'}
                  </span>
                  <RecordActions table="work_sessions" row={session} onChanged={loadSessions} />
                </div>
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
              <Button>
                <Play className="mr-2 h-4 w-4" /> Start First Session
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
