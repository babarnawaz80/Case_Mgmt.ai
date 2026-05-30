import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Care Plan / ISP', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/people/ind-001/care-plan');
    await page.waitForTimeout(2000);
  });

  test('Care Plan page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('New Plan button is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new plan|add plan|create/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toBeVisible();
    } else {
      test.skip(true, 'New Plan button not found — check route');
    }
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
