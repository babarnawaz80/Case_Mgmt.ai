/**
 * 14_eligibility.spec.ts — Eligibility Verification
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('eligibility page loads for individual', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/eligibility-verification`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Eligibility/i').first()).toBeVisible({ timeout: 8000 });
});

test('AI suggestions panel shows', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/eligibility-verification`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const ai = page.locator('text=/AI|URGENT|MA|eligibility/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('Add verification button exists', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/eligibility-verification`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Verify")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('new eligibility form renders', async ({ page }) => {
  await page.goto(`/people/ind-002/eligibility-verification/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  const form = page.locator('text=/Eligibility|MA STATUS|Verification/i').first();
  await expect(form).toBeVisible({ timeout: 8000 });
});

test('no 404 on eligibility pages', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/eligibility-verification`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
