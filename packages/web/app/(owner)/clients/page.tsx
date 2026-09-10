'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building2, Phone, Mail, MapPin, Briefcase, IndianRupee, ArrowRight } from 'lucide-react';
import { fetchList } from '@/lib/api/fetch-list';
import { sampleClients } from '@/lib/sample-data';

interface ClientEntry {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  payment_terms_days?: number;
  total_projects?: number;
  total_revenue?: number;
  status?: string;
}

export default function OwnerClients() {
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList<ClientEntry>('/api/v1/clients')
      .then((data) => {
        setClients(data.length > 0 ? data : sampleClients);
      })
      .catch(() => {
        setClients(sampleClients);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.total_revenue ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your client relationships and projects</p>
        </div>
        <Link href="/clients/new">
          <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
            <span className="mr-2">+</span> Add Client
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{clients.length}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Clients</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{activeClients}</p>
            </div>
            <p className="text-green-100 text-xs mt-1">Active Clients</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">₹{(totalRevenue / 100000).toFixed(1)}L</p>
            </div>
            <p className="text-emerald-100 text-xs mt-1">Total Revenue</p>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <p className="text-gray-500 text-lg mb-2">No clients yet</p>
            <p className="text-gray-400 text-sm">Add your first client to start managing projects</p>
            <Button className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-500">
              <span className="mr-2">+</span> Add First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden h-full">
                <div className={`h-1.5 ${
                  c.status === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                }`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                        c.status === 'active' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">
                          {c.name}
                        </h3>
                        <p className="text-xs text-gray-500">{c.contact_person ?? 'Contact'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4">
                    {c.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-800">{c.total_projects ?? 0}</p>
                        <p className="text-[10px] text-gray-500">Projects</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600">₹{((c.total_revenue ?? 0) / 100000).toFixed(1)}L</p>
                        <p className="text-[10px] text-gray-500">Revenue</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
