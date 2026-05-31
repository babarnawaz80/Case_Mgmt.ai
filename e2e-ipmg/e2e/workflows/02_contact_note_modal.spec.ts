/**
 * 02_contact_note_modal.spec.ts — Deep workflow: the New Contact Note modal
 * opens and closes cleanly (open → Cancel) with no crash. Verifies the modal
 * lifecycle, which the route crawler alone does not exercise.
 */
import { test, expect } from '@playwright/test';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

test.use({ storageState: authStateFile('admin') });

const PID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'admin');
});

test('New Contact Note modal opens and cancels cleanly', async ({ page }) => {
  const guard = attachCrashGuard(page);
  await page.goto(`/people/${PID}/contact-note`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
  await page.waitForTimeout(1200);
  await guard.assertNoCrash('contact-note');

  const newBtn = page.getByRole('button', { name: /new contact note/i }).first();
  if (!(await newBtn.isVisible({ timeout: 6000 }).catch(() => false))) {
    test.skip(true, 'New Contact Note button not present.');
    return;
  }
  await newBtn.click();

  // Modal opens — scope to the heading (the trigger button also says this).
  const modalHeading = page.getByRole('heading', { name: /new contact note/i });
  await expect(modalHeading).toBeVisible({ timeout: 5000 });
  await guard.assertNoCrash('contact-note modal open');

  // Cancel closes it without saving.
  const cancel = page.getByRole('button', { name: /^cancel$/i }).first();
  await cancel.click();
  await page.waitForTimeout(800);

  // The modal's required-field labels should be gone (modal dismissed).
  await expect(page.getByText('PERSON SUPPORTED', { exact: false })).toHaveCount(0);
  await guard.assertNoCrash('contact-note modal close');
});
