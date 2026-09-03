export interface RateCard {
  id: string;
  tenantId: string;
  deploymentId: string;
  effectiveFrom: string;
  strategy: 'hourly' | 'daily' | 'monthly';
  rateMinor: number;
  currency: string;
  minUnitsPerDay?: number;
  standbyRateMinor?: number;
}

export interface BillingLedger {
  id: string;
  tenantId: string;
  deploymentId: string;
  workSessionId?: string;
  rateCardId: string;
  entryDate: string;
  kind: 'work' | 'minimum_topup' | 'standby' | 'monthly_hire' | 'extra_charge' | 'adjustment';
  units: number;
  currency: string;
  amountMinor: number;
  fxRate: number;
  baseMinor: number;
  adjustsId?: string;
}

export interface ClientMoneyEvent {
  id: string;
  tenantId: string;
  clientId: string;
  siteId?: string;
  eventType: 'receipt' | 'advance' | 'credit_note' | 'rebate';
  currency: string;
  amountMinor: number;
  fxRate: number;
  baseMinor: number;
  mode?: string;
  reference?: string;
  slipPhotoKey?: string;
  eventDate: string;
}

export interface ClientReceivable {
  clientId: string;
  clientName: string;
  billedMinor: number;
  extrasMinor: number;
  creditsMinor: number;
  receiptsMinor: number;
  advancesConsumedMinor: number;
  outstandingMinor: number;
  ageingCurrent: number;
  ageing1_30: number;
  ageing31_60: number;
  ageing60Plus: number;
}
