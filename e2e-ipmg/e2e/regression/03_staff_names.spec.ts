/**
 * 03_staff_names.spec.ts — Regression: staff <select> options must show human
 * names (or emails), never a raw Firebase UID. Locks in the staffDisplayName fix.
 */
import { test, expect } from '@playwright/test';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

// A raw Firebase UID: 18-28 chars of [A-Za-z0-9_-] with NO spaces and NO '@'.
// Real display names contain a space; emails contain '@'.
const UID_RE = /^[A-Za-z0-9_-]{18,28}$/;

function looksLikeUid(text: string): boolean {
  const t = text.trim();
  if (t.includes(' ') || t.includes('@')) return false;
  return UID_RE.test(t);
}

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('assigned staff select shows names, not raw UIDs', async ({ page }) => {
  const guard = attachCrashGuard(page);
  await page.goto(`/people/${PERSON_ID}/visit-summary/schedule`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
  await page.waitForTimeout(2000);
  await guard.assertNoCrash(`/people/${PERSON_ID}/visit-summary/schedule`);

  // Collect option texts from all <select> controls on the scheduler page.
  let optionTexts = await page.locator('select option').allInnerTexts();

  // Fallback: if the scheduler route had no select, try the /schedule "New" modal.
  if (optionTexts.length === 0) {
    await page.goto('/schedule');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await ensureAuth(page);
    const newBtn = page.locator('button:has-text("Schedule"), button:has-text("New")').first();
    if (await newBtn.count()) {
      await newBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
      optionTexts = await page.locator('select option').allInnerTexts();
    }
  }

  if (optionTexts.length === 0) {
    test.skip(true, 'No staff/assigned <select> found on either route — control may have moved.');
    return;
  }

  const offenders = optionTexts
    .map((t) => t.replace(/\s*·.*$/, '').replace(/\s*\(you\)\s*$/i, '').trim())
    .filter((t) => t.length > 0)
    .filter((t) => looksLikeUid(t));

  expect(offenders, `Staff select options that look like raw Firebase UIDs:\n${offenders.join('\n')}`).toEqual([]);
});
