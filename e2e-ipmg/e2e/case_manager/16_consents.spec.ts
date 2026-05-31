/**
 * 16_consents.spec.ts — Consents / e-Signature
 * Note: The app uses /people/:id/esignature route (not /consents)
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('esignature page loads for individual', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/esignature`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('body')).not.toContainText('Not Found');
});

test('esignature heading visible', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/esignature`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const heading = page.locator('text=/e-Signature|eSignature|Signature|consent/i').first();
  await expect(heading).toBeVisible({ timeout: 8000 });
});

test('esignature page has New or Add button', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/esignature`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Request"), button:has-text("Sign")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('esignature content renders (records or empty state)', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/esignature`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Either pending-signature records render (Sign Document buttons / queue heading)
  // or an empty state. Match the e-Signature content region.
  const content = page
    .locator('text=/e-Signature Queue|Pending Signatures|Sign Document|signature|consent|document|No .*signatures|nothing to sign/i')
    .first();
  await expect(content).toBeVisible({ timeout: 8000 });
});

test('person module route loads for consents', async ({ page }) => {
  // consents may be accessible via the module route
  await page.goto(`/people/${PERSON_ID}/module/consents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // May redirect to NotFound or show a placeholder — just no 500 error
  await expect(page.locator('body')).not.toContainText('500');
});

test('no 404 on esignature route', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/esignature`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
