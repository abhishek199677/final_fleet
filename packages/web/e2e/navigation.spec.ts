import { test, expect } from '@playwright/test';

test.describe('Owner Home', () => {
  test('displays KPI cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Revenue')).toBeVisible();
    await expect(page.locator('text=Expenses')).toBeVisible();
    await expect(page.locator('text=Active Machines')).toBeVisible();
  });

  test('displays machine fleet', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Machine Fleet')).toBeVisible();
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
