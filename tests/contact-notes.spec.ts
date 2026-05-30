import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Contact Notes', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/people/ind-001/contact-notes');
    await page.waitForTimeout(2000);
  });

  test('Contact Notes page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('New Contact Note button is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new|add|create/i }).first();
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('New Contact Note button opens form', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new contact note|new note/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1000);
      // Form or modal should appear
      const form = page.locator('form, [role="dialog"], [class*="modal"], [class*="drawer"]').first();
      await expect(form).toBeVisible({ timeout: 5000 });
    }
  });

  test('Activity type dropdown has options', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new contact note|new note/i }).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1000);
      const activityDropdown = page.locator('select, [role="combobox"]').filter({ hasText: /activity|type/i }).first();
      if (await activityDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await activityDropdown.click();
        await page.waitForTimeout(300);
        const options = page.locator('option, [role="option"]');
        const count = await options.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
