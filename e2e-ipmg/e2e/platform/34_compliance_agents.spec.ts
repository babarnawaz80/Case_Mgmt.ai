/**
 * 34_compliance_agents.spec.ts — Compliance Agents
 * Route: /agents (was /platform/agents)
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { injectAuth, ensureAuth, authStateFile } from '../../inject-auth';

const adminAuth = authStateFile('admin');
const cmAuth = authStateFile('case-manager');
function getAuthFile() {
  try {
    const data = JSON.parse(fs.readFileSync(adminAuth, 'utf8'));
    return data.origins?.length > 0 && data.origins[0]?.localStorage?.length > 0 ? adminAuth : cmAuth;
  } catch { return cmAuth; }
}
test.use({ storageState: getAuthFile() });

test.beforeEach(async ({ page }) => {
  await injectAuth(page, 'admin');
  await page.goto('/agents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await ensureAuth(page);
});

test('agents dashboard loads', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('404');
  await expect(page.locator('text=/Agent|Platform|Guidelines/i').first()).toBeVisible({ timeout: 8000 });
});

test('/platform/agents redirect works', async ({ page }) => {
  await page.goto('/platform/agents');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).not.toContainText('404');
});

test('stat cards or agents list renders', async ({ page }) => {
  const content = page.locator('[class*="card"], [class*="agent"], [class*="stat"]').first();
  await expect(content).toBeVisible({ timeout: 8000 });
});

test('agent names visible', async ({ page }) => {
  const agent = page.locator('text=/Guidelines|PCP|Billing|Monitoring|ISP/i').first();
  await expect(agent).toBeVisible({ timeout: 8000 });
});

test('no 404 on agents page', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('Not Found');
});
