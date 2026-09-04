import { test, expect } from '@playwright/test';

test.describe('Owner Home', () => {
  test('displays KPI cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Total Billed').first()).toBeVisible();
    await expect(page.locator('text=Site Deployments').first()).toBeVisible();
    await expect(page.locator('text=Utilisation').first()).toBeVisible();
  });

  test('displays deployments table', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Current Deployments').first()).toBeVisible();
  });
});

test.describe('Owner Machines', () => {
  test('displays machines list', async ({ page }) => {
    await page.goto('/machines');
    await expect(page.locator('text=Machines')).toBeVisible();
    await expect(page.locator('text=Add Machine')).toBeVisible();
  });
});

test.describe('Owner Clients', () => {
  test('displays clients list', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.locator('text=Clients')).toBeVisible();
    await expect(page.locator('text=Add Client')).toBeVisible();
  });
});

test.describe('Ops Today', () => {
  test('displays quick actions', async ({ page }) => {
    await page.goto('/today');
    await expect(page.locator('text=Today')).toBeVisible();
    await expect(page.locator('text=Start Session')).toBeVisible();
    await expect(page.locator('text=Log Fuel')).toBeVisible();
    await expect(page.locator('text=Log Expense')).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('displays settings tabs', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=FX')).toBeVisible();
  });
});

test.describe('Owner Billing', () => {
  test('displays billing sections', async ({ page }) => {
    await page.goto('/billing');
    await expect(page.locator('text=Billing').first()).toBeVisible();
    await expect(page.locator('text=New rate card')).toBeVisible();
  });
});

test.describe('Owner Cash', () => {
  test('displays cash accounts', async ({ page }) => {
    await page.goto('/cash');
    await expect(page.locator('text=Cash').first()).toBeVisible();
    await expect(page.locator('text=New remittance')).toBeVisible();
  });
});

test.describe('Owner Projections', () => {
  test('displays projection inputs', async ({ page }) => {
    await page.goto('/projections');
    await expect(page.locator('text=Projections').first()).toBeVisible();
    await expect(page.locator('text=Working days').first()).toBeVisible();
  });
});

test.describe('Owner Audit', () => {
  test('displays audit filters', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.locator('text=Audit').first()).toBeVisible();
    await expect(page.locator('text=Filters').first()).toBeVisible();
  });
});

test.describe('Owner Support', () => {
  test('displays support form', async ({ page }) => {
    await page.goto('/support');
    await expect(page.locator('text=Support').first()).toBeVisible();
    await expect(page.locator('text=Report a problem')).toBeVisible();
  });
});

test.describe('Ops Downtime', () => {
  test('displays downtime form', async ({ page }) => {
    await page.goto('/downtime');
    await expect(page.locator('text=Downtime').first()).toBeVisible();
    await expect(page.locator('text=Log downtime')).toBeVisible();
  });
});

test.describe('Ops Receipt', () => {
  test('displays receipt form', async ({ page }) => {
    await page.goto('/receipt');
    await expect(page.locator('text=Receipt / Advance').first()).toBeVisible();
  });
});

test.describe('Ops Maintenance', () => {
  test('displays maintenance form', async ({ page }) => {
    await page.goto('/maintenance');
    await expect(page.locator('text=Maintenance Visit').first()).toBeVisible();
  });
});

test.describe('Ops History', () => {
  test('displays history list', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('text=My History').first()).toBeVisible();
  });
});
