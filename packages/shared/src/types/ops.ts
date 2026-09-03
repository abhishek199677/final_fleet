export interface WorkSession {
  id: string;
  tenantId: string;
  machineId: string;
  deploymentId: string;
  operatorId: string;
  helperId?: string;
  startAt: string;
  endAt?: string;
  startMeter: number;
  endMeter?: number;
  unitsRun?: number;
  activity?: string;
  billable: boolean;
  overrideReason?: string;
  notes?: string;
}

export interface FuelLog {
  id: string;
  tenantId: string;
  machineId: string;
  workSessionId?: string;
  litres: number;
  costMinor: number;
  currency: string;
  fxRate?: number;
  baseMinor?: number;
  receiptPhotoKey?: string;
}

export interface DowntimeSegment {
  id: string;
  tenantId: string;
  machineId: string;
  workSessionId?: string;
  startedAt: string;
  endedAt?: string;
  reasonCode: string;
  note?: string;
  photoKey?: string;
}

export interface MaintenanceVisit {
  id: string;
  tenantId: string;
  machineId: string;
  visitDate: string;
  visitType: string;
  mechanic: string;
  meterAtVisit: number;
  checklist?: Record<string, unknown>;
  labourCostTxn?: number;
  labourCurrency?: string;
  labourFx?: number;
  labourBase?: number;
  notes?: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  date: string;
  categoryId: string;
  description: string;
  currency: string;
  amountMinor: number;
  fxRate: number;
  baseMinor: number;
  cashAccountId: string;
  paidBy: string;
  allocationType?: string;
  siteId?: string;
  machineId?: string;
  receiptPhotoKey?: string;
  needsVerification: boolean;
  note?: string;
}

export interface CashCount {
  id: string;
  tenantId: string;
  cashAccountId: string;
  countDate: string;
  counted: Record<string, number>;
  photoKey?: string;
  note?: string;
}
