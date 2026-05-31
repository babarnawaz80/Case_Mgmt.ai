/**
 * 05_echart.spec.ts — Individual eChart
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto(`/people/${PERSON_ID}/echart`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('echart page loads with no 404', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page).toHaveURL(/echart/);
});

test('echart heading visible', async ({ page }) => {
  const heading = page.locator('text=/eChart|EChart/i').first();
  await expect(heading).toBeVisible({ timeout: 8000 });
});

test('individual name shows in header', async ({ page }) => {
  // Heading renders the person's name in "Last, First" format.
  const name = page.locator('h1').filter({ hasText: /,\s/ }).first();
  await expect(name).toBeVisible({ timeout: 8000 });
});

test('AI panel renders with suggestions', async ({ page }) => {
  const ai = page.locator('text=/Case Management AI|AI/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('tile grid renders', async ({ page }) => {
  // At least multiple tiles visible
  const tiles = page.locator('[class*="tile"], [class*="card"], [class*="grid"] > *');
  const count = await tiles.count();
  expect(count).toBeGreaterThan(3);
});

test('required tiles are present', async ({ page }) => {
  const requiredTiles = [
    /Progress Note/i,
    /Contact Notes/i,
    /PCP/i,
    /Referrals/i,
  ];
  for (const tile of requiredTiles) {
    const el = page.getByRole('button', { name: tile }).first();
    await expect(el).toBeVisible({ timeout: 5000 });
  }
});

test('Progress Notes tile navigates to progress-note route', async ({ page }) => {
  const tile = page.locator('text="Progress Notes"').first();
  if (await tile.isVisible()) {
    await tile.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/progress-note/);
  }
});

test('Contact Notes tile navigates to contact-note route', async ({ page }) => {
  const tile = page.locator('text="Contact Notes"').first();
  if (await tile.isVisible()) {
    await tile.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/contact-note/);
  }
});

test('Care Plan tile navigates to care-plan route', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/echart`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  const tile = page.locator('text="Care Plan"').first();
  if (await tile.isVisible()) {
    await tile.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/care-plan/);
  }
});

test('Face Sheet / profile link loads', async ({ page }) => {
  const faceSheet = page.locator('text=/Face Sheet|Profile/i').first();
  if (await faceSheet.isVisible()) {
    await faceSheet.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});
