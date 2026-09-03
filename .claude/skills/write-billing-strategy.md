# Skill: billing strategies and adjustments

1. Strategies live in packages/api/src/modules/finance/billing/strategies/<name>.ts implementing `BillingStrategy.computeForDay(ctx) → LedgerEntryDraft[]`.
2. Never update billing_ledger rows. To change a day: compute the new set, diff against current entries for (deployment_id, entry_date), and insert `adjustment` entries with `adjusts_id` so the net equals the new set.
3. Minimum top-up is its own entry kind (`minimum_topup`), never folded into units.
4. Monthly hire prorates by days deployed in the month; standby applies only when the rate card has standby_rate and the day has no billable session.
5. Advances: `advance_consumptions` are written in date order against new ledger entries by the billing job; never consume more than the advance's remaining base amount.
6. Tests: golden tests per strategy in `billing.spec.ts` with fixtures for minimum, multi-session day, rate change mid-month, corrected session, monthly proration, standby day.
