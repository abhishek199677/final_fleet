import { test, expect } from '@playwright/test';

// End-to-end smoke (S52): seeded API + web. Local demo accounts come from
// packages/db/seed.js (demo@fleetos.com / ops@fleetos.com, password demo1234).

test.describe('Landing', () => {
  test('shows portal links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Fleet OS').first()).toBeVisible();
    await expect(page.locator('text=Owner Portal')).toBeVisible();
    await expect(page.locator('text=Operations Portal')).toBeVisible();
  });
});

test.describe('Auth', () => {
  test('login page shows sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('owner login reaches dashboard KPIs', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@fleetos.com');
    await page.fill('input[type="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    // Owner lands on / then dashboard lives at /home.
    await page.waitForURL('**/', { timeout: 15000 });
    await page.goto('/home');
    await expect(page.locator('text=Welcome back, Owner!')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Total Billed').first()).toBeVisible();
  });

  test('ops login reaches today quick actions', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'ops@fleetos.com');
    await page.fill('input[type="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/today/, { timeout: 15000 });
    await expect(page.locator('text=Start Session')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Log Fuel')).toBeVisible();
  });
});
