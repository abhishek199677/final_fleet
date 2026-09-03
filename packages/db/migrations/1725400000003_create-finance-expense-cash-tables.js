/**
 * S13-S14, S19-S22: Finance tables — rate_cards, billing, cash, expenses
 * TSD §3.3, BRD BIL-01..07, CSH-01..04, EXP-01..05
 */

exports.up = (pgm) => {
  // ─── tenant.rate_cards (finance) ───
  pgm.createTable(
    { name: 'rate_cards', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      deployment_id: { type: 'uuid', notNull: true, references: 'tenant.deployments(id)' },
      effective_from: { type: 'date', notNull: true },
      strategy: { type: 'text', notNull: true, check: "strategy IN ('hourly', 'daily', 'monthly')" },
      rate_minor: { type: 'int', notNull: true },
      currency: { type: 'text', notNull: true },
      min_units_per_day: { type: 'numeric', default: 0 },
      standby_rate_minor: { type: 'int' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.createIndex({ name: 'rate_cards', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'rate_cards', schema: 'tenant' }, ['deployment_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.rate_cards TO app_owner;`);

  // ─── tenant.extra_charges (finance) ───
  pgm.createTable(
    { name: 'extra_charges', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      deployment_id: { type: 'uuid', notNull: true, references: 'tenant.deployments(id)' },
      kind: { type: 'text', notNull: true, check: "kind IN ('mobilisation', 'demobilisation', 'transport', 'other')" },
      date: { type: 'date', notNull: true },
      currency: { type: 'text', notNull: true },
      amount_minor: { type: 'int', notNull: true },
      fx: { type: 'numeric(18,8)' },
      base_minor: { type: 'int' },
      note: { type: 'text' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'extra_charges', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'extra_charges', schema: 'tenant' }, ['deployment_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.extra_charges TO app_owner;`);

  // ─── tenant.billing_ledger (finance, insert-only) ───
  pgm.createTable(
    { name: 'billing_ledger', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      deployment_id: { type: 'uuid', notNull: true, references: 'tenant.deployments(id)' },
      work_session_id: { type: 'uuid', references: 'tenant.work_sessions(id)' },
      rate_card_id: { type: 'uuid', references: 'tenant.rate_cards(id)' },
      entry_date: { type: 'date', notNull: true },
      kind: { type: 'text', notNull: true, check: "kind IN ('work', 'minimum_topup', 'standby', 'monthly_hire', 'extra_charge', 'adjustment')" },
      units: { type: 'numeric', notNull: true },
      currency: { type: 'text', notNull: true },
      amount_minor: { type: 'int', notNull: true },
      fx: { type: 'numeric(18,8)' },
      base_minor: { type: 'int' },
      adjusts_id: { type: 'uuid', references: 'tenant.billing_ledger(id)' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
  );
  pgm.createIndex({ name: 'billing_ledger', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'billing_ledger', schema: 'tenant' }, ['deployment_id']);
  pgm.createIndex({ name: 'billing_ledger', schema: 'tenant' }, ['entry_date']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.billing_ledger TO app_owner;`);

  // ─── tenant.client_money_events (finance) ───
  pgm.createTable(
    { name: 'client_money_events', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      client_id: { type: 'uuid', notNull: true, references: 'tenant.clients(id)' },
      site_id: { type: 'uuid', references: 'tenant.sites(id)' },
      event_type: { type: 'text', notNull: true, check: "event_type IN ('receipt', 'advance', 'credit_note', 'rebate')" },
      currency: { type: 'text', notNull: true },
      amount_minor: { type: 'int', notNull: true },
      fx_rate: { type: 'numeric(18,8)' },
      base_minor: { type: 'int' },
      mode: { type: 'text' },
      reference: { type: 'text' },
      slip_photo_key: { type: 'text' },
      event_date: { type: 'date', notNull: true },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'client_money_events', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'client_money_events', schema: 'tenant' }, ['client_id']);
  pgm.createIndex({ name: 'client_money_events', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });
  pgm.sql(`GRANT SELECT, INSERT ON tenant.client_money_events TO app_owner;`);

  // ─── tenant.advance_consumptions (finance) ───
  pgm.createTable(
    { name: 'advance_consumptions', schema: 'tenant' },
    {
      advance_id: { type: 'uuid', notNull: true, references: 'tenant.client_money_events(id)' },
      billing_ledger_id: { type: 'uuid', notNull: true, references: 'tenant.billing_ledger(id)' },
      base_minor: { type: 'int', notNull: true },
      date: { type: 'date', notNull: true },
      _pk: { type: 'text', primaryKey: true },
    },
  );
  pgm.sql(`ALTER TABLE tenant.advance_consumptions DROP COLUMN _pk;`);
  pgm.sql(`ALTER TABLE tenant.advance_consumptions ADD PRIMARY KEY (advance_id, billing_ledger_id);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.advance_consumptions TO app_owner;`);

  // ─── tenant.machine_financials (finance) ───
  pgm.createTable(
    { name: 'machine_financials', schema: 'tenant' },
    {
      machine_id: { type: 'uuid', primaryKey: true, references: 'tenant.machines(id)' },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      purchase_date: { type: 'date' },
      purchase_cost_minor: { type: 'int' },
      currency: { type: 'text' },
      fx: { type: 'numeric(18,8)' },
      base_minor: { type: 'int' },
    },
  );
  pgm.sql(`GRANT SELECT, INSERT ON tenant.machine_financials TO app_owner;`);

  // ─── tenant.client_credit (finance) ───
  pgm.createTable(
    { name: 'client_credit', schema: 'tenant' },
    {
      client_id: { type: 'uuid', primaryKey: true, references: 'tenant.clients(id)' },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      credit_limit_minor: { type: 'int', notNull: true, default: 0 },
      required_advance_minor: { type: 'int', notNull: true, default: 0 },
    },
  );
  pgm.sql(`GRANT SELECT, INSERT ON tenant.client_credit TO app_owner;`);

  // ─── tenant.expense_categories ───
  pgm.createTable(
    { name: 'expense_categories', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      name: { type: 'text', notNull: true },
      is_default: { type: 'boolean', notNull: true, default: false },
    },
  );
  pgm.createIndex({ name: 'expense_categories', schema: 'tenant' }, ['tenant_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.expense_categories TO app_owner, app_ops;`);

  // ─── tenant.expenses ───
  pgm.createTable(
    { name: 'expenses', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      date: { type: 'date', notNull: true },
      category_id: { type: 'uuid', notNull: true, references: 'tenant.expense_categories(id)' },
      description: { type: 'text', notNull: true },
      currency: { type: 'text', notNull: true },
      amount_minor: { type: 'int', notNull: true },
      fx_rate: { type: 'numeric(18,8)' },
      base_minor: { type: 'int' },
      cash_account_id: { type: 'uuid' },
      paid_by: { type: 'text' },
      allocation_type: { type: 'text', check: "allocation_type IN ('site', 'machine', 'overhead')" },
      site_id: { type: 'uuid' },
      machine_id: { type: 'uuid' },
      receipt_photo_key: { type: 'text' },
      needs_verification: { type: 'boolean', notNull: true, default: false },
      duplicate_of_id: { type: 'uuid' },
      note: { type: 'text' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'expenses', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'expenses', schema: 'tenant' }, ['category_id']);
  pgm.createIndex({ name: 'expenses', schema: 'tenant' }, ['tenant_id', 'client_uuid'], { unique: true });

  pgm.sql(`ALTER TABLE tenant.expenses ENABLE ROW LEVEL SECURITY;`);
  pgm.sql(`ALTER TABLE tenant.expenses FORCE ROW LEVEL SECURITY;`);
  pgm.sql(`CREATE POLICY tenant_isolation ON tenant.expenses USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);`);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.expenses TO app_owner, app_ops;`);

  // ─── tenant.cash_accounts ───
  pgm.createTable(
    { name: 'cash_accounts', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      name: { type: 'text', notNull: true },
      type: { type: 'text', notNull: true, default: 'site_cash' },
      currency: { type: 'text', notNull: true },
      is_default: { type: 'boolean', notNull: true, default: false },
    },
  );
  pgm.createIndex({ name: 'cash_accounts', schema: 'tenant' }, ['tenant_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.cash_accounts TO app_owner, app_ops;`);

  // ─── tenant.cash_transfers ───
  pgm.createTable(
    { name: 'cash_transfers', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      from_account_id: { type: 'uuid', notNull: true, references: 'tenant.cash_accounts(id)' },
      to_account_id: { type: 'uuid', notNull: true, references: 'tenant.cash_accounts(id)' },
      currency: { type: 'text', notNull: true },
      amount_minor: { type: 'int', notNull: true },
      fx_rate: { type: 'numeric(18,8)' },
      base_minor: { type: 'int' },
      reference: { type: 'text' },
      photo_key: { type: 'text' },
      transfer_date: { type: 'date', notNull: true },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
    },
  );
  pgm.createIndex({ name: 'cash_transfers', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'cash_transfers', schema: 'tenant' }, ['from_account_id']);
  pgm.createIndex({ name: 'cash_transfers', schema: 'tenant' }, ['to_account_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.cash_transfers TO app_owner, app_ops;`);

  // ─── tenant.cash_counts ───
  pgm.createTable(
    { name: 'cash_counts', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      cash_account_id: { type: 'uuid', notNull: true, references: 'tenant.cash_accounts(id)' },
      count_date: { type: 'date', notNull: true },
      counted: { type: 'jsonb', notNull: true },
      photo_key: { type: 'text' },
      note: { type: 'text' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      client_uuid: { type: 'uuid', notNull: true },
      version: { type: 'int', notNull: true, default: 1 },
      supersedes_id: { type: 'uuid' },
      is_current: { type: 'boolean', notNull: true, default: true },
      source: { type: 'text', notNull: true, default: 'app' },
    },
  );
  pgm.createIndex({ name: 'cash_counts', schema: 'tenant' }, ['tenant_id']);
  pgm.createIndex({ name: 'cash_counts', schema: 'tenant' }, ['cash_account_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.cash_counts TO app_owner, app_ops;`);

  // ─── tenant.photos ───
  pgm.createTable(
    { name: 'photos', schema: 'tenant' },
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      tenant_id: { type: 'uuid', notNull: true, references: 'platform.tenants(id)' },
      s3_key_original: { type: 'text', notNull: true },
      s3_key_thumb: { type: 'text' },
      sha256_server: { type: 'text' },
      sha256_device: { type: 'text' },
      size_bytes: { type: 'int' },
      taken_at_device: { type: 'timestamptz' },
      received_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      lat: { type: 'numeric' },
      lng: { type: 'numeric' },
      gps_accuracy_m: { type: 'numeric' },
      capture_source: { type: 'text', check: "capture_source IN ('camera', 'gallery', 'web')" },
      uploaded_by: { type: 'uuid', notNull: true },
      ocr_result: { type: 'jsonb' },
    },
  );
  pgm.createIndex({ name: 'photos', schema: 'tenant' }, ['tenant_id']);
  pgm.sql(`GRANT SELECT, INSERT ON tenant.photos TO app_owner, app_ops;`);
};

exports.down = (pgm) => {
  pgm.dropTable({ name: 'photos', schema: 'tenant' });
  pgm.dropTable({ name: 'cash_counts', schema: 'tenant' });
  pgm.dropTable({ name: 'cash_transfers', schema: 'tenant' });
  pgm.dropTable({ name: 'cash_accounts', schema: 'tenant' });
  pgm.dropTable({ name: 'expenses', schema: 'tenant' });
  pgm.dropTable({ name: 'expense_categories', schema: 'tenant' });
  pgm.dropTable({ name: 'client_credit', schema: 'tenant' });
  pgm.dropTable({ name: 'machine_financials', schema: 'tenant' });
  pgm.dropTable({ name: 'advance_consumptions', schema: 'tenant' });
  pgm.dropTable({ name: 'client_money_events', schema: 'tenant' });
  pgm.dropTable({ name: 'billing_ledger', schema: 'tenant' });
  pgm.dropTable({ name: 'extra_charges', schema: 'tenant' });
  pgm.dropTable({ name: 'rate_cards', schema: 'tenant' });
};
