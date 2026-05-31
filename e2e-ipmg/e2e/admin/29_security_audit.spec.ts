/**
 * 29_security_audit.spec.ts — Security & Audit
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
  await page.goto('/settings/security');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('security page loads', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Security|security/i').first()).toBeVisible({ timeout: 8000 });
});

test('password policy section renders', async ({ page }) => {
  const policy = page.locator('text=/password policy|password/i').first();
  await expect(policy).toBeVisible({ timeout: 8000 });
});

test('MFA section renders', async ({ page }) => {
  const mfa = page.locator('text=/MFA|multi-factor|two-factor/i').first();
  await expect(mfa).toBeVisible({ timeout: 8000 });
});

test('session timeout section renders', async ({ page }) => {
  const session = page.locator('text=/session|timeout|idle/i').first();
  await expect(session).toBeVisible({ timeout: 8000 });
});

test('compliance or encryption section renders', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const compliance = page.locator('text=/SOC 2|HIPAA|TLS|AES|compliance|encrypt/i').first();
  await expect(compliance).toBeVisible({ timeout: 8000 });
});

test('no 404 on security page', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
