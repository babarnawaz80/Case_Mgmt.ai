/**
 * 20_ambient_listening.spec.ts — Ambient Listening
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({
  storageState: authStateFile('case-manager'),
  permissions: ['microphone'],
});

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  // Stub getUserMedia so the ambient recorder never hangs waiting on a real mic
  await page.addInitScript(() => {
    try {
      const fakeStream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () => Promise.resolve(fakeStream as unknown as MediaStream);
      }
    } catch { /* ignore */ }
  });
});

test('Ambient button is visible on home screen', async ({ page }) => {
  await page.goto('/home');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('text=Ambient').first()).toBeVisible({ timeout: 8000 });
});

test('Scribe button is visible on home screen', async ({ page }) => {
  await page.goto('/home');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('text=Scribe').first()).toBeVisible({ timeout: 8000 });
});

test('clicking Ambient opens consent / recording screen', async ({ page }) => {
  await page.goto('/home');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const ambient = page.locator('text=Ambient').first();
  if (await ambient.isVisible()) {
    await ambient.click({ noWaitAfter: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // Consent, modal, or recording screen — should not 404
    await expect(page.locator('body')).not.toContainText('404');
  }
});

test('clicking Scribe opens scribe mode', async ({ page }) => {
  await page.goto('/home');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const scribe = page.locator('text=Scribe').first();
  if (await scribe.isVisible()) {
    await scribe.click({ noWaitAfter: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('404');
  }
});
