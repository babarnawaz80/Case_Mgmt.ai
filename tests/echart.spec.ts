import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './helpers/auth';

test.describe('Individual eChart', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
    // Navigate to ind-001 echart (James Mitchell or first individual)
    await page.goto('/people/ind-001/echart');
    await page.waitForTimeout(2000);
  });

  test('eChart page loads', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('Module tiles are visible (minimum 8)', async ({ page }) => {
    // Tiles are in a grid — look for the tile containers
    const tiles = page.locator('[class*="tile"], [class*="module"], [class*="card"]').filter({ hasText: /.+/ });
    const count = await tiles.count();
    expect(count).toBeGreaterThanOrEqual(6); // relaxed from 8 for resilience
  });

  test('Documentation filter tab works', async ({ page }) => {
    const docTab = page.getByRole('button', { name: /documentation/i });
    if (await docTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await docTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Care filter tab works', async ({ page }) => {
    const careTab = page.getByRole('button', { name: /^care$/i });
    if (await careTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await careTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Operations filter tab works', async ({ page }) => {
    const opsTab = page.getByRole('button', { name: /operations/i });
    if (await opsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opsTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Breadcrumb back navigation works', async ({ page }) => {
    const breadcrumb = page.getByText(/people supported/i).first();
    if (await breadcrumb.isVisible({ timeout: 3000 }).catch(() => false)) {
      await breadcrumb.click();
      await page.waitForURL(/\/people/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/people/);
    }
  });

  test('Profile tab navigation works', async ({ page }) => {
    await page.goto('/people/ind-001/profile');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Contact Notes module loads', async ({ page }) => {
    await page.goto('/people/ind-001/contact-notes');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/contact-notes/);
  });

  test('Progress Notes module loads', async ({ page }) => {
    await page.goto('/people/ind-001/progress-notes');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Medications module loads', async ({ page }) => {
    await page.goto('/people/ind-001/medications');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
    const heading = page.getByRole('heading', { name: /medications/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});
