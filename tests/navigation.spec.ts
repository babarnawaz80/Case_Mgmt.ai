import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Navigation and Shell', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
  });

  test('Dashboard nav link loads dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('People nav link loads people list', async ({ page }) => {
    await page.goto('/people');
    await expect(page).toHaveURL(/people/);
  });

  test('My Work nav link loads task page', async ({ page }) => {
    await page.goto('/my-work');
    await expect(page).toHaveURL(/my-work/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Messages nav link loads messages', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/messages/);
  });

  test('Reports nav link loads reports', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/reports/);
  });

  test('Billing nav link loads billing', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL(/billing/);
  });

  test('Incidents nav link loads incidents', async ({ page }) => {
    await page.goto('/incidents');
    await expect(page).toHaveURL(/incidents/);
  });

  test('Settings nav link loads settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/settings/);
  });

  test('Search bar accepts text without crashing', async ({ page }) => {
    await page.goto('/dashboard');
    // Try ⌘K trigger
    const searchBtn = page.locator('input[placeholder*="Search"], button:has-text("Search")').first();
    if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBtn.click();
    } else {
      await page.keyboard.press('Meta+k');
    }
    await page.waitForTimeout(500);
    // Type in search
    await page.keyboard.type('Joseph');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    // No crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('No console errors on dashboard load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(e => !e.includes('Warning') && !e.includes('favicon'));
    expect(criticalErrors.length).toBe(0);
  });
});
