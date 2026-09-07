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

export interface Machine {
  id: string;
  tenantId: string;
  code: string;
  type: string;
  make?: string;
  model?: string;
  year?: number;
  chassisNo?: string;
  primaryMeterType: 'hours' | 'km' | 'cycles' | 'metres' | 'tonnes' | 'trips';
  meterUnitLabel: string;
  currentMeter: number;
  statusFlag?: string;
  flagNote?: string;
  photoKey?: string;
  attributes?: Record<string, unknown>;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  contact?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  currency: string;
  paymentTermsDays: number;
}

export interface Site {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  startDate?: string;
  endDate?: string;
}

export interface Deployment {
  id: string;
  tenantId: string;
  machineId: string;
  siteId: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'on_hold_payment' | 'ended';
}

export interface Operator {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  isActive: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  cognitoSub: string;
  email: string;
  name: string;
  role: 'owner' | 'ops';
  isActive: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  country: string;
  baseCurrency: string;
  timezone?: string;
  status: 'active' | 'suspended' | 'archived' | 'pending_deletion';
  retentionMonths: number;
  legalHold: boolean;
}

export interface CashAccount {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  currency: string;
  isActive: boolean;
}

export interface CashTransfer {
  id: string;
  tenantId: string;
  fromAccountId: string;
  toAccountId: string;
  currency: string;
  amountMinor: number;
  fxRate: number;
  baseMinor: number;
  reference?: string;
  photoKey?: string;
  transferDate: string;
}

export interface MaintenanceTask {
  id: string;
  tenantId: string;
  machineId: string;
  name: string;
  trigger: 'meter' | 'calendar';
  intervalValue: number;
  warningValue: number;
  lastDoneValue?: number;
  lastDoneDate?: string;
  nextDueValue?: number;
  nextDueDate?: string;
}

export interface MaintenanceVisitTask {
  visitId: string;
  taskId: string;
}

export interface MaintenancePart {
  id: string;
  tenantId: string;
  visitId: string;
  item: string;
  qty: number;
  unitCostTxn: number;
  currency: string;
  fx: number;
  base: number;
  isConsumable: boolean;
  meterAtChange?: number;
}

export interface ExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
  type: string;
}

export interface Alert {
  id: string;
  tenantId: string;
  type: string;
  machineId?: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string;
  channel: string;
  template: string;
  variables: Record<string, string>;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  phone?: string;
  sentAt?: string;
  error?: string;
}

export interface Photo {
  id: string;
  tenantId: string;
  s3KeyOriginal: string;
  s3KeyThumb?: string;
  sha256Server?: string;
  sha256Device?: string;
  sizeBytes?: number;
  takenAtDevice?: string;
  receivedAt: string;
  lat?: number;
  lng?: number;
  gpsAccuracyM?: number;
  captureSource: 'camera' | 'gallery' | ' web';
  uploadedBy: string;
  ocrResult?: Record<string, unknown>;
}

export interface InsightNote {
  id: string;
  tenantId: string;
  insightType: string;
  entityId?: string;
  note: string;
  createdBy: string;
}
