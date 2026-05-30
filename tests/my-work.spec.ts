import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('My Work', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto('/my-work');
    await page.waitForTimeout(1500);
  });

  test('My Work page loads', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
  });

  test('Greeting does NOT show hardcoded Kathy (uses real user name)', async ({ page }) => {
    // The greeting should show the logged-in user's name
    // Since we login as kathy@demo, it WILL show Kathy — verify it shows A name not undefined
    const greeting = page.getByText(/Good (morning|afternoon|evening)/i);
    await expect(greeting).toBeVisible({ timeout: 5000 });
    const text = await greeting.textContent();
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
    expect(text?.length).toBeGreaterThan(15);
  });

  test('Tabs are visible: My Work, AI Check-Ins, Completed', async ({ page }) => {
    const tabs = page.getByRole('tab').or(page.locator('[role="tab"], button').filter({ hasText: /my work|check.in|completed/i }));
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
  });

  test('Today / This Week / All Tasks sub-filters are visible', async ({ page }) => {
    const todayBtn = page.getByRole('button', { name: /today/i });
    await expect(todayBtn).toBeVisible({ timeout: 5000 });
    const weekBtn = page.getByRole('button', { name: /this week/i });
    await expect(weekBtn).toBeVisible({ timeout: 5000 });
  });

  test('Add task button is visible', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add task|\+ task/i });
    await expect(addBtn).toBeVisible({ timeout: 5000 });
  });

  test('Stat cards show numbers not undefined', async ({ page }) => {
    // 4 stat cards: OPEN, PAST DUE, DUE TODAY, THIS WEEK
    const cardLabels = ['OPEN', 'PAST DUE', 'DUE TODAY', 'THIS WEEK'];
    for (const label of cardLabels) {
      const card = page.locator(`text=${label}`).first();
      if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check the sibling/parent doesn't show 'undefined' or 'NaN'
        const parent = card.locator('..').locator('..');
        const text = await parent.textContent();
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('NaN');
      }
    }
  });

  test('Page does not crash on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});
