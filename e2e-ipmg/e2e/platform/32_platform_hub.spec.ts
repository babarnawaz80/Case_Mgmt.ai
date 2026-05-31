/**
 * 32_platform_hub.spec.ts — Platform Hub (maps to /agents)
 * /agents requires admin role, so this suite uses admin auth.
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

const adminAuth = authStateFile('admin');
const cmAuth = authStateFile('case-manager');
function getAuthFile() {
  try {
    const data = JSON.parse(fs.readFileSync(adminAuth, 'utf8'));
    return data.origins?.length > 0 && data.origins[0]?.localStorage?.length > 0 ? adminAuth : cmAuth;
  } catch { return cmAuth; }
}
test.use({ storageState: getAuthFile() });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'admin');
});

test('platform redirects to /agents', async ({ page }) => {
  await page.goto('/platform');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
});

test('/agents page loads', async ({ page }) => {
  await page.goto('/agents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('body')).not.toContainText('Access Restricted');
  await expect(page.locator('text=/Agent|Platform|Guidelines|Compliance/i').first()).toBeVisible({ timeout: 8000 });
});

test('Guidelines Engines link/tile visible', async ({ page }) => {
  await page.goto('/agents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const tile = page.locator('text=/Guidelines|Engine|Agent/i').first();
  await expect(tile).toBeVisible({ timeout: 8000 });
});

test('no 404 on platform/agents', async ({ page }) => {
  await page.goto('/agents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
