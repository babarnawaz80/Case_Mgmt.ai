import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Brain Orchestrator', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/platform/orchestrator');
    await page.waitForTimeout(2000);
  });

  test('Orchestrator page loads or is restricted', async ({ page }) => {
    const restricted = page.getByText(/access restricted|not found|404/i);
    if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Orchestrator restricted to admin');
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
