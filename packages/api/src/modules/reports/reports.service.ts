import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

export interface ProjectionInput {
  workingDays: number;
  unitsPerDay: number;
  rateMinor: number;
  currency: string;
}

/**
 * Projections v1 (RPT-05): working days × units/day × rate → projected
 * billing; projected contribution applies the trailing-30d expense ratio
 * as the cost heuristic, labelled as such.
 */
@Injectable()
export class ReportsService {
  constructor(private db: DatabaseService) {}

  async getProjectionInputs(tenantId: string) {
    const result = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_projection_inputs WHERE tenant_id = $1`, [tenantId]);
    return result.rows[0];
  }

  async project(tenantId: string, input: ProjectionInput) {
    const kpis = await this.db.queryWithTenant(tenantId, 'owner',
      `SELECT * FROM tenant.v_tenant_kpis WHERE tenant_id = $1`, [tenantId]);
    const kpi = kpis.rows[0] ?? {};
    const billed = Number(kpi.total_billed_minor ?? 0);
    const expenses = Number(kpi.total_expenses_minor ?? 0);
    const expenseRatio = billed > 0 ? expenses / billed : 0;

    const projectedBilling = Math.round(input.workingDays * input.unitsPerDay * input.rateMinor);
    const projectedCosts = Math.round(projectedBilling * expenseRatio);
    return {
      inputs: input,
      expense_ratio: Math.round(expenseRatio * 1000) / 10,
      projected_billing_minor: projectedBilling,
      projected_costs_minor: projectedCosts,
      projected_contribution_minor: projectedBilling - projectedCosts,
      currency: input.currency,
      note: 'Costs projected from the trailing expense ratio; not a commitment.',
    };
  }
}
