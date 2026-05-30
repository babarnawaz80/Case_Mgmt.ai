# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-settings.spec.ts >> Admin Settings >> Settings tiles are visible
- Location: tests/admin-settings.spec.ts:16:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - generic [ref=e5]: 🔒
    - heading "Access Restricted" [level=2] [ref=e6]
    - paragraph [ref=e7]: You don't have permission to view this page. Contact your administrator if you need access.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginIfNeeded } from './helpers/auth';
  3  | 
  4  | test.describe('Admin Settings', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await loginIfNeeded(page);
  7  |     await page.goto('/settings');
  8  |     await page.waitForTimeout(2000);
  9  |   });
  10 | 
  11 |   test('Settings page loads', async ({ page }) => {
  12 |     await expect(page.locator('body')).toBeVisible();
  13 |     await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  14 |   });
  15 | 
  16 |   test('Settings tiles are visible', async ({ page }) => {
  17 |     const tiles = page.locator('[class*="card"], [class*="tile"]').filter({ hasText: /.+/ });
  18 |     const count = await tiles.count();
> 19 |     expect(count).toBeGreaterThan(0);
     |                   ^ Error: expect(received).toBeGreaterThan(expected)
  20 |   });
  21 | 
  22 |   test('Organization settings sub-page loads', async ({ page }) => {
  23 |     const restricted = page.getByText(/access restricted/i);
  24 |     if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
  25 |       test.skip(true, 'Settings restricted to admin');
  26 |     }
  27 |     await page.goto('/settings/organization');
  28 |     await page.waitForTimeout(1500);
  29 |     await expect(page.locator('body')).toBeVisible();
  30 |   });
  31 | 
  32 |   test('Users settings sub-page loads', async ({ page }) => {
  33 |     const restricted = page.getByText(/access restricted/i);
  34 |     if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
  35 |       test.skip(true, 'Settings restricted to admin');
  36 |     }
  37 |     await page.goto('/settings/users');
  38 |     await page.waitForTimeout(1500);
  39 |     await expect(page.locator('body')).toBeVisible();
  40 |   });
  41 | 
  42 |   test('Programs settings sub-page loads', async ({ page }) => {
  43 |     const restricted = page.getByText(/access restricted/i);
  44 |     if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
  45 |       test.skip(true, 'Settings restricted to admin');
  46 |     }
  47 |     await page.goto('/settings/programs');
  48 |     await page.waitForTimeout(1500);
  49 |     await expect(page.locator('body')).toBeVisible();
  50 |   });
  51 | 
  52 |   test('AI settings sub-page loads', async ({ page }) => {
  53 |     const restricted = page.getByText(/access restricted/i);
  54 |     if (await restricted.isVisible({ timeout: 2000 }).catch(() => false)) {
  55 |       test.skip(true, 'Settings restricted to admin');
  56 |     }
  57 |     await page.goto('/settings/ai');
  58 |     await page.waitForTimeout(1500);
  59 |     await expect(page.locator('body')).toBeVisible();
  60 |   });
  61 | 
  62 |   test('Page does not crash on load', async ({ page }) => {
  63 |     const errors: string[] = [];
  64 |     page.on('pageerror', e => errors.push(e.message));
  65 |     await page.waitForTimeout(1000);
  66 |     expect(errors).toHaveLength(0);
  67 |   });
  68 | });
  69 | 
```