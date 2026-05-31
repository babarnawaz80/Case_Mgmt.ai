/**
 * auth-helper.ts — Ensures a page is authenticated.
 * Called in beforeEach of each test suite.
 */
import { type Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://app.casemanagement.ai';

export async function ensureAuth(page: Page, email?: string, password?: string): Promise<void> {
  const caseManagerEmail = email || process.env.CASE_MANAGER_EMAIL || 'kathy@demo.casemanagement.ai';
  const caseManagerPassword = password || process.env.CASE_MANAGER_PASSWORD || 'Demo1234!';

  // Check if already authenticated by trying a protected page
  const currentUrl = page.url();
  if (!currentUrl.includes(BASE) || currentUrl === 'about:blank') {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await page.waitForTimeout(2000);
  }

  if (!page.url().includes('/login')) {
    return; // Already authenticated
  }

  // Need to login
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const emailField = page.locator('input[type="email"], input[name="email"], #email').first();
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await emailField.fill(caseManagerEmail);

  const pwField = page.locator('input[type="password"]').first();
  await pwField.fill(caseManagerPassword);

  await page.locator('button[type="submit"]').first().click();

  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(2500);
}
