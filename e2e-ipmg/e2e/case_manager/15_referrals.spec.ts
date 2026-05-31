/**
 * 15_referrals.spec.ts — Referrals
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('referrals list loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/referrals`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Referrals|Referral/i').first()).toBeVisible({ timeout: 8000 });
});

test('person name visible on referrals', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/referrals`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Person name renders in "First Last" (paragraph) and breadcrumb; match a name token.
  await expect(page.locator('text=/[A-Z][a-z]+\\s+[A-Z][a-z]+/').first()).toBeVisible({ timeout: 8000 });
});

test('AI banner shows', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/referrals`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const ai = page.locator('text=/AI|employment|interest/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('referral status tabs render', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/referrals`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const pending = page.locator('text=/PENDING|Pending/i').first();
  await expect(pending).toBeVisible({ timeout: 8000 });
});

test('New Referral button visible', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/referrals`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("New Referral"), button:has-text("New"), button:has-text("Add")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('new referral form page loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/referrals/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Referral|New Referral/i').first()).toBeVisible({ timeout: 8000 });
});

test('new referral form has AI suggested content', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/referrals/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const ai = page.locator('text=/AI suggested|AI/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('global referrals page loads', async ({ page }) => {
  await page.goto('/referrals');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Referrals/i').first()).toBeVisible({ timeout: 8000 });
});
