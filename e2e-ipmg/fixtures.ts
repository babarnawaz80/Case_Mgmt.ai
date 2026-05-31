/**
 * fixtures.ts — Playwright fixtures with auto-login per role.
 *
 * Firebase Auth stores state in IndexedDB, which Playwright's storageState
 * cannot capture. This fixture performs a fresh login before each test file
 * and caches the authenticated page context for the duration of the test.
 */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE = process.env.BASE_URL || 'https://app.casemanagement.ai';

const ROLE_CREDS = {
  caseManager: {
    email: process.env.CASE_MANAGER_EMAIL || 'kathy@demo.casemanagement.ai',
    password: process.env.CASE_MANAGER_PASSWORD || 'Demo1234!',
  },
  supervisor: {
    email: process.env.SUPERVISOR_EMAIL || 'jennie@demo.casemanagement.ai',
    password: process.env.SUPERVISOR_PASSWORD || 'Demo1234!',
  },
  billing: {
    email: process.env.BILLING_EMAIL || 'bailey@demo.casemanagement.ai',
    password: process.env.BILLING_PASSWORD || 'Demo1234!',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@demo.casemanagement.ai',
    password: process.env.ADMIN_PASSWORD || 'Demo1234!',
  },
};

export async function loginAs(page: Page, role: keyof typeof ROLE_CREDS): Promise<boolean> {
  const creds = ROLE_CREDS[role];

  // Check if already logged in
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(2000);

  if (!page.url().includes('/login')) {
    // Already authenticated
    return true;
  }

  // Perform login
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const emailField = page.locator('input[type="email"], input[name="email"], #email').first();
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await emailField.fill(creds.email);

  const pwField = page.locator('input[type="password"], input[name="password"], #password').first();
  await pwField.fill(creds.password);

  await page.locator('button[type="submit"]').first().click();

  try {
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 25000 });
    await page.waitForTimeout(2500);
    return true;
  } catch {
    console.warn(`[auth] Login failed for role: ${role}`);
    return false;
  }
}

// Per-file auth state: login once per spec file, reuse across tests
const authStateCache = new Map<string, boolean>();

type Fixtures = {
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use, testInfo) => {
    const role = (testInfo.project.metadata?.role as keyof typeof ROLE_CREDS) || 'caseManager';
    const cacheKey = `${role}-${testInfo.file}`;

    if (!authStateCache.get(cacheKey)) {
      await loginAs(page, role);
      authStateCache.set(cacheKey, true);
    }

    await use(page);
  },
});

export { expect };
