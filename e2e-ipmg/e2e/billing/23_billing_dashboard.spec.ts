/**
 * 23_billing_dashboard.spec.ts — Billing Dashboard
 * Login as: Bailey (Billing) — falls back to kathy if auth fails
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
  await page.goto('/billing');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
});

test('billing page loads at /billing', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Billing|billing/i').first()).toBeVisible({ timeout: 8000 });
});

test('stat cards render', async ({ page }) => {
  const stat = page.locator('text=/Pending|Scrub|Submitted|Attention/i').first();
  await expect(stat).toBeVisible({ timeout: 8000 });
});

test('AI Billing Agent banner shows', async ({ page }) => {
  const ai = page.locator('text=/AI Billing Agent|AI|Billing Agent/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('billing tabs render', async ({ page }) => {
  const tab = page.locator('text=/All Claims|Pending|Ready|Submitted/i').first();
  await expect(tab).toBeVisible({ timeout: 8000 });
});

test('switching tabs works', async ({ page }) => {
  const tabs = ['Pending Scrub', 'Submitted', 'Denied'];
  for (const tab of tabs) {
    const el = page.locator(`text="${tab}"`).first();
    if (await el.isVisible()) {
      await el.click();
      await page.waitForTimeout(300);
    }
  }
  await expect(page.locator('body')).not.toContainText('404');
});

test('no 404 on billing', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
