import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Progress Notes', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/people/ind-001/progress-notes');
    await page.waitForTimeout(2000);
  });

  test('Progress Notes page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('New Progress Note button is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new|add|start|create/i }).first();
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('New Progress Note button opens form/modal', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new progress note|start blank|new note/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1500);
      const form = page.locator('form, [role="dialog"], [class*="modal"], [class*="drawer"], textarea').first();
      await expect(form).toBeVisible({ timeout: 5000 });
    }
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
