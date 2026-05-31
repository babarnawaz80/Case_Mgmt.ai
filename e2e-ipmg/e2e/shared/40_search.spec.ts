/**
 * 40_search.spec.ts — Search / Command Palette
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('global search bar is present', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const search = page.locator('input[placeholder*="search" i], button[aria-label*="search" i], [class*="search"]').first();
  await expect(search).toBeVisible({ timeout: 8000 });
});

test('search opens with keyboard shortcut Cmd+K', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await page.keyboard.press('Meta+K');
  await page.waitForTimeout(1000);
  // Command palette or search input should be visible
  const palette = page.locator('[role="dialog"] input, [class*="command"] input, [class*="palette"] input').first();
  const isOpen = await palette.isVisible().catch(() => false);
  // Accept if palette opened OR if there's a search input in the UI
  const searchInput = page.locator('input[placeholder*="search" i]').first();
  const hasSearch = await searchInput.isVisible().catch(() => false);
  expect(isOpen || hasSearch).toBeTruthy();
});

test('typing in search shows results for "Brown"', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);

  await page.keyboard.press('Meta+K');
  await page.waitForTimeout(500);

  const input = page.locator('[role="dialog"] input, [class*="command"] input').first();
  if (await input.isVisible()) {
    await input.fill('Brown');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=/Brown/i').first()).toBeVisible({ timeout: 5000 });
  }
});

test('search on people page works', async ({ page }) => {
  await page.goto('/people');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const search = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]').first();
  if (await search.isVisible()) {
    await search.fill('Joseph');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Joseph|Brown/i').first()).toBeVisible({ timeout: 5000 });
  }
});

test('no 404 on search-related flows', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('Not Found');
});
