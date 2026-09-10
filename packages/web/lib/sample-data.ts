const now = Date.now();
const h = (hours: number) => hours * 3_600_000;
const d = (days: number) => days * 86_400_000;

export const sampleMachines = [
  { id: 'm1', code: 'EXC-001', type: 'Excavator', status_flag: 'working', site: 'Site A', site_id: 'site1', site_name: 'Mumbai Metro Phase 2' },
  { id: 'm2', code: 'JCB-002', type: 'Backhoe Loader', status_flag: 'working', site: 'Site A', site_id: 'site1', site_name: 'Mumbai Metro Phase 2' },
  { id: 'm3', code: 'CRN-003', type: 'Crane', status_flag: 'service', site: 'Site B', site_id: 'site2', site_name: 'Pune IT Park Expansion' },
  { id: 'm4', code: 'DMP-004', type: 'Dump Truck', status_flag: 'working', site: 'Site B', site_id: 'site2', site_name: 'Pune IT Park Expansion' },
  { id: 'm5', code: 'BLR-005', type: 'Bulldozer', status_flag: 'stopped', site: 'Site C', site_id: 'site3', site_name: 'Navi Mumbai Highway' },
  { id: 'm6', code: 'ADT-006', type: 'Articulated Truck', status_flag: 'transit', site: 'Site A', site_id: 'site1', site_name: 'Mumbai Metro Phase 2' },
];

export const sampleSessions = [
  { id: 's1', machine_id: 'm1', start_at: new Date(now - h(6)).toISOString(), end_at: new Date(now - h(1)).toISOString(), start_meter: 12450, end_meter: 12498, billable: true, created_by: 'op1' },
  { id: 's2', machine_id: 'm2', start_at: new Date(now - h(4)).toISOString(), end_at: new Date(now - h(0.5)).toISOString(), start_meter: 8920, end_meter: 8955, billable: true, created_by: 'op1' },
  { id: 's3', machine_id: 'm4', start_at: new Date(now - h(8)).toISOString(), end_at: null, start_meter: 34100, end_meter: null, billable: true, created_by: 'op2' },
  { id: 's4', machine_id: 'm1', start_at: new Date(now - d(1) - h(3)).toISOString(), end_at: new Date(now - d(1) - h(0.5)).toISOString(), start_meter: 12400, end_meter: 12445, billable: true, created_by: 'op1' },
  { id: 's5', machine_id: 'm3', start_at: new Date(now - d(1) - h(6)).toISOString(), end_at: new Date(now - d(1) - h(2)).toISOString(), start_meter: 5600, end_meter: 5630, billable: false, created_by: 'op2' },
  { id: 's6', machine_id: 'm6', start_at: new Date(now - h(2)).toISOString(), end_at: null, start_meter: 15800, end_meter: null, billable: true, created_by: 'op1' },
];

export const sampleFuelLogs = [
  { id: 'f1', machine_id: 'm1', fuel_date: new Date(now - h(7)).toISOString().slice(0, 10), litres: 120, cost_minor: 13200, currency: 'INR', vendor: 'HP Station', created_at: new Date(now - h(7)).toISOString() },
  { id: 'f2', machine_id: 'm2', fuel_date: new Date(now - h(5)).toISOString().slice(0, 10), litres: 85, cost_minor: 9350, currency: 'INR', vendor: 'BPCL Depot', created_at: new Date(now - h(5)).toISOString() },
  { id: 'f3', machine_id: 'm4', fuel_date: new Date(now - h(3)).toISOString().slice(0, 10), litres: 200, cost_minor: 22000, currency: 'INR', vendor: 'IOCL Pump', created_at: new Date(now - h(3)).toISOString() },
  { id: 'f4', machine_id: 'm1', fuel_date: new Date(now - d(1) - h(4)).toISOString().slice(0, 10), litres: 110, cost_minor: 12100, currency: 'INR', vendor: 'HP Station', created_at: new Date(now - d(1) - h(4)).toISOString() },
  { id: 'f5', machine_id: 'm6', fuel_date: new Date(now - h(1)).toISOString().slice(0, 10), litres: 150, cost_minor: 16500, currency: 'INR', vendor: 'Shell', created_at: new Date(now - h(1)).toISOString() },
];

export const sampleDowntime = [
  { id: 'd1', machine_id: 'm5', started_at: new Date(now - h(10)).toISOString(), ended_at: new Date(now - h(6)).toISOString(), reason_code: 'breakdown', note: 'Hydraulic pump failure', machine_code: 'BLR-005' },
  { id: 'd2', machine_id: 'm3', started_at: new Date(now - h(48)).toISOString(), ended_at: new Date(now - h(36)).toISOString(), reason_code: 'transport', note: 'Moved to Site B', machine_code: 'CRN-003' },
  { id: 'd3', machine_id: 'm1', started_at: new Date(now - h(2)).toISOString(), ended_at: null, reason_code: 'no_work_client', note: 'Client delayed excavation area clearance', machine_code: 'EXC-001' },
];

export const sampleExpenses = [
  { id: 'e1', date: new Date(now - h(6)).toISOString().slice(0, 10), description: 'Engine oil top-up', amount_minor: 2800, currency: 'INR', needs_verification: false, expense_categories: { name: 'Lubricants' } },
  { id: 'e2', date: new Date(now - h(5)).toISOString().slice(0, 10), description: 'Hydraulic filter replacement', amount_minor: 4500, currency: 'INR', needs_verification: true, expense_categories: { name: 'Spare Parts' } },
  { id: 'e3', date: new Date(now - d(1)).toISOString().slice(0, 10), description: 'Operator lunch allowance', amount_minor: 600, currency: 'INR', needs_verification: false, expense_categories: { name: 'Food & Beverage' } },
  { id: 'e4', date: new Date(now - d(1)).toISOString().slice(0, 10), description: 'Diesel fuel pump rental', amount_minor: 15000, currency: 'INR', needs_verification: true, expense_categories: { name: 'Equipment Rental' } },
];

export const sampleReceipts = [
  { id: 'r1', client_id: 'c1', event_type: 'receipt', amount_minor: 250000, currency: 'INR', event_date: new Date(now - d(2)).toISOString().slice(0, 10), client_name: 'Tata Projects' },
  { id: 'r2', client_id: 'c2', event_type: 'advance', amount_minor: 50000, currency: 'INR', event_date: new Date(now - d(1)).toISOString().slice(0, 10), client_name: 'L&T Construction' },
  { id: 'r3', client_id: 'c1', event_type: 'receipt', amount_minor: 180000, currency: 'INR', event_date: new Date(now - h(8)).toISOString().slice(0, 10), client_name: 'Tata Projects' },
];

export const sampleMaintenance = [
  { id: 'mv1', visit_date: new Date(now - d(3)).toISOString().slice(0, 10), visit_type: 'scheduled', mechanic: 'Raj Kumar', machine_code: 'EXC-001' },
  { id: 'mv2', visit_date: new Date(now - d(7)).toISOString().slice(0, 10), visit_type: 'breakdown', mechanic: 'Suresh Patel', machine_code: 'BLR-005' },
  { id: 'mv3', visit_date: new Date(now - d(14)).toISOString().slice(0, 10), visit_type: 'inspection', mechanic: 'Anil Singh', machine_code: 'JCB-002' },
];

export const sampleAlerts = [
  { id: 'a1', severity: 'critical', message: 'BLR-005 hydraulic failure — overdue repair', type: 'maintenance' },
  { id: 'a2', severity: 'warning', message: 'EXC-001 fuel efficiency dropped 15% this week', type: 'performance' },
  { id: 'a3', severity: 'warning', message: 'CRN-003 service due in 2 operating hours', type: 'maintenance' },
];

export const sampleClients = [
  { id: 'c1', name: 'Tata Projects', contact_person: 'Ravi Shankar', phone: '+91 98200 12345', email: 'ravi@tataprojects.com', address: 'Mumbai, Maharashtra', currency: 'INR', payment_terms_days: 30, total_projects: 2, total_revenue: 4500000, status: 'active' },
  { id: 'c2', name: 'L&T Construction', contact_person: 'Priya Mehta', phone: '+91 98200 12346', email: 'priya@lnt.com', address: 'Pune, Maharashtra', currency: 'INR', payment_terms_days: 45, total_projects: 1, total_revenue: 2800000, status: 'active' },
  { id: 'c3', name: 'Reliance Infra', contact_person: 'Amit Sharma', phone: '+91 98200 12347', email: 'amit@relianceinfra.com', address: 'Navi Mumbai, Maharashtra', currency: 'INR', payment_terms_days: 30, total_projects: 1, total_revenue: 1500000, status: 'active' },
  { id: 'c4', name: 'Adani Enterprises', contact_person: 'Neha Gupta', phone: '+91 98200 12348', email: 'neha@adani.com', address: 'Ahmedabad, Gujarat', currency: 'INR', payment_terms_days: 60, total_projects: 0, total_revenue: 0, status: 'inactive' },
];

export const sampleCashAccounts = [
  { id: 'ca1', name: 'Main Site Office', type: 'operational', currency: 'INR', balance_minor: 2850000, status: 'active' },
  { id: 'ca2', name: 'Petty Cash', type: 'petty', currency: 'INR', balance_minor: 450000, status: 'active' },
  { id: 'ca3', name: 'Bank Account - SBI', type: 'bank', currency: 'INR', balance_minor: 12500000, status: 'active' },
  { id: 'ca4', name: 'Diesel Fund', type: 'operational', currency: 'INR', balance_minor: 850000, status: 'active' },
];

export const sampleCashTransfers = [
  { id: 'ct1', from_account_id: 'ca3', to_account_id: 'ca1', from_name: 'Bank Account - SBI', to_name: 'Main Site Office', amount_minor: 500000, reference: 'Monthly site cash', transfer_date: '2025-03-15', status: 'completed' },
  { id: 'ct2', from_account_id: 'ca1', to_account_id: 'ca2', from_name: 'Main Site Office', to_name: 'Petty Cash', amount_minor: 50000, reference: 'Petty cash refill', transfer_date: '2025-03-18', status: 'completed' },
  { id: 'ct3', from_account_id: 'ca3', to_account_id: 'ca4', from_name: 'Bank Account - SBI', to_name: 'Diesel Fund', amount_minor: 200000, reference: 'Fuel purchase', transfer_date: '2025-03-20', status: 'completed' },
  { id: 'ct4', from_account_id: 'ca1', to_account_id: 'ca4', from_name: 'Main Site Office', to_name: 'Diesel Fund', amount_minor: 75000, reference: 'Emergency fuel', transfer_date: '2025-03-22', status: 'pending' },
];

export const sampleCashCounts = [
  { id: 'cc1', account_id: 'ca1', account_name: 'Main Site Office', count_date: '2025-03-22', counted_minor: 2850000, expected_minor: 2850000, variance_minor: 0, counted_by: 'Rajesh Kumar', note: 'End of week count' },
  { id: 'cc2', account_id: 'ca2', account_name: 'Petty Cash', count_date: '2025-03-22', counted_minor: 420000, expected_minor: 450000, variance_minor: -30000, counted_by: 'Suresh Patel', note: 'Missing receipt for ₹300' },
  { id: 'cc3', account_id: 'ca1', account_name: 'Main Site Office', count_date: '2025-03-15', counted_minor: 2350000, expected_minor: 2350000, variance_minor: 0, counted_by: 'Rajesh Kumar', note: 'Weekly count' },
  { id: 'cc4', account_id: 'ca4', account_name: 'Diesel Fund', count_date: '2025-03-20', counted_minor: 975000, expected_minor: 1000000, variance_minor: -25000, counted_by: 'Anil Singh', note: 'After bulk purchase' },
];

export const sampleSites = [
  { id: 'site1', name: 'Mumbai Metro Phase 2', address: 'Marunji Road, Pune', client_id: 'c1', client_name: 'Tata Projects', status: 'active', machine_count: 3, start_date: '2025-01-15', estimated_end_date: '2025-12-31' },
  { id: 'site2', name: 'Pune IT Park Expansion', address: 'Hinjewadi Phase 3, Pune', client_id: 'c2', client_name: 'L&T Construction', status: 'active', machine_count: 2, start_date: '2025-03-01', estimated_end_date: '2025-09-30' },
  { id: 'site3', name: 'Navi Mumbai Highway', address: 'Panvel-JNPT Road', client_id: 'c3', client_name: 'Reliance Infra', status: 'planning', machine_count: 1, start_date: '2025-06-01', estimated_end_date: '2026-03-31' },
  { id: 'site4', name: 'Thane Creek Bridge Repair', address: 'Thane-Belapur Road', client_id: 'c1', client_name: 'Tata Projects', status: 'completed', machine_count: 0, start_date: '2024-06-01', estimated_end_date: '2025-02-28' },
];

export const sampleDeployments = [
  { id: 'dep1', machine_id: 'm1', site_id: 'site1', site_name: 'Mumbai Metro Phase 2', machine_code: 'EXC-001', machine_type: 'Excavator', status: 'active', start_date: '2025-01-15', end_date: undefined },
  { id: 'dep2', machine_id: 'm2', site_id: 'site1', site_name: 'Mumbai Metro Phase 2', machine_code: 'JCB-002', machine_type: 'Backhoe Loader', status: 'active', start_date: '2025-01-20', end_date: undefined },
  { id: 'dep3', machine_id: 'm6', site_id: 'site1', site_name: 'Mumbai Metro Phase 2', machine_code: 'ADT-006', machine_type: 'Articulated Truck', status: 'active', start_date: '2025-02-01', end_date: undefined },
  { id: 'dep4', machine_id: 'm3', site_id: 'site2', site_name: 'Pune IT Park Expansion', machine_code: 'CRN-003', machine_type: 'Crane', status: 'active', start_date: '2025-03-01', end_date: undefined },
  { id: 'dep5', machine_id: 'm4', site_id: 'site2', site_name: 'Pune IT Park Expansion', machine_code: 'DMP-004', machine_type: 'Dump Truck', status: 'active', start_date: '2025-03-10', end_date: undefined },
  { id: 'dep6', machine_id: 'm5', site_id: 'site3', site_name: 'Navi Mumbai Highway', machine_code: 'BLR-005', machine_type: 'Bulldozer', status: 'pending', start_date: '2025-06-01', end_date: undefined },
];

export const sampleUsers = [
  { id: 'u1', name: 'Rajesh Kumar', email: 'rajesh@fleetos.com', role: 'ops' },
  { id: 'u2', name: 'Suresh Patel', email: 'suresh@fleetos.com', role: 'ops' },
  { id: 'u3', name: 'Anil Singh', email: 'anil@fleetos.com', role: 'ops' },
  { id: 'u4', name: 'Demo Owner', email: 'demo@fleetos.com', role: 'owner' },
];

export const sampleOperators = [
  { id: 'op1', name: 'Rajesh Kumar', phone: '+91 98765 43210', license: 'MH-2023-4521', experience_years: 8, specialization: 'Excavator', is_active: true, assigned_machine: 'EXC-001', site: 'Mumbai Metro Phase 2' },
  { id: 'op2', name: 'Suresh Patel', phone: '+91 98765 43211', license: 'MH-2023-4522', experience_years: 12, specialization: 'Crane', is_active: true, assigned_machine: 'CRN-003', site: 'Pune IT Park Expansion' },
  { id: 'op3', name: 'Anil Singh', phone: '+91 98765 43212', license: 'MH-2023-4523', experience_years: 5, specialization: 'Bulldozer', is_active: true, assigned_machine: 'BLR-005', site: 'Navi Mumbai Highway' },
  { id: 'op4', name: 'Vikram Deshmukh', phone: '+91 98765 43213', license: 'MH-2023-4524', experience_years: 10, specialization: 'Dump Truck', is_active: true, assigned_machine: 'DMP-004', site: 'Pune IT Park Expansion' },
  { id: 'op5', name: 'Amit Jadhav', phone: '+91 98765 43214', license: 'MH-2023-4525', experience_years: 3, specialization: 'Backhoe Loader', is_active: false, assigned_machine: null, site: null },
];

export const sampleRateCards = [
  { id: 'rc1', deployment_id: 'dep1', machine_code: 'EXC-001', site_name: 'Mumbai Metro Phase 2', strategy: 'hourly', rate_minor: 180000, currency: 'INR', min_units_per_day: 4, effective_from: '2025-01-15', status: 'active' },
  { id: 'rc2', deployment_id: 'dep2', machine_code: 'JCB-002', site_name: 'Mumbai Metro Phase 2', strategy: 'hourly', rate_minor: 120000, currency: 'INR', min_units_per_day: 4, effective_from: '2025-01-20', status: 'active' },
  { id: 'rc3', deployment_id: 'dep4', machine_code: 'CRN-003', site_name: 'Pune IT Park Expansion', strategy: 'daily', rate_minor: 850000, currency: 'INR', min_units_per_day: 1, effective_from: '2025-03-01', status: 'active' },
  { id: 'rc4', deployment_id: 'dep5', machine_code: 'DMP-004', site_name: 'Pune IT Park Expansion', strategy: 'hourly', rate_minor: 95000, currency: 'INR', min_units_per_day: 6, effective_from: '2025-03-10', status: 'active' },
];

export const sampleContribution = [
  { id: 'cb1', machine_id: 'm1', machine_code: 'EXC-001', billed_minor: 450000, diesel_minor: 132000, parts_minor: 28000, labour_minor: 15000, net_minor: 275000, period: '2025-03' },
  { id: 'cb2', machine_id: 'm2', machine_code: 'JCB-002', billed_minor: 280000, diesel_minor: 93500, parts_minor: 12000, labour_minor: 8000, net_minor: 166500, period: '2025-03' },
  { id: 'cb3', machine_id: 'm3', machine_code: 'CRN-003', billed_minor: 510000, diesel_minor: 85000, parts_minor: 45000, labour_minor: 22000, net_minor: 358000, period: '2025-03' },
  { id: 'cb4', machine_id: 'm4', machine_code: 'DMP-004', billed_minor: 340000, diesel_minor: 110000, parts_minor: 18000, labour_minor: 10000, net_minor: 202000, period: '2025-03' },
];

export const sampleReceivables = [
  { id: 'r1', client_id: 'c1', client_name: 'Tata Projects', billed_minor: 960000, extras_minor: 45000, credits_minor: 250000, receipts_minor: 500000, advances_consumed_minor: 0, balance_minor: 255000 },
  { id: 'r2', client_id: 'c2', client_name: 'L&T Construction', billed_minor: 850000, extras_minor: 32000, credits_minor: 50000, receipts_minor: 400000, advances_consumed_minor: 100000, balance_minor: 332000 },
  { id: 'r3', client_id: 'c3', client_name: 'Reliance Infra', billed_minor: 340000, extras_minor: 15000, credits_minor: 0, receipts_minor: 200000, advances_consumed_minor: 50000, balance_minor: 105000 },
];

export const sampleExtraCharges = [
  { id: 'ec1', kind: 'Fuel Surcharge', date: '2025-03-15', amount_minor: 12500, machine_code: 'EXC-001', client_name: 'Tata Projects' },
  { id: 'ec2', kind: 'Overtime', date: '2025-03-18', amount_minor: 18000, machine_code: 'CRN-003', client_name: 'L&T Construction' },
  { id: 'ec3', kind: 'Transport Fee', date: '2025-03-20', amount_minor: 8500, machine_code: 'DMP-004', client_name: 'Pune IT Park Expansion' },
];

export const sampleProjections = [
  { 
    id: 'proj1', 
    name: 'Mumbai Metro Phase 2', 
    machine_code: 'EXC-001', 
    working_days: 26, 
    units_per_day: 8, 
    rate_minor: 180000, 
    currency: 'INR',
    projected_billing_minor: 37440000,
    projected_costs_minor: 18720000,
    projected_contribution_minor: 18720000,
    expense_ratio: 50,
    status: 'active'
  },
  { 
    id: 'proj2', 
    name: 'Pune IT Park Expansion', 
    machine_code: 'CRN-003', 
    working_days: 26, 
    units_per_day: 1, 
    rate_minor: 850000, 
    currency: 'INR',
    projected_billing_minor: 22100000,
    projected_costs_minor: 11050000,
    projected_contribution_minor: 11050000,
    expense_ratio: 50,
    status: 'active'
  },
  { 
    id: 'proj3', 
    name: 'Navi Mumbai Highway', 
    machine_code: 'BLR-005', 
    working_days: 24, 
    units_per_day: 6, 
    rate_minor: 95000, 
    currency: 'INR',
    projected_billing_minor: 13680000,
    projected_costs_minor: 6840000,
    projected_contribution_minor: 6840000,
    expense_ratio: 50,
    status: 'planning'
  },
];

export const sampleAuditEntries = [
  { id: 'a1', operation: 'INSERT', table_name: 'work_sessions', record_id: 's1', user_name: 'Rajesh Kumar', user_email: 'rajesh@fleetos.com', created_at: new Date(now - h(6)).toISOString(), data: { machine_id: 'm1', start_meter: 12450 } },
  { id: 'a2', operation: 'INSERT', table_name: 'fuel_logs', record_id: 'f1', user_name: 'Rajesh Kumar', user_email: 'rajesh@fleetos.com', created_at: new Date(now - h(7)).toISOString(), data: { machine_id: 'm1', litres: 120 } },
  { id: 'a3', operation: 'UPDATE', table_name: 'work_sessions', record_id: 's1', user_name: 'Rajesh Kumar', user_email: 'rajesh@fleetos.com', created_at: new Date(now - h(1)).toISOString(), data: { end_meter: 12498 } },
  { id: 'a4', operation: 'INSERT', table_name: 'expenses', record_id: 'e1', user_name: 'Suresh Patel', user_email: 'suresh@fleetos.com', created_at: new Date(now - h(6)).toISOString(), data: { amount_minor: 2800, category: 'Lubricants' } },
  { id: 'a5', operation: 'INSERT', table_name: 'downtime_segments', record_id: 'd1', user_name: 'Anil Singh', user_email: 'anil@fleetos.com', created_at: new Date(now - h(10)).toISOString(), data: { machine_id: 'm5', reason_code: 'breakdown' } },
  { id: 'a6', operation: 'INSERT', table_name: 'client_money_events', record_id: 'r1', user_name: 'Demo Owner', user_email: 'demo@fleetos.com', created_at: new Date(now - d(2)).toISOString(), data: { client_id: 'c1', event_type: 'receipt', amount_minor: 250000 } },
  { id: 'a7', operation: 'INSERT', table_name: 'work_sessions', record_id: 's2', user_name: 'Suresh Patel', user_email: 'suresh@fleetos.com', created_at: new Date(now - h(4)).toISOString(), data: { machine_id: 'm2', start_meter: 8920 } },
  { id: 'a8', operation: 'INSERT', table_name: 'fuel_logs', record_id: 'f2', user_name: 'Suresh Patel', user_email: 'suresh@fleetos.com', created_at: new Date(now - h(5)).toISOString(), data: { machine_id: 'm2', litres: 85 } },
];
