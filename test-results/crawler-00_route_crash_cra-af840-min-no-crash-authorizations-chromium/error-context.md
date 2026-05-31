# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crawler/00_route_crash_crawler.spec.ts >> Route crash crawler (admin) >> no crash: /authorizations
- Location: e2e-ipmg/e2e/crawler/00_route_crash_crawler.spec.ts:61:5

# Error details

```
Error: /authorizations rendered the ErrorBoundary fallback (component crashed on render)

expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 2
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - img [ref=e6]
  - heading "Something went wrong" [level=1] [ref=e8]
  - paragraph [ref=e9]: An unexpected error occurred in this section.
  - paragraph [ref=e10]: caseManagerId is not defined
  - generic [ref=e11]:
    - button "Try again" [ref=e12] [cursor=pointer]
    - button "Go to Dashboard" [ref=e13] [cursor=pointer]
```

# Test source

```ts
  1  | /**
  2  |  * crash-guard.ts — Detects hard failures on a page:
  3  |  *   1. Uncaught JS exceptions (pageerror) — e.g. the TDZ "Cannot access 'x'
  4  |  *      before initialization" crash.
  5  |  *   2. React ErrorBoundary fallback rendering ("Something went wrong").
  6  |  *   3. console.error entries (collected; gated only for clear app errors so we
  7  |  *      don't fail on noisy 3rd-party/network warnings).
  8  |  *
  9  |  * Usage:
  10 |  *   const guard = attachCrashGuard(page);
  11 |  *   await page.goto(route);
  12 |  *   ...
  13 |  *   await guard.assertNoCrash(route);
  14 |  */
  15 | import { type Page, expect } from '@playwright/test';
  16 | 
  17 | export interface CrashGuard {
  18 |   pageErrors: string[];
  19 |   consoleErrors: string[];
  20 |   assertNoCrash: (label: string) => Promise<void>;
  21 | }
  22 | 
  23 | // console.error noise we deliberately ignore (3rd-party / expected dev noise).
  24 | const CONSOLE_IGNORE = [
  25 |   /Download the React DevTools/i,
  26 |   /Firebase.*quota/i,
  27 |   /\[vite\]/i,
  28 |   /favicon/i,
  29 |   /net::ERR_/i,
  30 |   /Failed to load resource/i,
  31 |   /ResizeObserver loop/i,
  32 |   /Each child in a list should have a unique "key"/i, // React dev warning, not a crash
  33 |   /validateDOMNesting/i,
  34 |   /useScheduledVisits|usePendingDuplicatePairs/i, // hook listeners log+swallow their own errors
  35 | ];
  36 | 
  37 | // pageerror noise (uncaught rejections from 3rd-party that don't break the app)
  38 | const PAGEERROR_IGNORE = [
  39 |   /ResizeObserver loop/i,
  40 | ];
  41 | 
  42 | export function attachCrashGuard(page: Page): CrashGuard {
  43 |   const pageErrors: string[] = [];
  44 |   const consoleErrors: string[] = [];
  45 | 
  46 |   page.on('pageerror', (err) => {
  47 |     const msg = `${err.name}: ${err.message}`;
  48 |     if (!PAGEERROR_IGNORE.some((re) => re.test(msg))) pageErrors.push(msg);
  49 |   });
  50 | 
  51 |   page.on('console', (msg) => {
  52 |     if (msg.type() !== 'error') return;
  53 |     const text = msg.text();
  54 |     if (!CONSOLE_IGNORE.some((re) => re.test(text))) consoleErrors.push(text);
  55 |   });
  56 | 
  57 |   return {
  58 |     pageErrors,
  59 |     consoleErrors,
  60 |     async assertNoCrash(label: string) {
  61 |       // 1) No uncaught exceptions
  62 |       expect(pageErrors, `${label} threw uncaught JS error(s):\n${pageErrors.join('\n')}`).toEqual([]);
  63 | 
  64 |       // 2) No ErrorBoundary fallback
  65 |       const boundary = page.locator('text=/Something went wrong|An unexpected error occurred in this section/i');
  66 |       const crashed = await boundary.count();
> 67 |       expect(crashed, `${label} rendered the ErrorBoundary fallback (component crashed on render)`).toBe(0);
     |                                                                                                     ^ Error: /authorizations rendered the ErrorBoundary fallback (component crashed on render)
  68 |     },
  69 |   };
  70 | }
  71 | 
```