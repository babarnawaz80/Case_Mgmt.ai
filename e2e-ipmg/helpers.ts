import { type Page } from '@playwright/test';
import * as path from 'path';

export const BASE = process.env.BASE_URL || 'https://app.casemanagement.ai';

export const CREDS = {
  caseManager: {
    email: process.env.CASE_MANAGER_EMAIL || 'kathy@demo.casemanagement.ai',
    password: process.env.CASE_MANAGER_PASSWORD || 'Demo1234!',
    file: path.join(process.cwd(), 'tests/.auth/case-manager.json'),
  },
  supervisor: {
    email: process.env.SUPERVISOR_EMAIL || 'sam@demo.casemanagement.ai',
    password: process.env.SUPERVISOR_PASSWORD || 'Demo1234!',
    file: path.join(process.cwd(), 'tests/.auth/supervisor.json'),
  },
  billing: {
    email: process.env.BILLING_EMAIL || 'bailey@demo.casemanagement.ai',
    password: process.env.BILLING_PASSWORD || 'Demo1234!',
    file: path.join(process.cwd(), 'tests/.auth/billing.json'),
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'alex@demo.casemanagement.ai',
    password: process.env.ADMIN_PASSWORD || 'Demo1234!',
    file: path.join(process.cwd(), 'tests/.auth/admin.json'),
  },
};

// Primary test individual IDs (Firestore doc IDs)
export const IND = {
  joseph: 'ind-001',  // Joseph Brown
  travis: 'ind-002',  // Travis Langston
};

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await page.waitForTimeout(1500);

  const emailField = page.locator('input[type="email"], input[name="email"], #email').first();
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await emailField.fill(email);

  const pwField = page.locator('input[type="password"], input[name="password"], #password').first();
  await pwField.fill(password);

  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Sign in")').first();
  await submitBtn.click();

  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(2500);
}

export async function go(page: Page, url: string, settle = 1500) {
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await page.waitForTimeout(settle);
}

export async function loadStorageState(page: Page, role: keyof typeof CREDS) {
  await page.context().addCookies([]);
  await page.context().storageState();
}
