'use client';

import { useEffect, useMemo, useState } from 'react';
import { flexRender } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTableToolbar } from '@/components/data-table/toolbar';
import { DataTableColumnHeader } from '@/components/data-table/column-header';
import { DataTablePagination } from '@/components/data-table/pagination';
import { SelectDropdown } from '@/components/select-dropdown';
import { Wallet, ArrowRightLeft, Banknote, CheckCircle, Clock } from 'lucide-react';
import { authFetch } from '@/lib/api/auth-fetch';
import { fetchListStrict } from '@/lib/api/fetch-list';
import { ApiErrorBanner } from '@/components/api-error-banner';

interface Row extends Record<string, unknown> {
  id?: string;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function money(minor: unknown): string {
  return `₹${(num(minor) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CashPage() {
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [transfers, setTransfers] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Row[]>([]);
  const [expected, setExpected] = useState<Row[]>([]);
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ from_account_id: '', to_account_id: '', currency: 'INR', amount: '', reference: '' });
  const [accountForm, setAccountForm] = useState({ name: '', type: 'site_cash' });
  const [error, setError] = useState('');

  const [apiError, setApiError] = useState(false);

  const load = async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [a, t, e] = await Promise.all([
        fetchListStrict<Row>('/api/v1/cash/accounts'),
        fetchListStrict<Row>('/api/v1/cash/transfers'),
        fetchListStrict<Row>('/api/v1/cash/expected'),
      ]);
      // API up → show exactly what's in the DB (empty = empty state)
      setAccounts(a);
      setTransfers(t);
      setExpected(e);
      if (a.length > 0 && !accountId) setAccountId(String(a[0].id));
    } catch {
      // API down → banner only, never fake accounts
      setApiError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (accountId) {
      void fetchListStrict<Row>(`/api/v1/cash/accounts/${accountId}/counts`).then((data) => {
        setCounts(data);
      }).catch(() => setApiError(true));
    }
  }, [accountId]);

  const transfer = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    try {
      const res = await authFetch('/api/v1/cash/transfers', {
        method: 'POST',
        body: JSON.stringify({
          from_account_id: form.from_account_id,
          to_account_id: form.to_account_id,
          currency: form.currency,
          amount_minor: Math.round(parseFloat(form.amount || '0') * 100),
          reference: form.reference || undefined,
          transfer_date: new Date().toISOString().slice(0, 10),
          client_uuid: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        setForm({ from_account_id: '', to_account_id: '', currency: 'INR', amount: '', reference: '' });
        void load();
        return;
      }
      setError('Transfer failed — no money was moved.');
    } catch {
      setError('Transfer failed — the API is unreachable.');
    }
  };

  const addAccount = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    try {
      const res = await authFetch('/api/v1/cash/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: accountForm.name,
          type: accountForm.type,
          currency: 'INR',
        }),
      });
      if (res.ok) {
        setAccountForm({ name: '', type: 'site_cash' });
        void load();
        return;
      }
      setError('Cash account was not created — nothing was saved.');
    } catch {
      setError('Cash account was not created — the API is unreachable.');
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + num(a.balance_minor), 0);

  const countColumns = useMemo<LegacyColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'count_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Date' />,
        cell: ({ row }) => String(row.original.count_date ?? '').slice(0, 10),
      },
      {
        accessorKey: 'counted_minor',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Counted' />,
        cell: ({ row }) => money(row.original.counted_minor),
      },
      {
        accessorKey: 'expected_minor',
        header: ({ column }) => <DataTableColumnHeader column={column} title='Expected' />,
        cell: ({ row }) => money(row.original.expected_minor),
      },
      {
        id: 'variance',
        accessorFn: (row) => num(row.variance_minor),
        header: ({ column }) => <DataTableColumnHeader column={column} title='Variance' />,
        cell: ({ row }) => {
          const v = num(row.original.variance_minor);
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                v === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {v === 0 ? 'Balanced' : money(v)}
            </span>
          );
        },
      },
      {
        accessorKey: 'counted_by',
        header: 'By',
        cell: ({ row }) => String(row.original.counted_by ?? ''),
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ row }) => (
          <span className='text-gray-500'>{String(row.original.note ?? '')}</span>
        ),
      },
    ],
    []
  );

  const countsTable = useLegacyTable({
    data: counts,
    columns: countColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      {apiError && <ApiErrorBanner onRetry={() => { void load(); }} />}
      <div>
        <h1 className="text-3xl font-bold">Cash</h1>
        <p className="text-muted-foreground mt-1">Accounts, remittances and physical counts</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && accounts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No cash accounts yet — add one below so counts, remittances and cash expenses can be recorded.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{money(totalBalance)}</p>
            </div>
            <p className="text-emerald-100 text-xs mt-1">Total Cash Balance</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{transfers.length}</p>
            </div>
            <p className="text-blue-100 text-xs mt-1">Total Transfers</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-2xl">{accounts.length}</p>
            </div>
            <p className="text-violet-100 text-xs mt-1">Cash Accounts</p>
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
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {accounts.map((a) => {
              const ex = expected.find((x) => String(x.account_id) === String(a.id));
              const isSelected = accountId === String(a.id);
              return (
                <Card 
                  key={String(a.id)} 
                  className={`cursor-pointer transition-all hover:shadow-lg overflow-hidden ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
                  onClick={() => setAccountId(String(a.id))}
                >
                  <div className={`h-1.5 ${
                    num(a.balance_minor) > 1000000 ? 'bg-gradient-to-r from-gray-900 to-gray-800' :
                    num(a.balance_minor) > 500000 ? 'bg-gradient-to-r from-gray-950 to-gray-900' :
                    'bg-gradient-to-r from-gray-800 to-gray-700'
                  }`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                          String(a.type) === 'bank' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                          String(a.type) === 'petty' ? 'bg-gradient-to-br from-gray-700 to-gray-600' :
                          'bg-gradient-to-br from-emerald-500 to-teal-600'
                        }`}>
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{String(a.name)}</h3>
                          <p className="text-[10px] text-gray-500">{String(a.type ?? 'operational')}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                        {String(a.currency ?? 'INR')}
                      </span>
                    </div>

                    <div className="text-center py-2">
                      <p className="text-xl font-bold text-gray-800">{money(a.balance_minor)}</p>
                      <p className="text-[10px] text-gray-500">Current Balance</p>
                    </div>

                    {ex && (
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Expected</span>
                          <span className="font-medium">{money(ex.expected_minor)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Count</span>
                          <span className="font-medium">{money(ex.last_count_minor)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Variance</span>
                          <span className={`font-bold ${num(ex.variance_minor) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {num(ex.variance_minor) === 0 ? '✓ Balanced' : money(ex.variance_minor)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Wallet className="h-5 w-5" /> New Cash Account
              </CardTitle>
            </div>
            <CardContent className="pt-6">
              <form onSubmit={(e) => void addAccount(e)} className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <label className="text-sm font-medium text-gray-700">Name *</label>
                  <Input
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="Site Cash — Block A"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <SelectDropdown
                    className="mt-1 w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    isControlled
                    defaultValue={accountForm.type}
                    onValueChange={(value) => setAccountForm({ ...accountForm, type: value })}
                    items={[
                      { label: 'Site cash', value: 'site_cash' },
                      { label: 'Bank', value: 'bank' },
                      { label: 'Petty cash', value: 'petty' },
                    ]}
                  />
                </div>
                <Button type="submit" disabled={!accountForm.name.trim()}>Add account</Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" /> New Remittance
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                <form onSubmit={(e) => void transfer(e)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">From *</label>
                      <select className="w-full border border-gray-200 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={form.from_account_id} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })} required>
                        <option value="">Select...</option>
                        {accounts.map((a) => (
                          <option key={String(a.id)} value={String(a.id)}>{String(a.name)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">To *</label>
                      <select className="w-full border border-gray-200 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })} required>
                        <option value="">Select...</option>
                        {accounts.map((a) => (
                          <option key={String(a.id)} value={String(a.id)}>{String(a.name)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Amount (major) *</label>
                      <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Reference</label>
                      <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Transfer
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Recent Transfers
                </CardTitle>
              </div>
              <CardContent className="pt-6">
                {transfers.length === 0 ? (
                  <p className="text-muted-foreground">No transfers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {transfers.slice(0, 5).map((t) => (
                      <div key={String(t.id)} className="flex items-center justify-between rounded-lg bg-gray-50 p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                            <ArrowRightLeft className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{String(t.reference ?? 'Transfer')}</p>
                            <p className="text-xs text-gray-500">{String(t.transfer_date).slice(0, 10)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-700">{money(t.amount_minor)}</p>
                          <p className="text-[10px] text-gray-500">{String(t.from_name ?? '')} → {String(t.to_name ?? '')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Physical Counts {accountId ? `(${counts.length})` : ''}
              </CardTitle>
            </div>
            <CardContent className="pt-6">
              {counts.length === 0 ? (
                <p className="text-muted-foreground">No counts for this account yet.</p>
              ) : (
                <div className="space-y-3">
                  <DataTableToolbar
                    table={countsTable}
                    searchKey="note"
                    searchPlaceholder="Filter by note..."
                  />
                  <Table>
                    <TableHeader>
                      {countsTable.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {countsTable.getRowModel().rows.length ? (
                        countsTable.getRowModel().rows.map((row) => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={countColumns.length} className="text-center text-muted-foreground">
                            No counts match your filter.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <DataTablePagination table={countsTable} />
                </div>
              )}
              <p className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                Ops counts blind — expected balance is owner-only.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
