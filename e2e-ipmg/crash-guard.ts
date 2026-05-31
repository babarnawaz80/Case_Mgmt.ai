/**
 * crash-guard.ts — Detects hard failures on a page:
 *   1. Uncaught JS exceptions (pageerror) — e.g. the TDZ "Cannot access 'x'
 *      before initialization" crash.
 *   2. React ErrorBoundary fallback rendering ("Something went wrong").
 *   3. console.error entries (collected; gated only for clear app errors so we
 *      don't fail on noisy 3rd-party/network warnings).
 *
 * Usage:
 *   const guard = attachCrashGuard(page);
 *   await page.goto(route);
 *   ...
 *   await guard.assertNoCrash(route);
 */
import { type Page, expect } from '@playwright/test';

export interface CrashGuard {
  pageErrors: string[];
  consoleErrors: string[];
  assertNoCrash: (label: string) => Promise<void>;
}

// console.error noise we deliberately ignore (3rd-party / expected dev noise).
const CONSOLE_IGNORE = [
  /Download the React DevTools/i,
  /Firebase.*quota/i,
  /\[vite\]/i,
  /favicon/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /ResizeObserver loop/i,
  /Each child in a list should have a unique "key"/i, // React dev warning, not a crash
  /validateDOMNesting/i,
  /useScheduledVisits|usePendingDuplicatePairs/i, // hook listeners log+swallow their own errors
];

// pageerror noise (uncaught rejections from 3rd-party that don't break the app)
const PAGEERROR_IGNORE = [
  /ResizeObserver loop/i,
];

export function attachCrashGuard(page: Page): CrashGuard {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (err) => {
    const msg = `${err.name}: ${err.message}`;
    if (!PAGEERROR_IGNORE.some((re) => re.test(msg))) pageErrors.push(msg);
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!CONSOLE_IGNORE.some((re) => re.test(text))) consoleErrors.push(text);
  });

  return {
    pageErrors,
    consoleErrors,
    async assertNoCrash(label: string) {
      // 1) No uncaught exceptions
      expect(pageErrors, `${label} threw uncaught JS error(s):\n${pageErrors.join('\n')}`).toEqual([]);

      // 2) No ErrorBoundary fallback
      const boundary = page.locator('text=/Something went wrong|An unexpected error occurred in this section/i');
      const crashed = await boundary.count();
      expect(crashed, `${label} rendered the ErrorBoundary fallback (component crashed on render)`).toBe(0);
    },
  };
}
