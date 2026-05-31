/**
 * 00_route_crash_crawler.spec.ts — Visits EVERY route and fails if the page
 * crashes (uncaught JS error or ErrorBoundary fallback).
 *
 * Roles matter: the `admin` demo account is a platform_admin and gets
 * redirected to /super-admin on entry, so it never renders the normal
 * case-manager shell (ICMShell/Topbar) — which is exactly where the
 * "React is not defined" crash hid. So app routes are crawled as a CASE
 * MANAGER (the real user shell), and admin/platform/settings routes are
 * crawled as admin. Unauthenticated entry points are checked with no auth.
 *
 * It asserts only that the page did not blow up (no uncaught error, no
 * ErrorBoundary). Content/behavior is covered by the per-area specs.
 */
import { test } from '@playwright/test';
import { injectAuth, ensureAuth } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

const PID = 'ind-001';

// Routes that render the normal case-manager shell (the demo surface).
const CM_ROUTES = [
  '/home', '/dashboard', '/people', '/people/new', '/people/duplicates',
  '/my-work', '/schedule', '/my-profile', '/messages', '/documentation',
  '/documentation/contact-notes', '/documentation/progress-notes',
  '/documentation/visit-summaries', '/documentation/monitoring-forms',
  '/documentation/care-plans', '/documentation/assessments',
  '/documentation/referrals', '/documentation/meeting-notes',
  '/documentation/communications',
  '/incidents', '/referrals', '/authorizations', '/documents',
  '/progress-note', '/progress-note/new', '/monitoring-form',
  '/oncall-log', '/oncall-log/new', '/workflows', '/team-meetings',
  '/leads', '/leads/new', '/communications',
  '/reports', '/reports/builder', '/billing',
  ...[
    'echart', 'profile', 'face-sheet', 'case-management',
    'care-plan', 'care-plan/new', 'monitoring-form', 'visit-summary',
    'visit-summary/schedule', 'eligibility-verification', 'progress-note',
    'progress-note/new', 'contact-note', 'referrals', 'referrals/new',
    'documents', 'managed-documents', 'authorizations', 'authorizations/new',
    'incident-reporting', 'incident-report/new', 'assessments', 'assessments/new',
    'team-meetings', 'meeting-notes', 'workflow-manager', 'care-team',
    'assigned-staff', 'employment', 'medications', 'trainings', 'service-plan',
    'esignature', 'communications-log', 'monitors-baselines',
  ].map((seg) => `/people/${PID}/${seg}`),
];

// Routes requiring elevated roles — crawl as admin.
const ADMIN_ROUTES = [
  '/reports/audit-evidence',
  '/agents', '/agents/orchestrator', '/agents/guidelines',
  '/agents/guidelines/new', '/agents/new', '/agents/rule-library',
  '/platform', '/platform/orchestrator', '/platform/guidelines-engines',
  '/settings', '/settings/organization', '/settings/roles', '/settings/programs',
  '/settings/ai', '/settings/ai-usage', '/settings/integrations',
  '/settings/security', '/settings/notifications', '/settings/billing',
  '/settings/billing-config', '/settings/import', '/settings/risk-score',
  '/admin/provider-directory', '/admin/assessment-builder',
  '/admin/workflow-templates', '/admin/multi-state', '/admin/ai-governance',
  '/admin/audit-log',
];

async function crawl(page, route: string, role: 'case-manager' | 'admin') {
  const guard = attachCrashGuard(page);
  await injectAuth(page, role);
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await ensureAuth(page);
  // Late-rendering shell/lazy-chunk crashes can surface a few seconds in.
  await page.waitForTimeout(2500);
  await guard.assertNoCrash(`${route} [${role}]`);
}

test.describe('Route crash crawler — case manager shell', () => {
  for (const route of CM_ROUTES) {
    test(`no crash (CM): ${route}`, async ({ page }) => {
      await crawl(page, route, 'case-manager');
    });
  }
});

test.describe('Route crash crawler — admin/platform', () => {
  for (const route of ADMIN_ROUTES) {
    test(`no crash (admin): ${route}`, async ({ page }) => {
      await crawl(page, route, 'admin');
    });
  }
});

/**
 * Unauthenticated entry points — render BEFORE login. No auth injected.
 */
test.describe('Unauthenticated entry points (no auth)', () => {
  for (const route of ['/login', '/']) {
    test(`no crash (no auth): ${route}`, async ({ page }) => {
      const guard = attachCrashGuard(page);
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      await guard.assertNoCrash(`${route} (unauthenticated)`);
    });
  }
});
