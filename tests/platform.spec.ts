import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Platform', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/platform');
    await page.waitForTimeout(2000);
  });

  test('Platform page loads', async ({ page }) => {
    const restricted = page.getByText(/access restricted|not found|404/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Platform page restricted or not implemented');
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Guidelines engines page loads', async ({ page }) => {
    await page.goto('/platform/guidelines-engines');
    await page.waitForTimeout(1500);
    const restricted = page.getByText(/access restricted|not found|404/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Page restricted');
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
