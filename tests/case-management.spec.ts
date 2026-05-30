import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Case Management Board', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/people/ind-001/case-management');
    await page.waitForTimeout(2000);
  });

  test('Case Management page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('Task counters are visible', async ({ page }) => {
    // Look for stat cards with numbers
    const numbers = page.locator('text=/^\\d+$/').first();
    await expect(numbers).toBeVisible({ timeout: 5000 });
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
