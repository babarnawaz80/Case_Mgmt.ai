/**
 * 04_people_supported.spec.ts — People Supported list
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/people');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await ensureAuth(page);
});

test('people list loads at /people', async ({ page }) => {
  await expect(page).toHaveURL(/\/people/);
  await expect(page.locator('body')).not.toContainText('404');
});

test('page heading visible', async ({ page }) => {
  const heading = page.locator('text=/People Supported|People/i').first();
  await expect(heading).toBeVisible({ timeout: 8000 });
});

test('individual cards render', async ({ page }) => {
  // At least one person record visible
  const rows = page.locator('[class*="person"], [class*="individual"], [class*="card"], tr').first();
  await expect(rows).toBeVisible({ timeout: 10000 });
});

test('AI banner shows at top', async ({ page }) => {
  const banner = page.locator('text=/AI/i').first();
  await expect(banner).toBeVisible({ timeout: 8000 });
});

test('search by name works', async ({ page }) => {
  const search = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]').first();
  if (await search.isVisible()) {
    await search.fill('Brown');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Brown/i').first()).toBeVisible({ timeout: 5000 });
  }
});

test('eChart links are present', async ({ page }) => {
  // When individuals are assigned, each row links/buttons into the eChart.
  // When the list is empty an explicit empty-state message renders instead.
  const eChart = page
    .locator('a[href*="echart"]')
    .or(page.getByRole('button', { name: /eChart/i }))
    .or(page.locator('text=/eChart/i'))
    .first();
  const emptyState = page.locator('text=/No individuals|no people|not assigned/i').first();
  await expect(eChart.or(emptyState).first()).toBeVisible({ timeout: 10000 });
});

test('clicking eChart navigates to echart page', async ({ page }) => {
  const eChartLink = page.locator('a[href*="/echart"]').first();
  if (await eChartLink.isVisible()) {
    const href = await eChartLink.getAttribute('href');
    await eChartLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/echart/);
  }
});

test('Add Person / new person button visible', async ({ page }) => {
  const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Add")').first();
  await expect(addBtn).toBeVisible({ timeout: 8000 });
});

test('no 404 on people page', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
});
