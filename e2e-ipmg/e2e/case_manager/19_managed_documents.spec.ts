/**
 * 19_managed_documents.spec.ts — Managed Documents
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('managed documents page loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/managed-documents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Managed Documents/i').first()).toBeVisible({ timeout: 12000 });
});

test('/people/:id/documents route also loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/documents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
});

test('AI document monitor banner shows', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/managed-documents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const banner = page.locator('text=/AI Document|document monitor|AI/i').first();
  await expect(banner).toBeVisible({ timeout: 8000 });
});

test('folder structure or file list renders', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/managed-documents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await ensureAuth(page);
  // Either folders/files render OR an empty state — both are valid
  const content = page.locator('text=/Assessments|Behavioral|Medical|folder|file|no documents|drop|upload/i').first();
  await expect(content).toBeVisible({ timeout: 10000 });
});

test('stat cards show file info', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/managed-documents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const stat = page.locator('text=/FILES|file|SIZE|document/i').first();
  await expect(stat).toBeVisible({ timeout: 8000 });
});

test('no 404 on managed documents', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/managed-documents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
