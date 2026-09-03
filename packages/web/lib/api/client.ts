const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchApi(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'API error');
  }
  return res.json();
}

export const api = {
  // Machines
  getMachines: () => fetchApi('/v1/machines'),
  getMachine: (id: string) => fetchApi(`/v1/machines/${id}`),
  createMachine: (data: Record<string, unknown>) => fetchApi('/v1/machines', { method: 'POST', body: JSON.stringify(data) }),

  // Clients
  getClients: () => fetchApi('/v1/clients'),
  getClient: (id: string) => fetchApi(`/v1/clients/${id}`),
  createClient: (data: Record<string, unknown>) => fetchApi('/v1/clients', { method: 'POST', body: JSON.stringify(data) }),

  // Work Sessions
  getWorkSessions: (machineId?: string) => fetchApi(`/v1/work-sessions${machineId ? `?machine_id=${machineId}` : ''}`),
  createWorkSession: (data: Record<string, unknown>) => fetchApi('/v1/work-sessions', { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: () => fetchApi('/v1/expenses'),
  getExpenseCategories: () => fetchApi('/v1/expenses/categories'),
  createExpense: (data: Record<string, unknown>) => fetchApi('/v1/expenses', { method: 'POST', body: JSON.stringify(data) }),

  // Cash
  getCashAccounts: () => fetchApi('/v1/cash/accounts'),
  getCashTransfers: () => fetchApi('/v1/cash/transfers'),
  createCashTransfer: (data: Record<string, unknown>) => fetchApi('/v1/cash/transfers', { method: 'POST', body: JSON.stringify(data) }),

  // Billing
  getReceivables: () => fetchApi('/v1/billing/receivables'),
  getUnusedAdvances: () => fetchApi('/v1/billing/unused-advances'),
  getMachineContribution: () => fetchApi('/v1/billing/contribution'),
  getKPIs: () => fetchApi('/v1/billing/kpis'),

  // Maintenance
  getMaintenanceStatus: (machineId: string) => fetchApi(`/v1/maintenance/machines/${machineId}/status`),
  getMaintenanceVisits: (machineId: string) => fetchApi(`/v1/maintenance/machines/${machineId}/visits`),
};
