# Skill: add an alert rule

1. Add the rule to packages/api/src/modules/alerts/rules/<name>.rule.ts implementing `AlertRule { type, evaluate(tenantId, now): Promise<AlertCandidate[]> }` using SQL against the views in docs/TSD.md §3.
2. Register in rules/index.ts. Thresholds come from tenant_settings with a documented default.
3. Upsert semantics: one open alert per (type, machine_id|client_id|expense_id); resolve automatically when the condition clears if the rule declares `autoResolve: true`.
4. Financial alert types are tagged `audience: 'owner'`; ops never receives them.
5. Notification: enqueue to `notify` with a WhatsApp template key and an in-app payload; add the template text to packages/api/src/modules/notify/templates.ts (en, fr).
6. Tests: unit test evaluate() with seeded data for fire, not-fire, and auto-resolve.
