/**
 * 02_managed_documents.spec.ts — Regression: managed-documents TDZ crash fix.
 * The page previously threw "Cannot access 'x' before initialization".
 */
import { test, expect } from '@playwright/test';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('managed documents renders without TDZ crash', async ({ page }) => {
  const guard = attachCrashGuard(page);
  await page.goto(`/people/${PERSON_ID}/managed-documents`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
  await page.waitForTimeout(1500);

  await guard.assertNoCrash(`/people/${PERSON_ID}/managed-documents`);

  await expect(page.locator('text=/Managed Documents/i').first()).toBeVisible({ timeout: 12000 });

  // The TDZ error text must NOT appear anywhere on the page.
  await expect(page.locator('body')).not.toContainText('Cannot access');
});
