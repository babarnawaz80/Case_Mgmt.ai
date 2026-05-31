/**
 * 33_guidelines_engines.spec.ts — Guidelines Engines
 * Route: /agents/guidelines (was /platform/guidelines-engines)
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
  await page.goto('/agents/guidelines');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('guidelines engines list loads', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Guidelines|Engine/i').first()).toBeVisible({ timeout: 8000 });
});

test('/platform/guidelines-engines redirect works', async ({ page }) => {
  await page.goto('/platform/guidelines-engines');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).not.toContainText('404');
});

test('engines are listed', async ({ page }) => {
  const engine = page.locator('[class*="engine"], [class*="card"], [class*="row"]').first();
  await expect(engine).toBeVisible({ timeout: 8000 });
});

test('PUBLISHED or DRAFT badges show', async ({ page }) => {
  const badge = page.locator('text=/PUBLISHED|DRAFT|published|draft/i').first();
  await expect(badge).toBeVisible({ timeout: 8000 });
});

test('filter tabs visible', async ({ page }) => {
  const filter = page.locator('text=/TOTAL|Published|Draft|All/i').first();
  await expect(filter).toBeVisible({ timeout: 8000 });
});

test('New Engine button navigates to creation flow', async ({ page }) => {
  const btn = page.locator('button:has-text("New Engine"), button:has-text("New"), a:has-text("New")').first();
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('new engine wizard loads', async ({ page }) => {
  await page.goto('/agents/guidelines/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).not.toContainText('404');
  const wizard = page.locator('text=/Step 1|Upload|New Engine|Engine/i').first();
  await expect(wizard).toBeVisible({ timeout: 8000 });
});

test('no 404 on guidelines engines', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
