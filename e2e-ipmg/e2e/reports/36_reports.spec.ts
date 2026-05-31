/**
 * 36_reports.spec.ts — Reports
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/reports');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('reports page loads at /reports', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Reports|reports/i').first()).toBeVisible({ timeout: 8000 });
});

test('AI banner shows', async ({ page }) => {
  const banner = page.locator('text=/AI|attention|flagged/i').first();
  await expect(banner).toBeVisible({ timeout: 8000 });
});

test('Standard Reports tab loads', async ({ page }) => {
  const tab = page.locator('text=/Standard Reports|Standard/i').first();
  if (await tab.isVisible()) {
    await tab.click();
    await page.waitForTimeout(500);
  }
  const cards = page.locator('[class*="card"], [class*="report"]').first();
  await expect(cards).toBeVisible({ timeout: 8000 });
});

test('report cards have Run Report buttons', async ({ page }) => {
  const btn = page.locator('button:has-text("Run"), button:has-text("Run report"), a:has-text("Run")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('clicking Run Report does not show "Report not found"', async ({ page }) => {
  // Standard Reports tab hosts the runnable report catalog.
  const stdTab = page.getByRole('tab', { name: /Standard Reports/i }).first();
  if (await stdTab.isVisible().catch(() => false)) {
    await stdTab.click();
    await page.waitForTimeout(800);
  }
  const btn = page.locator('button:has-text("Run"), button:has-text("Run report"), a:has-text("Run")').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Should land on a report view, not the not-found fallback.
    await expect(page.locator('body')).not.toContainText('Report not found');
  }
});

test('report cards visible — Caseload Summary', async ({ page }) => {
  const card = page.locator('text=/Caseload Summary|Caseload/i').first();
  await expect(card).toBeVisible({ timeout: 8000 });
});

test('My Reports tab works', async ({ page }) => {
  const tab = page.locator('text="My Reports"').first();
  if (await tab.isVisible()) {
    await tab.click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('Ask AI about data panel visible', async ({ page }) => {
  const ai = page.locator('text=/Ask AI|AI/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('no 404 on reports', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});

test('IPMG Audit Evidence Packet card visible', async ({ page }) => {
  // The standard report catalog (incl. the IPMG Audit Evidence Packet) lives
  // under the Standard Reports tab; My Reports is selected by default.
  const stdTab = page.getByRole('tab', { name: /Standard Reports/i }).first();
  if (await stdTab.isVisible().catch(() => false)) {
    await stdTab.click();
    await page.waitForTimeout(800);
  }
  const card = page.locator('text=/IPMG|Audit Evidence|Audit/i').first();
  await expect(card).toBeVisible({ timeout: 8000 });
});
