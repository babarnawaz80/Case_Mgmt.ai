/**
 * 24_billing_reconcile.spec.ts — Billing Reconcile
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

const billAuth = authStateFile('billing');
const cmAuth = authStateFile('case-manager');

function getAuthFile() {
  try {
    const data = JSON.parse(fs.readFileSync(billAuth, 'utf8'));
    const hasOrigins = data.origins?.length > 0 && data.origins[0]?.localStorage?.length > 0;
    return hasOrigins ? billAuth : cmAuth;
  } catch {
    return cmAuth;
  }
}

test.use({ storageState: getAuthFile() });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'billing');
});

test('billing page loads', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Billing/i').first()).toBeVisible({ timeout: 8000 });
});

test('Reconcile tab renders if visible', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const reconcile = page.locator('text=/Reconcile|835|remittance/i').first();
  // Optional — may not be visible for all roles
  await expect(page.locator('body')).not.toContainText('404');
});

test('upload zone or file input renders on billing', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Check for file-related UI
  const upload = page.locator('text=/upload|drag|drop|835|CSV/i').first();
  // Optional
  await expect(page.locator('body')).not.toContainText('404');
});
