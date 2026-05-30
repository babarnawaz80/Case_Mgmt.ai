import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/reports');
    await page.waitForTimeout(2000);
  });

  test('Reports page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('Standard Reports tab is visible', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /standard/i }).or(page.getByText(/standard reports/i)).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test('My Reports tab is visible', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /my reports/i }).or(page.getByText(/my reports/i)).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
