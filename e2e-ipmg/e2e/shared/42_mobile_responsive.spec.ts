/**
 * 42_mobile_responsive.spec.ts — Mobile Responsive
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const MOBILE = { width: 390, height: 844 }; // iPhone 14

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('home screen renders on mobile', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/home');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/good (morning|afternoon|evening)|Kathy/i').first()).toBeVisible({ timeout: 8000 });
});

test('people list renders on mobile', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/people');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.getByRole('heading', { name: /People/i }).first()).toBeVisible({ timeout: 8000 });
});

test('progress note renders on mobile with no overflow', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/people/ind-001/progress-note/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Progress Note/i').first()).toBeVisible({ timeout: 8000 });
  // Check no horizontal scroll overflow
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(MOBILE.width + 20); // 20px tolerance
});

test('dashboard renders on mobile', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
});

test('my work renders on mobile', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/my-work');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.getByRole('heading', { name: /My Work/i }).first()).toBeVisible({ timeout: 8000 });
});

test('messages page renders on mobile', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/messages');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
});

test('incidents renders on mobile', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto('/incidents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Incident/i').first()).toBeVisible({ timeout: 8000 });
});
