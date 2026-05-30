import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Admin Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/settings');
    await page.waitForTimeout(2000);
  });

  test('Settings page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('Settings tiles are visible', async ({ page }) => {
    const tiles = page.locator('[class*="card"], [class*="tile"]').filter({ hasText: /.+/ });
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Organization settings sub-page loads', async ({ page }) => {
    const restricted = page.getByText(/access restricted/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Settings restricted to admin');
    }
    await page.goto('/settings/organization');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Users settings sub-page loads', async ({ page }) => {
    const restricted = page.getByText(/access restricted/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Settings restricted to admin');
    }
    await page.goto('/settings/users');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Programs settings sub-page loads', async ({ page }) => {
    const restricted = page.getByText(/access restricted/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Settings restricted to admin');
    }
    await page.goto('/settings/programs');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('AI settings sub-page loads', async ({ page }) => {
    const restricted = page.getByText(/access restricted/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Settings restricted to admin');
    }
    await page.goto('/settings/ai');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
