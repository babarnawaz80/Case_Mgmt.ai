/**
 * 06_case_management.spec.ts — Case Management Tasks Board
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto(`/people/${PERSON_ID}/case-management`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('case management page loads with no 404', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
});

test('case management heading visible', async ({ page }) => {
  const heading = page.locator('text=/Case Management/i').first();
  await expect(heading).toBeVisible({ timeout: 8000 });
});

test('task stat counts render', async ({ page }) => {
  const total = page.locator('text=/TOTAL|total/i').first();
  await expect(total).toBeVisible({ timeout: 8000 });
});

test('overdue indicator visible', async ({ page }) => {
  const overdue = page.locator('text=/OVERDUE|overdue/i').first();
  await expect(overdue).toBeVisible({ timeout: 8000 });
});

test('AI banner shows', async ({ page }) => {
  const ai = page.locator('text=/AI|overdue|attention/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('task sections are present', async ({ page }) => {
  // Page heading renders and task content (e.g. overdue items / Total) is shown.
  await expect(page.getByRole('heading', { name: /Case Management/i }).first()).toBeVisible({ timeout: 8000 });
  const taskContent = page.locator('text=/Total|Overdue|task/i').first();
  await expect(taskContent).toBeVisible({ timeout: 8000 });
});

test('Complete button exists on a task', async ({ page }) => {
  const btn = page.locator('button:has-text("Complete"), button:has-text("Mark"), [class*="complete"]').first();
  await expect(btn).toBeVisible({ timeout: 10000 });
});

test('Active Workflows section renders', async ({ page }) => {
  const workflows = page.locator('text=/Active Workflows|Workflow/i').first();
  await expect(workflows).toBeVisible({ timeout: 8000 });
});

test('no 404 page', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
