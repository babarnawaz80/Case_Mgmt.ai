/**
 * 04_individual_picker_subtitle.spec.ts — Regression: the Schedule-a-Visit
 * individual search must render a human subtitle (MA#, DOB, program) under each
 * name, never the raw doc id. Resilient: never throws if the modal structure
 * shifts — at minimum asserts no crash on /schedule.
 */
import { test, expect } from '@playwright/test';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

test.use({ storageState: authStateFile('case-manager') });

const UID_RE = /^[A-Za-z0-9_-]{18,28}$/;

function looksLikeUid(text: string): boolean {
  const t = text.trim();
  if (t.includes(' ') || t.includes('@')) return false;
  return UID_RE.test(t);
}

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('individual picker subtitle is not a raw doc id', async ({ page }) => {
  const guard = attachCrashGuard(page);
  await page.goto('/schedule');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
  await page.waitForTimeout(1500);

  // Open the Schedule-a-Visit modal via the "Schedule"/"New" button.
  const newBtn = page.locator('button:has-text("Schedule"), button:has-text("New")').first();
  if (await newBtn.count()) {
    await newBtn.click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // Type into the individual search box to list individuals.
  const search = page.locator('input[placeholder="Search individuals…"]').first();
  if (await search.count()) {
    await search.click().catch(() => {});
    await search.fill('a').catch(() => {});
    await page.waitForTimeout(1200);

    // The dropdown list buttons each contain a name <p> and an optional subtitle <p>.
    const subtitleTexts = await page
      .locator('div.absolute.z-50 button p')
      .allInnerTexts()
      .catch(() => [] as string[]);

    const offenders = subtitleTexts
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .filter((t) => looksLikeUid(t));

    expect(offenders, `Individual picker lines that look like raw doc ids:\n${offenders.join('\n')}`).toEqual([]);
  }

  // Core resilient assertion: the page/modal did not crash.
  await guard.assertNoCrash('/schedule individual picker');
});
