import { test, expect } from '@playwright/test';

test.describe('Fleet OS E2E', () => {
  test('landing page has portal links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Fleet OS')).toBeVisible();
    await expect(page.locator('text=Owner Portal')).toBeVisible();
    await expect(page.locator('text=Operations Portal')).toBeVisible();
  });

  test.describe('Owner flow', () => {
    test('owner login reaches dashboard with KPIs', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await expect(page.locator('text=Total Billed')).toBeVisible();
    });

    test('owner can view machines list', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await page.click('a[href="/machines"]');
      await expect(page.locator('h1:text("Machines")')).toBeVisible();
    });

    test('owner can view clients list', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await page.click('a[href="/clients"]');
      await expect(page.locator('h1:text("Clients")')).toBeVisible();
    });

    test('owner can view billing page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await page.click('a[href="/billing"]');
      await expect(page.locator('h1:text("Billing")')).toBeVisible();
    });

    test('owner can view cash page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await page.click('a[href="/cash"]');
      await expect(page.locator('h1:text("Cash")')).toBeVisible();
    });

    test('owner can view audit page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await page.click('a[href="/audit"]');
      await expect(page.locator('h1:text("Audit")')).toBeVisible();
    });

    test('owner can view settings page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await page.click('a[href="/settings"]');
      await expect(page.locator('h1:text("Settings")')).toBeVisible();
    });

    test('owner can view projections page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'demo@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/home', { timeout: 10000 });
      await page.click('a[href="/projections"]');
      await expect(page.locator('h1:text("Projections")')).toBeVisible();
    });
  });

  test.describe('Ops flow', () => {
    test('ops login reaches today page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'ops@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/today', { timeout: 10000 });
      await expect(page.locator('h1:text("Today")')).toBeVisible();
    });

    test('ops can navigate to work session', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'ops@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/today', { timeout: 10000 });
      await page.click('a[href="/work-session"]');
      await expect(page.locator('h1:text("Work Session")')).toBeVisible();
    });

    test('ops can navigate to fuel page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'ops@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/today', { timeout: 10000 });
      await page.click('a[href="/fuel"]');
      await expect(page.locator('h1:text("Fuel")')).toBeVisible();
    });

    test('ops can navigate to expense page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'ops@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/today', { timeout: 10000 });
      await page.click('a[href="/expense"]');
      await expect(page.locator('h1:text("Expense")')).toBeVisible();
    });

    test('ops can navigate to downtime page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'ops@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/today', { timeout: 10000 });
      await page.click('a[href="/downtime"]');
      await expect(page.locator('h1:text("Downtime")')).toBeVisible();
    });

    test('ops can navigate to maintenance page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'ops@fleetos.com');
      await page.fill('input[type="password"]', 'demo1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('/today', { timeout: 10000 });
      await page.click('a[href="/maintenance"]');
      await expect(page.locator('h1:text("Maintenance")')).toBeVisible();
    });
  });

  test.describe('Registration flow', () => {
    test('new user can register a tenant', async ({ page }) => {
      await page.goto('/register');
      await page.fill('input[placeholder*="company" i], input[name="tenant_name"]', 'Test Company');
      await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      // Should redirect to dashboard after registration
      await page.waitForURL(/\/(home|today)/, { timeout: 10000 });
    });
  });
});
