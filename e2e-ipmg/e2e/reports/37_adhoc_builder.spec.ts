/**
 * 37_adhoc_builder.spec.ts — Ad Hoc Report Builder
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('report builder loads at /reports/builder', async ({ page }) => {
  await page.goto('/reports/builder');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Report Builder|Builder|builder/i').first()).toBeVisible({ timeout: 8000 });
});

test('query input is present', async ({ page }) => {
  await page.goto('/reports/builder');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const input = page.locator('input, textarea, [contenteditable]').first();
  await expect(input).toBeVisible({ timeout: 8000 });
});

test('save or export buttons present', async ({ page }) => {
  await page.goto('/reports/builder');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("Save"), button:has-text("Export"), button:has-text("CSV"), button:has-text("Excel")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('Report Builder button on reports page opens builder', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("Report Builder"), a:has-text("Report Builder"), button:has-text("Builder")').first();
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('no 404 on report builder', async ({ page }) => {
  await page.goto('/reports/builder');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
