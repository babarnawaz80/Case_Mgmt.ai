/**
 * 00_route_crash_crawler.spec.ts — Visits EVERY route and fails if the page
 * crashes (uncaught JS error or ErrorBoundary fallback).
 *
 * This is the broad safety net: it would have caught the Duplicate Review
 * crash and the Managed Documents TDZ crash automatically. Runs as admin so
 * permission gates don't block routes (a permission-denied page is not a crash).
 *
 * It intentionally does NOT assert page content — only that the page did not
 * blow up. Content/behavior is covered by the per-area specs.
 */
import { test } from '@playwright/test';
import { injectAuth, ensureAuth } from '../../inject-auth';
import { attachCrashGuard } from '../../crash-guard';

// A real individual id present in seed data (person sub-routes).
const PID = 'ind-001';

const STATIC_ROUTES = [
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
  '/reports', '/reports/builder', '/reports/audit-evidence',
  '/billing',
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

const PERSON_ROUTES = [
  'echart', 'profile', 'face-sheet', 'case-management',
  'care-plan', 'care-plan/new', 'monitoring-form', 'visit-summary',
  'visit-summary/schedule', 'eligibility-verification', 'progress-note',
  'progress-note/new', 'contact-note', 'referrals', 'referrals/new',
  'documents', 'managed-documents', 'authorizations', 'authorizations/new',
  'incident-reporting', 'incident-report/new', 'assessments', 'assessments/new',
  'team-meetings', 'meeting-notes', 'workflow-manager', 'care-team',
  'assigned-staff', 'employment', 'medications', 'trainings', 'service-plan',
  'esignature', 'communications-log', 'monitors-baselines',
].map((seg) => `/people/${PID}/${seg}`);

const ALL_ROUTES = [...STATIC_ROUTES, ...PERSON_ROUTES];

test.describe('Route crash crawler (admin)', () => {
  for (const route of ALL_ROUTES) {
    test(`no crash: ${route}`, async ({ page }) => {
      const guard = attachCrashGuard(page);
      await injectAuth(page, 'admin');
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2500);
      await ensureAuth(page);
      // Give lazy chunks / data listeners a beat to render or throw.
      await page.waitForTimeout(1500);
      await guard.assertNoCrash(route);
    });
  }
});
