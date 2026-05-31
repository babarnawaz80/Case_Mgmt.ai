/**
 * 18_team_meetings.spec.ts — Team Meetings
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/team-meetings');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('team meetings page loads', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Team Meeting|meeting/i').first()).toBeVisible({ timeout: 8000 });
});

test('meeting list shows items', async ({ page }) => {
  const item = page.locator('[class*="meeting"], [class*="row"], [class*="item"]').first();
  await expect(item).toBeVisible({ timeout: 8000 });
});

test('New Meeting or Upload button visible', async ({ page }) => {
  const btn = page.locator('button:has-text("New"), button:has-text("Upload"), button:has-text("Add"), a:has-text("New")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('no 404 on team meetings', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});

test('clicking a meeting item works', async ({ page }) => {
  const item = page.locator('[class*="meeting"], [class*="row"]').first();
  if (await item.isVisible()) {
    await item.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});
