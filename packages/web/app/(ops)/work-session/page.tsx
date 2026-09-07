'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fetchList } from '@/lib/api/fetch-list';

export default function OpsWorkSession() {
  const [activeSessions, setActiveSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList<Record<string, unknown>>('/api/v1/work-sessions')
      .then(sessions => {
        // Filter for sessions without end_at (active sessions)
        const active = sessions.filter(s => !s.end_at);
        setActiveSessions(active);
      })
      .catch(() => setActiveSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Work Session</h1>
      
      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSessions.map((session: Record<string, unknown>) => (
                <div key={session.id as string} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{session.machine_code as string || 'Machine'}</p>
                    <p className="text-sm text-muted-foreground">
                      Started: {new Date(session.start_at as string).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Start meter: {session.start_meter as number}
                    </p>
                  </div>
                  <Link href={`/work-session/${session.id as string}/end`}>
                    <Button variant="destructive">End Session</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Session */}
      <Card>
        <CardHeader>
          <CardTitle>New Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Select a machine to start logging a work session.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/work-session/new">
              <Button className="w-full" size="lg">Start New Session</Button>
            </Link>
            <Link href="/today">
              <Button variant="outline" className="w-full" size="lg">Back to Today</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
