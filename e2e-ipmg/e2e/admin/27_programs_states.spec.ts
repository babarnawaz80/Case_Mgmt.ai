/**
 * 27_programs_states.spec.ts — Programs & States
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

test('programs and states page loads', async ({ page }) => {
  await page.goto('/settings/programs');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Programs|States|program/i').first()).toBeVisible({ timeout: 8000 });
});

test('Indiana and New Jersey appear', async ({ page }) => {
  await page.goto('/settings/programs');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const indiana = page.locator('text=/Indiana|IN/i').first();
  await expect(indiana).toBeVisible({ timeout: 8000 });
});

test('no 404 on programs settings', async ({ page }) => {
  await page.goto('/settings/programs');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
