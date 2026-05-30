import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
  });

  test('Page loads without crashing', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Stat cards are visible', async ({ page }) => {
    // Look for cards with numbers
    const cards = page.locator('[class*="card"], [class*="stat"], [class*="Card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test('Greeting shows a name', async ({ page }) => {
    const greeting = page.getByText(/Good (morning|afternoon|evening)/i);
    await expect(greeting).toBeVisible({ timeout: 5000 });
  });

  test('AI chat input is visible', async ({ page }) => {
    const input = page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="ask"]').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('Suggestion chips are visible', async ({ page }) => {
    // Quick action chips/buttons below the chat input
    const chips = page.locator('button').filter({ hasText: /who|show|any/i });
    await expect(chips.first()).toBeVisible({ timeout: 5000 });
  });
});
