import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Incidents', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/incidents');
    await page.waitForTimeout(2000);
  });

  test('Incidents page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('Summary stat cards are visible', async ({ page }) => {
    const cards = page.locator('[class*="card"], [class*="stat"], [class*="Card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test('New Incident Report button is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new incident|report incident|add/i }).first();
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
