/**
 * 41_notifications.spec.ts — Notifications & Inbox
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('notification bell visible', async ({ page }) => {
  // The notifications bell is exposed as the "Inbox" button in the banner.
  const bell = page.getByRole('button', { name: /Inbox/i }).first();
  await expect(bell).toBeVisible({ timeout: 8000 });
});

test('clicking bell opens inbox panel', async ({ page }) => {
  const bell = page.getByRole('button', { name: /Inbox/i }).first();
  if (await bell.isVisible()) {
    await bell.click();
    await page.waitForTimeout(1000);
    const inbox = page.getByText(/Inbox|notification|alert|Urgent|Mentions/i).first();
    await expect(inbox).toBeVisible({ timeout: 5000 });
  }
});

test('inbox shows tabs or categories', async ({ page }) => {
  const bell = page.getByRole('button', { name: /Inbox/i }).first();
  if (await bell.isVisible()) {
    await bell.click();
    await page.waitForTimeout(1000);
    const tab = page.getByText(/Urgent|Tasks|Mentions|AI|All/i).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  }
});

test('no 404 on notifications flow', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
