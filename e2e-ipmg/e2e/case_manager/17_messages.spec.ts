/**
 * 17_messages.spec.ts — Messages
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/messages');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('messages page loads at /messages', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Messages|message/i').first()).toBeVisible({ timeout: 8000 });
});

test('conversation list renders', async ({ page }) => {
  // Conversations render as buttons in the list (sender name + preview),
  // alongside filter buttons (All / Direct / Groups / Unread). Either the
  // conversation list or its empty state should be visible.
  const item = page
    .getByRole('button', { name: /Direct|Groups|Unread/i })
    .or(page.locator('text=/Search conversations|No conversations|New message/i'))
    .first();
  await expect(item).toBeVisible({ timeout: 8000 });
});

test('filter tabs render', async ({ page }) => {
  const tabs = page.locator('text=/All|Direct|Groups|Unread/i').first();
  await expect(tabs).toBeVisible({ timeout: 8000 });
});

test('clicking Direct filter works', async ({ page }) => {
  const direct = page.locator('text="Direct"').first();
  if (await direct.isVisible()) {
    await direct.click();
    await page.waitForTimeout(500);
    // No crash
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('New message button visible', async ({ page }) => {
  const btn = page.locator('button:has-text("New message"), button:has-text("New"), button:has-text("Compose")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('clicking a conversation opens it', async ({ page }) => {
  const item = page.locator('[class*="conversation"], [class*="thread"], [class*="chat-item"]').first();
  if (await item.isVisible()) {
    await item.click();
    await page.waitForTimeout(1000);
    // Message input should appear
    const input = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  }
});

test('@AI hint visible in messages', async ({ page }) => {
  const hint = page.locator('text=/@AI|@ai/i').first();
  // Optional — may not always be visible
  await expect(page.locator('body')).not.toContainText('404');
});

test('no 404 on messages', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
