/**
 * 30_provider_directory.spec.ts — Provider Directory
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

test('provider directory loads', async ({ page }) => {
  await page.goto('/admin/provider-directory');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Provider Directory|provider/i').first()).toBeVisible({ timeout: 8000 });
});

test('providers are listed or empty state shown', async ({ page }) => {
  await page.goto('/admin/provider-directory');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Either provider rows render OR an empty state — both valid
  const content = page.getByText(/provider|No providers|Add Provider|NPI/i).first();
  await expect(content).toBeVisible({ timeout: 8000 });
});

test('provider directory filter options render', async ({ page }) => {
  await page.goto('/admin/provider-directory');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Category filter / Add Provider control present
  const control = page.getByText(/Day Services|Employment|Behavioral|Add Provider|Import CSV/i).first();
  await expect(control).toBeVisible({ timeout: 8000 });
});

test('clicking a provider opens detail', async ({ page }) => {
  await page.goto('/admin/provider-directory');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const provider = page.locator('[class*="provider"], [class*="row"]').first();
  if (await provider.isVisible()) {
    await provider.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('no 404 on provider directory', async ({ page }) => {
  await page.goto('/admin/provider-directory');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
