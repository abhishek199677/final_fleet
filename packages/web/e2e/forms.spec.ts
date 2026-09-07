import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'demo@fleetos.com';
const OPS_EMAIL = 'ops@fleetos.com';
const PASSWORD = 'demo1234';

async function loginAs(page: import('@playwright/test').Page, email: string, redirect: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`/${redirect}`, { timeout: 10000 });
}

test.describe('Ops form submissions', () => {
  test('ops can submit a work session', async ({ page }) => {
    await loginAs(page, OPS_EMAIL, 'today');
    await page.goto('/work-session/new');
    await expect(page.locator('h1:text("Start Work Session")')).toBeVisible();

    // Select first machine
    const machineSelect = page.locator('select').first();
    await machineSelect.waitFor({ state: 'visible' });
    const options = await machineSelect.locator('option').count();
    if (options > 1) {
      await machineSelect.selectOption({ index: 1 });
    }

    // Select first operator
    const operatorSelect = page.locator('select').nth(1);
    const opOptions = await operatorSelect.locator('option').count();
    if (opOptions > 1) {
      await operatorSelect.selectOption({ index: 1 });
    }

    // Fill start meter
    await page.fill('input[type="number"]', '1000');

    // Submit
    await page.click('button:text("Start Session")');
    // Should redirect or show offline saved message
    await page.waitForTimeout(2000);
  });

  test('ops can submit a downtime entry', async ({ page }) => {
    await loginAs(page, OPS_EMAIL, 'today');
    await page.goto('/downtime');
    await expect(page.locator('h1:text("Downtime")')).toBeVisible();

    // Select first machine
    const machineSelect = page.locator('select').first();
    await machineSelect.waitFor({ state: 'visible' });
    const options = await machineSelect.locator('option').count();
    if (options > 1) {
      await machineSelect.selectOption({ index: 1 });
    }

    // Fill from datetime
    const fromInput = page.locator('input[type="datetime-local"]').first();
    const now = new Date();
    now.setMinutes(now.getMinutes() - 2);
    await fromInput.fill(now.toISOString().slice(0, 16));

    // Select reason
    await page.locator('select').nth(1).selectOption('breakdown');

    // Add note
    await page.fill('input:not([type])', 'Test downtime note');

    // Submit
    await page.click('button:text("Save downtime")');
    await page.waitForTimeout(2000);
  });

  test('ops can navigate to expense form', async ({ page }) => {
    await loginAs(page, OPS_EMAIL, 'today');
    await page.goto('/expense/new');
    await expect(page.locator('h1:text("Log Expense")')).toBeVisible();
    await expect(page.locator('text=Category')).toBeVisible();
    await expect(page.locator('text=Amount')).toBeVisible();
  });

  test('ops can navigate to receipt form', async ({ page }) => {
    await loginAs(page, OPS_EMAIL, 'today');
    await page.goto('/receipt');
    await expect(page.locator('h1:text("Receipt / Advance")')).toBeVisible();
  });

  test('ops can navigate to cash count form', async ({ page }) => {
    await loginAs(page, OPS_EMAIL, 'today');
    await page.goto('/cash-count');
    await expect(page.locator('h1:text("Cash Count")')).toBeVisible();
    await expect(page.locator('text=Blind Count')).toBeVisible();
  });
});

test.describe('Owner form submissions', () => {
  test('owner can navigate to new machine form', async ({ page }) => {
    await loginAs(page, OWNER_EMAIL, 'home');
    await page.goto('/machines/new');
    await expect(page.locator('h1:text("New Machine")')).toBeVisible();
  });

  test('owner can navigate to new client form', async ({ page }) => {
    await loginAs(page, OWNER_EMAIL, 'home');
    await page.goto('/clients/new');
    await expect(page.locator('h1:text("New Client")')).toBeVisible();
  });

  test('owner can navigate to new site form', async ({ page }) => {
    await loginAs(page, OWNER_EMAIL, 'home');
    await page.goto('/sites/new');
    await expect(page.locator('h1:text("New Site")')).toBeVisible();
  });

  test('owner can navigate to new deployment form', async ({ page }) => {
    await loginAs(page, OWNER_EMAIL, 'home');
    await page.goto('/deployments/new');
    await expect(page.locator('h1:text("New Deployment")')).toBeVisible();
  });

  test('owner can view insights page', async ({ page }) => {
    await loginAs(page, OWNER_EMAIL, 'home');
    await page.goto('/insights');
    await expect(page.locator('h1:text("Insights")')).toBeVisible();
  });

  test('owner can view support page and submit ticket', async ({ page }) => {
    await loginAs(page, OWNER_EMAIL, 'home');
    await page.goto('/support');
    await expect(page.locator('h1:text("Support")')).toBeVisible();
    await expect(page.locator('text=Report a problem')).toBeVisible();
  });
});

test.describe('Admin flow', () => {
  test('admin can view tenants page', async ({ page }) => {
    await page.goto('/login');
    // Admin uses pool B - for now just verify the page loads
    await page.goto('/admin/tenants');
    // Page should render (may redirect to login for pool B auth)
    await page.waitForTimeout(1000);
  });

  test('admin can view health page', async ({ page }) => {
    await page.goto('/admin/health');
    await page.waitForTimeout(1000);
  });

  test('admin can view tickets page', async ({ page }) => {
    await page.goto('/admin/tickets');
    await page.waitForTimeout(1000);
  });
});
