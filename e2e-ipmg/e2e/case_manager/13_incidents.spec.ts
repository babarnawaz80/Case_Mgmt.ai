/**
 * 13_incidents.spec.ts — Incidents
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

test.use({ storageState: authStateFile('case-manager') });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'case-manager');
  await page.goto('/incidents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('incident reporting center loads', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Incident/i').first()).toBeVisible({ timeout: 8000 });
});

test('stat cards render', async ({ page }) => {
  const total = page.locator('text=/TOTAL|total/i').first();
  await expect(total).toBeVisible({ timeout: 8000 });
});

test('incident list renders with columns', async ({ page }) => {
  const individual = page.locator('text=/INDIVIDUAL|individual/i').first();
  await expect(individual).toBeVisible({ timeout: 8000 });
});

test('AI insight or banner visible', async ({ page }) => {
  const ai = page.locator('text=/AI|insight|pattern/i').first();
  await expect(ai).toBeVisible({ timeout: 8000 });
});

test('no 404 on incidents', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});

test('person-level incident page loads', async ({ page }) => {
  await page.goto('/people/ind-001/incident-reporting');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Incident/i').first()).toBeVisible({ timeout: 8000 });
});
