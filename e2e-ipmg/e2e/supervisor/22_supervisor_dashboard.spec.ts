/**
 * 22_supervisor_dashboard.spec.ts — Supervisor Dashboard
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

const supAuth = authStateFile('supervisor');
const cmAuth = authStateFile('case-manager');

function getAuthFile() {
  try {
    const data = JSON.parse(fs.readFileSync(supAuth, 'utf8'));
    const hasOrigins = data.origins?.length > 0 && data.origins[0]?.localStorage?.length > 0;
    return hasOrigins ? supAuth : cmAuth;
  } catch {
    return cmAuth;
  }
}

test.use({ storageState: getAuthFile() });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'supervisor');
});

test('dashboard shows caseload overview', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Dashboard|PCP|COMPLIANCE|CASELOAD/i').first()).toBeVisible({ timeout: 8000 });
});

test('compliance section visible', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const compliance = page.locator('text=/COMPLIANCE|PCP|compliance/i').first();
  await expect(compliance).toBeVisible({ timeout: 8000 });
});
