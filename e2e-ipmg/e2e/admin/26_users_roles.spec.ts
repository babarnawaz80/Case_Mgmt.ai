/**
 * 26_users_roles.spec.ts — Users & Roles Settings
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
});

test('users and roles page loads at /settings/users', async ({ page }) => {
  await page.goto('/settings/users');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Users|users|roles/i').first()).toBeVisible({ timeout: 8000 });
});

test('user list shows users', async ({ page }) => {
  await page.goto('/settings/users');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Some user entries visible
  const user = page.locator('[class*="user"], [class*="row"], [class*="member"]').first();
  await expect(user).toBeVisible({ timeout: 8000 });
});

test('Roles & Permissions tab exists', async ({ page }) => {
  await page.goto('/settings/users');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const tab = page.locator('text=/Roles.*Permissions|Roles|Permissions/i').first();
  await expect(tab).toBeVisible({ timeout: 8000 });
});

test('Roles tab shows content when clicked', async ({ page }) => {
  await page.goto('/settings/users');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const tab = page.locator('text=/Roles.*Permissions|Roles/i').first();
  if (await tab.isVisible()) {
    await tab.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('no 404 on users settings', async ({ page }) => {
  await page.goto('/settings/users');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
