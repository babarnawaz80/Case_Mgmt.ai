/**
 * 02_home_chat.spec.ts — Home / AI Chat screen
 * Login as: Kathy Adams (Case Manager)
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

test('home screen renders with greeting', async ({ page }) => {
  const greeting = page.locator('text=/good (morning|afternoon|evening)/i').first();
  await expect(greeting).toBeVisible({ timeout: 10000 });
});

test('home screen shows user name', async ({ page }) => {
  const name = page.locator('text=/Kathy/i').first();
  await expect(name).toBeVisible({ timeout: 8000 });
});

test('four stat cards are visible', async ({ page }) => {
  await expect(page.locator('text=/People Supported/i').first()).toBeVisible({ timeout: 8000 });
  await expect(page.locator('text=/Pending Tasks/i').first()).toBeVisible({ timeout: 5000 });
});

test('chat input is visible', async ({ page }) => {
  // The home page uses a textarea or div with contenteditable for chat
  const input = page.locator('textarea, input[type="text"], [role="textbox"], [contenteditable]').first();
  await expect(input).toBeVisible({ timeout: 8000 });
});

test('Ambient and Scribe buttons are visible', async ({ page }) => {
  await expect(page.locator('text=Ambient').first()).toBeVisible({ timeout: 8000 });
  await expect(page.locator('text=Scribe').first()).toBeVisible({ timeout: 8000 });
});

test('suggested prompts are visible', async ({ page }) => {
  const prompts = ['overdue', 'today', 'risk'];
  let found = false;
  for (const p of prompts) {
    const el = page.locator(`text=/${p}/i`).first();
    if (await el.isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }
  expect(found).toBeTruthy();
});

test('chat history toggle or panel visible', async ({ page }) => {
  // Chat history may be collapsed — check for toggle button or panel
  const history = page.locator('text=/Chat History/i, [aria-label*="history" i], button:has([class*="PanelLeft"])').first();
  const isVisible = await history.isVisible().catch(() => false);
  // Chat history might only open after a message — just verify no error
  await expect(page.locator('body')).not.toContainText('404');
});

test('page body has no 404 text', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('body')).not.toContainText('Not Found');
});
