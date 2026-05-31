/**
 * 28_ai_settings.spec.ts — AI Settings
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

test('AI settings page loads', async ({ page }) => {
  await page.goto('/settings/ai');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/AI Settings|AI|settings/i').first()).toBeVisible({ timeout: 8000 });
});

test('ambient listening toggle is present', async ({ page }) => {
  await page.goto('/settings/ai');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const toggle = page.locator('text=/Ambient Listening|ambient/i').first();
  await expect(toggle).toBeVisible({ timeout: 8000 });
});

test('no 404 on AI settings', async ({ page }) => {
  await page.goto('/settings/ai');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
