/**
 * 10_monitoring_form.spec.ts — Monitoring Form
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

const PERSON_ID = 'ind-001';

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
});

test('monitoring form list loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Monitoring Form/i').first()).toBeVisible({ timeout: 8000 });
});

test('person name visible on monitoring form list', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('h1, h2').filter({ hasText: /,\s/ }).first()).toBeVisible({ timeout: 8000 });
});

test('AI banner shows pre-fill offer', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const banner = page.locator('text=/pre-filled|quarterly|AI|review/i').first();
  await expect(banner).toBeVisible({ timeout: 8000 });
});

test('form history renders', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  // Some past forms exist
  const history = page.locator('[class*="row"], [class*="item"], [class*="card"]').first();
  await expect(history).toBeVisible({ timeout: 8000 });
});

test('Add Review button is present', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Review")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});

test('monitoring form log at /monitoring-form loads', async ({ page }) => {
  await page.goto('/monitoring-form');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Monitoring Form/i').first()).toBeVisible({ timeout: 8000 });
});

test('new monitoring form page loads', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  await expect(page.locator('body')).not.toContainText('404');
  // Should have some form sections
  const form = page.locator('text=/Section|Information|Current/i').first();
  await expect(form).toBeVisible({ timeout: 8000 });
});

test('new monitoring form has AI suggestions', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const ai = page.locator('text=/AI suggested|AI/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('Submit button visible on new monitoring form', async ({ page }) => {
  await page.goto(`/people/${PERSON_ID}/monitoring-form/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
  const btn = page.locator('button:has-text("Submit"), button:has-text("Save"), button:has-text("Complete")').first();
  await expect(btn).toBeVisible({ timeout: 8000 });
});
