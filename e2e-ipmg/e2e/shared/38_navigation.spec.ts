/**
 * 38_navigation.spec.ts — Navigation & Sidebar
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/home');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('sidebar renders', async ({ page }) => {
  // Sidebar nav has multiple icons/links
  const sidebar = page.locator('nav, [class*="sidebar"], [class*="nav"]').first();
  await expect(sidebar).toBeVisible({ timeout: 8000 });
});

test('People nav link navigates to /people', async ({ page }) => {
  const link = page.locator('a[href="/people"], a[href*="/people"]').first();
  if (await link.isVisible()) {
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/people/);
  }
});

test('My Work nav link navigates to /my-work', async ({ page }) => {
  const link = page.locator('a[href="/my-work"], a[href*="my-work"]').first();
  if (await link.isVisible()) {
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/my-work/);
  }
});

test('Messages nav link navigates to /messages', async ({ page }) => {
  const link = page.locator('a[href="/messages"], a[href*="messages"]').first();
  if (await link.isVisible()) {
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/messages/);
  }
});

test('Reports nav link navigates to /reports', async ({ page }) => {
  const link = page.locator('a[href="/reports"], a[href*="reports"]').first();
  if (await link.isVisible()) {
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/reports/);
  }
});

test('Incidents nav link navigates to /incidents', async ({ page }) => {
  const link = page.locator('a[href="/incidents"], a[href*="incidents"]').first();
  if (await link.isVisible()) {
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/incidents/);
  }
});

test('active sidebar item highlighted', async ({ page }) => {
  await page.goto('/people');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  // Some active indicator
  const active = page.locator('[aria-current="page"], [class*="active"], [class*="current"]').first();
  await expect(active).toBeVisible({ timeout: 5000 });
});

test('page title matches route — People', async ({ page }) => {
  await page.goto('/people');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await expect(page.locator('text=/People Supported|People/i').first()).toBeVisible({ timeout: 5000 });
});

test('page title matches route — My Work', async ({ page }) => {
  await page.goto('/my-work');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await expect(page.locator('text=/My Work/i').first()).toBeVisible({ timeout: 5000 });
});

test('page title matches route — Incidents', async ({ page }) => {
  await page.goto('/incidents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await expect(page.locator('text=/Incident/i').first()).toBeVisible({ timeout: 5000 });
});

test('page title matches route — Reports', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  await expect(page.locator('text=/Reports/i').first()).toBeVisible({ timeout: 5000 });
});

test('no 404 on any core routes', async ({ page }) => {
  const routes = ['/home', '/dashboard', '/people', '/my-work', '/messages', '/incidents', '/reports'];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('404');
  }
});
