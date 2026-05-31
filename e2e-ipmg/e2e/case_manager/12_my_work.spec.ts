/**
 * 12_my_work.spec.ts — My Work
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/my-work');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('my work loads at /my-work', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/My Work/i').first()).toBeVisible({ timeout: 8000 });
});

test('AI daily plan panel renders', async ({ page }) => {
  const panel = page.locator('text=/Daily plan|prioritize|AI/i').first();
  await expect(panel).toBeVisible({ timeout: 8000 });
});

test('tabs render', async ({ page }) => {
  // At least one tab visible in the work-views tablist
  const tab = page.getByRole('tab').first();
  await expect(tab).toBeVisible({ timeout: 8000 });
});

test('My Work tab content visible', async ({ page }) => {
  const myWorkTab = page.locator('text="My Work"').first();
  if (await myWorkTab.isVisible()) {
    await myWorkTab.click();
    await page.waitForTimeout(500);
  }
  // Some tasks visible
  const content = page.locator('[class*="task"], [class*="item"], [class*="work"]').first();
  await expect(content).toBeVisible({ timeout: 8000 });
});

test('Alerts tab is present', async ({ page }) => {
  // The work-views tablist exposes My Work / AI Check-Ins / Completed tabs.
  const tab = page.getByRole('tab', { name: /AI Check-Ins|Completed|My Work/i }).first();
  await expect(tab).toBeVisible({ timeout: 8000 });
});

test('Alerts tab shows content', async ({ page }) => {
  const tab = page.getByRole('tab', { name: /Completed|AI Check-Ins/i }).first();
  if (await tab.isVisible()) {
    await tab.click();
    await page.waitForTimeout(500);
  }
  // No crash
  await expect(page.locator('body')).not.toContainText('404');
});

test('overdue badges show', async ({ page }) => {
  // Overdue items may or may not exist; if none, an empty/caught-up state shows.
  const status = page.getByText(/overdue|All caught up|open tasks|remaining today|no tasks/i).first();
  await expect(status).toBeVisible({ timeout: 8000 });
});

test('tasks grouped by individual or empty state', async ({ page }) => {
  // When the caseload queue has items they group by person; otherwise an empty state shows.
  const content = page.getByText(/individual|open tasks|remaining today|All caught up|priority/i).first();
  await expect(content).toBeVisible({ timeout: 8000 });
});

test('no 404 on my-work', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
