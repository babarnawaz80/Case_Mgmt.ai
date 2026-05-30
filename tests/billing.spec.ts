import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Billing Hub', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/billing');
    await page.waitForTimeout(2000);
  });

  test('Billing page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    // Could be access restricted for non-admin
    const restricted = page.getByText(/access restricted|permission/i);
    const isRestricted = await restricted.isVisible({ timeout: 2000 }).catch(() => false);
    if (isRestricted) {
      test.skip(true, 'Billing requires admin role — demo user lacks access');
    }
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('Summary stat cards are visible', async ({ page }) => {
    const restricted = page.getByText(/access restricted/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Access restricted');
    }
    const cards = page.locator('[class*="card"], [class*="stat"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
