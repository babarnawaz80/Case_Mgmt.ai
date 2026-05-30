import { Page } from '@playwright/test';

export const TEST_EMAIL = 'kathy@demo.casemanagement.ai';
export const TEST_PASSWORD = 'Demo1234!';

export async function loginIfNeeded(page: Page) {
  await page.goto('/');

  // Check if already logged in — if we land anywhere but the login page, we're in
  const emailInput = page.locator('input[type="email"]');
  const onLoginPage = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!onLoginPage) {
    // Already authenticated — Firebase session is active
    return;
  }

  // Perform login
  await emailInput.fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Wait for Firebase auth redirect + IndexedDB restore
  // App redirects to /home after login (not /dashboard)
  await page.waitForURL(/\/(home|dashboard|people|my-work|messages)/, { timeout: 15000 });
  await page.waitForTimeout(2500);
}
