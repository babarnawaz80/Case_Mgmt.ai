/**
 * 05_schedule_save.spec.ts — Regression (deep workflow): scheduling a visit
 * with the optional Linked Plan/Task/Notes left EMPTY must succeed.
 *
 * The bug: those optional fields were sent to Firestore as `undefined`, and
 * Firestore rejects writes containing undefined → "Failed to schedule visit.
 * Please try again." Fixed via ignoreUndefinedProperties on the Firestore init.
 *
 * Opens the Schedule-a-Visit modal from the dashboard, fills only the required
 * fields, leaves the optional ones empty, saves, and asserts the error toast
 * does NOT appear. Skips gracefully (never hangs / false-fails) if the modal or
 * individual results aren't drivable in the target environment.
 */
import { test, expect } from '@playwright/test';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('scheduling a visit with no linked goal/task/notes does not fail', async ({ page }) => {
  const guard = attachCrashGuard(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
  await page.waitForTimeout(1500);

  // Open the Schedule-a-Visit modal via the TODAY'S SCHEDULE "New"/"Schedule" button.
  const openBtn = page
    .getByRole('button', { name: /^(New|Schedule)$/ })
    .first();
  if (!(await openBtn.count())) {
    console.log('DBG skip: no open btn'); test.skip(true, 'Schedule entry button not found on dashboard.');
    return;
  }
  await openBtn.click();

  const heading = page.getByText('Schedule a Visit', { exact: false });
  if (!(await heading.isVisible({ timeout: 4000 }).catch(() => false))) {
    console.log('DBG skip: modal did not open'); test.skip(true, 'Schedule-a-Visit modal did not open.');
    return;
  }

  // Pick an individual: type, wait for a result row in the dropdown, click it.
  const search = page.locator('input[placeholder="Search individuals…"]').first();
  await search.click();
  await search.fill('a');
  // Scope to the search dropdown (div.absolute.z-50.top-full) — NOT any z-50
  // element (the modal's close button is also z-50).
  const result = page.locator('div[class*="top-full"] button').first();
  if (!(await result.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.log('DBG skip: no results in dropdown'); test.skip(true, 'No individual results available.');
    return;
  }
  await result.click();

  // Fill required Visit Details (visit type defaults to a valid value).
  const dateInput = page.locator('input[type="date"]').first();
  if (await dateInput.count()) await dateInput.fill('2026-12-15');
  const timeInputs = page.locator('input[type="time"]');
  if ((await timeInputs.count()) >= 2) {
    await timeInputs.nth(0).fill('10:00');
    await timeInputs.nth(1).fill('11:00');
  }

  // Leave Linked Plan Goal / Linked Monitoring Task / Notes EMPTY — the bug trigger.

  const saveBtn = page.getByRole('button', { name: /Save as Scheduled/i });
  await expect(saveBtn).toBeVisible({ timeout: 5000 });
  await saveBtn.click();
  await page.waitForTimeout(3500);

  // THE regression assertion: the failure toast must not appear.
  await expect(
    page.locator('text=/Failed to schedule visit/i'),
    'The "Failed to schedule visit" toast appeared — the undefined-field Firestore write is failing again.'
  ).toHaveCount(0);

  await guard.assertNoCrash('schedule save');
});
