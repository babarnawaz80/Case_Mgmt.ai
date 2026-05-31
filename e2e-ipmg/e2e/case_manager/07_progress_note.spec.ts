/**
 * 07_progress_note.spec.ts — Progress Note
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('progress note list loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Progress Note/i').first()).toBeVisible({ timeout: 8000 });
});

test('new progress note page loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Progress Note/i').first()).toBeVisible({ timeout: 8000 });
});

test('person name shows on new progress note', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const name = page.locator('text=/Person Supported|[A-Z][a-z]+,\\s+[A-Z][a-z]+/i').first();
  await expect(name).toBeVisible({ timeout: 8000 });
});

test('AI pre-fill banner shows', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const banner = page.locator('text=/pre-filled|ambient|AI/i').first();
  await expect(banner).toBeVisible({ timeout: 8000 });
});

test('required fields are present', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const fields = [/Activity Type/i, /Progress Date/i, /Start Time/i, /End Time/i];
  for (const field of fields) {
    await expect(page.locator('text=' + field.toString()).first()).toBeVisible({ timeout: 5000 });
  }
});

test('billable field present', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('text=/BILLABLE|billable/i').first()).toBeVisible({ timeout: 5000 });
});

test('Submit / Sign button is present', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("Submit"), button:has-text("Sign"), button:has-text("Review")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('AI panel shows on progress note', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const ai = page.locator('text=/Case Management AI|AI/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('Progress Toward Goals section renders', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/progress-note/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const goals = page.locator('text=/Progress Toward Goals|Goals/i').first();
  await expect(goals).toBeVisible({ timeout: 8000 });
});
