import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

interface DailyEarning {
  date: string;
  hours: number;
  amount: number;
}

export interface MachineInsight {
  machine_code: string;
  machine_id: string;
  type: string;
  make: string;
  model: string;
  year: number;
  health_score: number;
  status: string;
  performance_summary: string;
  issues: string[];
  earnings_per_day: DailyEarning[];
  earnings_total: {
    total: number;
    daily_average: number;
    monthly_estimate: number;
    currency: string;
  };
  recommendations: string[];
  stats: {
    total_hours: number;
    billable_hours: number;
    billable_ratio: number;
    total_sessions: number;
    downtime_hours: number;
    downtime_events: number;
    fuel_litres: number;
    fuel_cost: number;
    avg_session_hours: number;
    days_since_last_session: number;
    current_meter: number;
    meter_unit: string;
  };
}

@Injectable()
export class InsightsService {
  constructor(private db: DatabaseService) {}

  async generateAiInsights(tenantId: string): Promise<{ insights: MachineInsight[]; generated_at: string }> {
    const q = async (text: string, params: unknown[] = []) =>
      (await this.db.queryWithTenant(tenantId, 'owner', text, params)).rows;

    const machines = await q(`SELECT * FROM tenant.machines WHERE tenant_id = $1 ORDER BY code`, [tenantId]);
    if (machines.length === 0) return { insights: [], generated_at: new Date().toISOString() };

    const allSessions = await q(
      `SELECT ws.*, op.name AS operator_name
       FROM tenant.work_sessions ws
       LEFT JOIN tenant.operators op ON op.id = ws.operator_id
       WHERE ws.tenant_id = $1 ORDER BY ws.start_at`, [tenantId],
    );
    const allDowntime = await q(
      `SELECT * FROM tenant.downtime_segments WHERE tenant_id = $1 ORDER BY started_at`, [tenantId],
    );
    const allFuel = await q(
      `SELECT * FROM tenant.fuel_logs WHERE tenant_id = $1 ORDER BY created_at`, [tenantId],
    );
    const rateCards = await q(
      `SELECT rc.*, d.machine_id FROM tenant.rate_cards rc
       JOIN tenant.deployments d ON d.id = rc.deployment_id
       WHERE rc.tenant_id = $1`, [tenantId],
    );
    const allExpenses = await q(
      `SELECT * FROM tenant.expenses WHERE tenant_id = $1`, [tenantId],
    );
    const maintenanceTasks = await q(
      `SELECT * FROM tenant.maintenance_tasks WHERE tenant_id = $1`, [tenantId],
    );

    const now = Date.now();
    const today = new Date(now).toISOString().split('T')[0];

    const insights = machines.map((m: Record<string, unknown>) => {
      const mSessions = allSessions.filter((s: Record<string, unknown>) => s.machine_id === m.id);
      const mDowntime = allDowntime.filter((d: Record<string, unknown>) => d.machine_id === m.id);
      const mFuel = allFuel.filter((f: Record<string, unknown>) => f.machine_id === m.id);
      const rc = rateCards.find((r: Record<string, unknown>) => r.machine_id === m.id);
      const mExpenses = allExpenses.filter((e: Record<string, unknown>) => e.machine_id === m.id);
      const mMaintenance = maintenanceTasks.filter((t: Record<string, unknown>) => t.machine_id === m.id);

      // ── Hours & Sessions ──
      const sessionData = mSessions.map((s: Record<string, unknown>) => {
        const a = new Date(String(s.start_at ?? '')).getTime();
        const b = s.end_at ? new Date(String(s.end_at)).getTime() : now;
        const hours = a && b && b > a ? Math.min((b - a) / 3_600_000, 24) : 0;
        const units = Number(s.units_run ?? 0);
        return { ...s, _hours: hours, _units: units, _date: String(s.start_at ?? '').slice(0, 10) };
      });

      const totalHours = sessionData.reduce((s, d) => s + d._hours, 0);
      const billableHours = sessionData.filter((d) => (d as Record<string, unknown>).billable).reduce((s, d) => s + d._hours, 0);
      const totalUnits = sessionData.reduce((s, d) => s + d._units, 0);
      const billableRatio = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
      const avgSessionHours = mSessions.length > 0 ? totalHours / mSessions.length : 0;

      // ── Downtime ──
      const dtData = mDowntime.map((d: Record<string, unknown>) => {
        const a = new Date(String(d.started_at ?? '')).getTime();
        const b = d.ended_at ? new Date(String(d.ended_at)).getTime() : now;
        return { ...d, _hours: a && b && b > a ? (b - a) / 3_600_000 : 0 };
      });
      const dtHours = dtData.reduce((s, d) => s + d._hours, 0);

      // ── Fuel ──
      const totalFuelLitres = mFuel.reduce((s, f: Record<string, unknown>) => s + Number(f.litres ?? 0), 0);
      const totalFuelCost = mFuel.reduce((s, f: Record<string, unknown>) => s + Number(f.cost_minor ?? 0), 0);

      // ── Expenses ──
      const totalExpenses = mExpenses.reduce((s, e: Record<string, unknown>) => s + Number(e.amount_minor ?? 0), 0);

      // ── Rate & Earnings ──
      const ratePerHour = rc ? Number(rc.rate_minor ?? 0) / 100 : 0;
      const currency = rc ? String(rc.currency ?? 'INR') : 'INR';

      // Daily earnings breakdown
      const dailyMap = new Map<string, { hours: number; amount: number }>();
      for (const sd of sessionData) {
        const day = sd._date;
        const existing = dailyMap.get(day) || { hours: 0, amount: 0 };
        existing.hours += sd._hours;
        existing.amount += sd._hours * ratePerHour;
        dailyMap.set(day, existing);
      }
      const earningsPerDay: DailyEarning[] = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, hours: Math.round(data.hours * 10) / 10, amount: Math.round(data.amount) }));

      const totalEarnings = earningsPerDay.reduce((s, d) => s + d.amount, 0);
      const activeDays = earningsPerDay.length || 1;
      const dailyAverage = Math.round(totalEarnings / activeDays);
      const monthlyEstimate = Math.round(dailyAverage * 26);

      // ── Days since last session ──
      const lastSession = mSessions.length > 0
        ? new Date(String(mSessions[mSessions.length - 1].start_at ?? '')).getTime()
        : 0;
      const daysSinceLastSession = lastSession ? Math.floor((now - lastSession) / 86_400_000) : 999;

      // ── Maintenance ──
      const overdueMaintenance = mMaintenance.filter((t: Record<string, unknown>) => {
        const nextDue = Number(t.next_due_value ?? Infinity);
        const meter = Number(m.current_meter ?? 0);
        return nextDue <= meter;
      });

      // ── Status ──
      const hasSessionToday = mSessions.some((s: Record<string, unknown>) =>
        s.start_at && String(s.start_at).startsWith(today),
      );
      let status = 'idle';
      if (hasSessionToday) status = 'operating';
      else if (mDowntime.length > 0) status = 'downtime';

      // ── Issues ──
      const issues: string[] = [];
      if (dtHours > 0) {
        const reasons = [...new Set(mDowntime.map((d: Record<string, unknown>) => String(d.reason_code ?? '')))];
        issues.push(`${dtHours.toFixed(1)} hours of downtime (${reasons.join(', ')})`);
      }
      if (overdueMaintenance.length > 0) {
        issues.push(`${overdueMaintenance.length} overdue maintenance task(s)`);
      }
      if (daysSinceLastSession > 7 && m.status_flag !== 'retired') {
        issues.push(`No activity for ${daysSinceLastSession} days`);
      }
      if (billableRatio < 80 && totalHours > 0) {
        issues.push(`Low billable ratio (${billableRatio}%)`);
      }
      if (mSessions.length === 0) {
        issues.push('No work sessions recorded');
      }
      if (issues.length === 0) issues.push('No significant issues detected');

      // ── Recommendations ──
      const recommendations: string[] = [];
      if (overdueMaintenance.length > 0) {
        recommendations.push(`Schedule maintenance — ${overdueMaintenance.length} task(s) past due`);
      }
      if (dtHours > 5) {
        recommendations.push('High downtime detected — inspect for recurring breakdowns');
      }
      if (daysSinceLastSession > 14 && m.status_flag !== 'retired') {
        recommendations.push('Machine idle for 2+ weeks — consider redeployment or review utilisation');
      }
      if (billableRatio < 80 && totalHours > 0) {
        recommendations.push('Review non-billable hours — aim for 85%+ billable ratio');
      }
      if (totalFuelLitres > 0 && totalHours > 0) {
        const litresPerHour = totalFuelLitres / totalHours;
        if (litresPerHour > 15) {
          recommendations.push(`High fuel consumption (${litresPerHour.toFixed(1)} L/h) — check engine efficiency`);
        }
      }
      if (avgSessionHours < 4 && mSessions.length > 3) {
        recommendations.push('Short average sessions — investigate if operator shifts are optimised');
      }
      if (recommendations.length === 0) {
        recommendations.push('Machine performing well — continue regular maintenance schedule');
      }

      // ── Health Score (0–100) ──
      let health = 100;
      if (dtHours > 0) health -= Math.min(dtHours * 3, 30);
      if (overdueMaintenance.length > 0) health -= overdueMaintenance.length * 10;
      if (daysSinceLastSession > 14) health -= 15;
      if (billableRatio < 80) health -= (80 - billableRatio);
      if (mSessions.length === 0) health -= 20;
      health = Math.max(0, Math.min(100, Math.round(health)));

      // ── Performance Summary ──
      const typeName = String(m.type ?? '').replace(/_/g, ' ');
      let summary = `${String(m.code)} (${typeName} ${m.make ?? ''} ${m.model ?? ''}) `;
      if (mSessions.length === 0) {
        summary += 'has no work sessions yet. Deploy this machine to start tracking performance.';
      } else {
        summary += `has run ${totalHours.toFixed(1)} hours across ${mSessions.length} sessions with a ${billableRatio}% billable ratio. `;
        if (dtHours > 0) summary += `Downtime of ${dtHours.toFixed(1)}h was recorded. `;
        if (totalEarnings > 0) summary += `Generated ₹${totalEarnings.toLocaleString('en-IN')} in earnings.`;
      }

      return {
        machine_code: String(m.code ?? ''),
        machine_id: String(m.id ?? ''),
        type: String(m.type ?? ''),
        make: String(m.make ?? ''),
        model: String(m.model ?? ''),
        year: Number(m.year ?? 0),
        health_score: health,
        status,
        performance_summary: summary,
        issues,
        earnings_per_day: earningsPerDay,
        earnings_total: {
          total: totalEarnings,
          daily_average: dailyAverage,
          monthly_estimate: monthlyEstimate,
          currency,
        },
        recommendations,
        stats: {
          total_hours: Math.round(totalHours * 10) / 10,
          billable_hours: Math.round(billableHours * 10) / 10,
          billable_ratio: billableRatio,
          total_sessions: mSessions.length,
          downtime_hours: Math.round(dtHours * 10) / 10,
          downtime_events: mDowntime.length,
          fuel_litres: Math.round(totalFuelLitres),
          fuel_cost: Math.round(totalFuelCost / 100),
          avg_session_hours: Math.round(avgSessionHours * 10) / 10,
          days_since_last_session: daysSinceLastSession,
          current_meter: Number(m.current_meter ?? 0),
          meter_unit: String(m.meter_unit_label ?? ''),
        },
      };
    });

    return { insights, generated_at: new Date().toISOString() };
  }
}
