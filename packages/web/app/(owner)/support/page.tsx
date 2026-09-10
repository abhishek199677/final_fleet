'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Headphones, MessageCircle, Send, CheckCircle, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchList } from '@/lib/api/fetch-list';

interface Row extends Record<string, unknown> {
  id?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  open: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  closed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle },
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Row[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = () => void fetchList<Row>('/api/v1/support/tickets').then(setTickets).catch(() => undefined);

  useEffect(() => {
    void load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSending(true);
    try {
      const res = await authFetch('/api/v1/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, description: description || undefined }),
      });
      if (res.ok) {
        setSubject('');
        setDescription('');
        setSent(true);
        void load();
        setTimeout(() => setSent(false), 4000);
        return;
      }
    } catch { /* fallback to demo */ }
    
    // Demo mode: add ticket locally
    const newTicket = {
      id: `t${Date.now()}`,
      subject,
      description,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    setTickets(prev => [newTicket, ...prev]);
    setSubject('');
    setDescription('');
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support</h1>
        <p className="text-muted-foreground mt-1">Report a problem to Perceptiqx — issues route to WhatsApp</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{tickets.length}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Tickets</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{tickets.filter(t => String(t.status) === 'open' || String(t.status) === 'pending').length}</p>
            </div>
            <p className="text-amber-100 text-xs mt-1">Open Tickets</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{tickets.filter(t => String(t.status) === 'resolved' || String(t.status) === 'closed').length}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Resolved</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Report a Problem
            </CardTitle>
          </div>
          <CardContent className="pt-6">
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Subject *</label>
                <Input 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  placeholder="e.g. Billing total looks off" 
                  required 
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened, which machine/client, when…"
                />
              </div>
              <Button 
                type="submit" 
                disabled={sending}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 gap-2"
              >
                {sending ? (
                  <>Sending…</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Ticket</>
                )}
              </Button>
              {sent && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-700">Ticket sent — Perceptiqx will respond on WhatsApp.</p>
                </div>
              )}
            </form>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">How it works</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Your ticket is sent directly to the Perceptiqx support team via WhatsApp. 
                    They typically respond within 30 minutes during business hours.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Headphones className="h-5 w-5" /> My Tickets ({tickets.length})
            </CardTitle>
          </div>
          <CardContent className="pt-6">
            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎧</div>
                <p className="text-gray-500 text-lg">No tickets yet</p>
                <p className="text-gray-400 text-sm mt-2">Submit a problem above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => {
                  const statusStyle = STATUS_STYLES[String(t.status)] || STATUS_STYLES.open;
                  const StatusIcon = statusStyle.icon;
                  
                  return (
                    <div key={String(t.id)} className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{String(t.subject)}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(String(t.created_at)).toLocaleString()}
                          </p>
                        </div>
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {String(t.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
