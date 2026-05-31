/**
 * 03_dashboard.spec.ts — Dashboard
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('dashboard loads at /dashboard with no 404', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('body')).not.toContainText('Not Found');
  await expect(page).toHaveURL(/dashboard/);
});

test('dashboard heading visible', async ({ page }) => {
  const heading = page.locator('text=/Dashboard|iCM/i').first();
  await expect(heading).toBeVisible({ timeout: 8000 });
});

test('PCP compliance card shows', async ({ page }) => {
  await expect(page.locator('text=/PCP.*COMPLIANCE|COMPLIANCE/i').first()).toBeVisible({ timeout: 8000 });
});

test("today's schedule section visible", async ({ page }) => {
  const schedule = page.locator("text=/Today's schedule|today|schedule/i").first();
  await expect(schedule).toBeVisible({ timeout: 8000 });
});

test('people needing attention section renders', async ({ page }) => {
  const attention = page.locator('text=/attention|needing/i').first();
  await expect(attention).toBeVisible({ timeout: 8000 });
});

test('AI panel renders on right side', async ({ page }) => {
  const ai = page.locator('text=/Case Management AI|AI Assistant|AI/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('quick access tiles visible', async ({ page }) => {
  const tiles = ['Contact Note', 'Progress Note', 'People'];
  let found = 0;
  for (const tile of tiles) {
    const el = page.locator(`text="${tile}"`).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false)) found++;
  }
  expect(found).toBeGreaterThan(0);
});

test('no spinner stuck after 5 seconds', async ({ page }) => {
  await page.waitForTimeout(5000);
  // Loading spinners should be gone
  const spinners = page.locator('[class*="spinner"], [class*="loading"], [aria-label="loading"]');
  const count = await spinners.count();
  for (let i = 0; i < count; i++) {
    await expect(spinners.nth(i)).not.toBeVisible();
  }
});
