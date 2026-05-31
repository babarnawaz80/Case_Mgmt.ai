/**
 * 01_duplicate_review.spec.ts — Regression: /people/duplicates must not crash.
 * Locks in the fix for the DuplicateReviewPanel crash.
 */
import { test, expect } from '@playwright/test';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

test.use({ storageState: authStateFile('admin') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'admin');
});

test('duplicate review page renders without crashing', async ({ page }) => {
  const guard = attachCrashGuard(page);
  await page.goto('/people/duplicates');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
  await page.waitForTimeout(1500);

  await guard.assertNoCrash('/people/duplicates');

  // Either the heading OR a valid empty/all-clear state must be visible — NOT the
  // ErrorBoundary (asserted by the guard above).
  const ok = page.locator('text=/DUPLICATE REVIEW|All clear|No pending/i').first();
  await expect(ok).toBeVisible({ timeout: 12000 });
});
