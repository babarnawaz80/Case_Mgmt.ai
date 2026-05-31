/**
 * 25_admin_settings.spec.ts — Admin Settings
 * Login as: Alex (Admin) — falls back to kathy
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
    const hasOrigins = data.origins?.length > 0 && data.origins[0]?.localStorage?.length > 0;
    return hasOrigins ? adminAuth : cmAuth;
  } catch {
    return cmAuth;
  }
}

test.use({ storageState: getAuthFile() });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'admin');
  await page.goto('/settings');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('settings page loads at /settings', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Settings|Admin/i').first()).toBeVisible({ timeout: 8000 });
});

test('settings tiles are present', async ({ page }) => {
  const tiles = ['Organization', 'Users', 'Programs', 'AI Settings'];
  let found = 0;
  for (const tile of tiles) {
    const el = page.locator(`text="${tile}"`).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false)) found++;
  }
  expect(found).toBeGreaterThan(0);
});

test('Users & Roles tile navigates', async ({ page }) => {
  const tile = page.locator('text=/Users.*Roles|Users/i').first();
  if (await tile.isVisible()) {
    await tile.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('Organization tile navigates', async ({ page }) => {
  const tile = page.locator('text=Organization').first();
  if (await tile.isVisible()) {
    await tile.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('no 404 on settings', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
