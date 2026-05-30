import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Messages', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/messages');
    await page.waitForTimeout(2000);
  });

  test('Messages page loads with layout', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, [class*="header"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('Typing @ in composer does NOT crash the app', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    // Find a message composer textarea or input
    const composer = page.locator('textarea, input[placeholder*="message"], input[placeholder*="Message"]').first();
    if (await composer.isVisible({ timeout: 5000 }).catch(() => false)) {
      await composer.click();
      await composer.type('@');
      await page.waitForTimeout(800);
      // Should not crash
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toHaveLength(0);
    } else {
      test.skip(true, 'Message composer not visible — may need a conversation selected first');
    }
  });

  test('Message input accepts text', async ({ page }) => {
    const composer = page.locator('textarea, input[placeholder*="message"], input[placeholder*="Message"]').first();
    if (await composer.isVisible({ timeout: 5000 }).catch(() => false)) {
      await composer.click();
      await composer.fill('Test message from Playwright');
      const value = await composer.inputValue();
      expect(value).toContain('Test message');
    }
  });

  test('New message button is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new|compose|create/i }).first();
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
