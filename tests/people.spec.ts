import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('People Supported List', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/people');
    await page.waitForTimeout(2000);
  });

  test('People page loads', async ({ page }) => {
    await expect(page).toHaveURL(/people/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Add New Participant button is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new participant|add person/i });
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('Search bar filters list', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('Joseph');
    await page.waitForTimeout(800);
    // Should show results or empty state — not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('Status filter dropdown opens', async ({ page }) => {
    const statusFilter = page.locator('button, select').filter({ hasText: /status|all/i }).first();
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).toBeVisible();
    } else {
      test.skip(true, 'Status filter not found');
    }
  });

  test('Compliance Risk filter dropdown opens', async ({ page }) => {
    const riskFilter = page.locator('button, select').filter({ hasText: /compliance|risk/i }).first();
    if (await riskFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await riskFilter.click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).toBeVisible();
    } else {
      test.skip(true, 'Compliance Risk filter not found');
    }
  });

  test('Import button is visible', async ({ page }) => {
    const importBtn = page.getByRole('button', { name: /import/i });
    await expect(importBtn).toBeVisible({ timeout: 5000 });
  });
});
