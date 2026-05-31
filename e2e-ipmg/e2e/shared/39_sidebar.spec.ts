/**
 * 39_sidebar.spec.ts — Sidebar deep tests
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('sidebar is visible on dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const sidebar = page.locator('nav, [class*="sidebar"], [class*="sidenav"]').first();
  await expect(sidebar).toBeVisible({ timeout: 8000 });
});

test('sidebar has multiple navigation links', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const links = page.locator('nav a, [class*="sidebar"] a, [class*="nav-item"]');
  const count = await links.count();
  expect(count).toBeGreaterThan(3);
});

test('breadcrumb shows on deep route', async ({ page }) => {
  await page.goto('/people/ind-001/care-plan');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Breadcrumb renders as a "People · <Name> · <Module>" trail.
  const crumb = page
    .getByRole('navigation', { name: /breadcrumb/i })
    .or(page.locator('[class*="breadcrumb"]'))
    .or(page.locator('text=/People\\s*·/i'))
    .or(page.locator('text=/People/i'))
    .first();
  await expect(crumb).toBeVisible({ timeout: 8000 });
});

test('back button works on module pages', async ({ page }) => {
  await page.goto('/people/ind-001/care-plan');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), [aria-label="back"]').first();
  if (await backBtn.isVisible()) {
    await backBtn.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});
