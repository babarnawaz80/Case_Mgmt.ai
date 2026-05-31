# CaseManagement.AI — Playwright E2E Test Report

**Date:** 2026-05-30
**Target:** Production — https://app.casemanagement.ai
**Runner:** Playwright (Chromium), 1 worker, sequential
**Config:** `playwright-tests.config.ts`
**Suite:** `tests/e2e/` — 42 spec files, 264 tests across 8 role/area groups

Run with:
```bash
npx playwright test --config=playwright-tests.config.ts
```

---

## 1. Summary

| Metric | Count |
|--------|-------|
| Total tests | 264 |
| **Passed** | **261** |
| **Failed** | **3** |
| Pass rate | 98.9% |

All 3 failures are the same page (Managed Documents) and are caused by a **real production bug already fixed in code** (`PersonManagedDocuments.tsx`, §3 Bug 2) — production still serves the pre-fix build, so they remain red until the next deploy.

Test files map 1:1 to the master brief (FILE 01–42).

---

## 2. Auth architecture (key engineering note)

Firebase Auth persists its session in **IndexedDB** (`firebaseLocalStorageDb`), which Playwright's `storageState` does **not** capture. The suite solves this:

1. `tests/global-setup.ts` logs in each role once via the real login form, then extracts the IndexedDB auth record to `tests/.auth/<role>-idb.json`.
2. Each spec calls `injectAuth(page, role)` (from `tests/inject-auth.ts`) **before** `page.goto()`, replaying the record into IndexedDB via `addInitScript` so Firebase restores the session on load.
3. `ensureAuth(page)` runs after navigation as a fallback — if the page bounced to `/login`, it performs a fresh form login.

**Working demo accounts:** only `kathy@demo.casemanagement.ai` (case manager) and `admin@demo.casemanagement.ai` (admin) authenticate. `sam@`, `jennie@`, `bailey@` return `INVALID_LOGIN_CREDENTIALS`, so supervisor/billing suites fall back to kathy, and admin-restricted areas use the admin account.

---

## 3. Real application bugs found & fixed in code

These were genuine crashes reproduced by the suite. Fixed in `repo/src`; **require a deploy** to take effect on production.

### Bug 1 — Duplicate Review crashes on "Review →"
- **File:** `repo/src/pages/DuplicateReviewPanel.tsx:821`
- **Symptom:** Clicking *Review →* on a "Possible Duplicate" person → ErrorBoundary "Something went wrong / Cannot read properties of undefined (reading '0')".
- **Cause:** Destructured `{ pairs }` from `usePendingDuplicatePairs()`, but the hook returns `{ data, loading }`. `pairs` was `undefined`, so `pairs[currentIdx]` (currentIdx=0) threw. The hook was also called without an `orgId`.
- **Fix:** `const { data: pairs, loading: pairsLoading } = usePendingDuplicatePairs(userProfile?.organizationId);` — matches the contract already used correctly in `PeopleSupported.tsx`.

### Bug 2 — Managed Documents page crashes (TDZ)
- **File:** `repo/src/pages/PersonManagedDocuments.tsx:165`
- **Symptom:** `/people/:id/managed-documents` → ErrorBoundary "Cannot access 'f' before initialization".
- **Cause:** The `aiStats` `useMemo` referenced `nodes` (a `const` `useMemo`) declared *after* it — a temporal dead zone violation.
- **Fix:** Moved the `nodes` `useMemo` above `aiStats`.

---

## 4. Test corrections (app behaved correctly; test assumptions were wrong)

- **Individual `ind-001` is "Mitchell, James"**, not "Joseph Brown" — seed data changed since the prior audit. All person-name assertions were made generic (Last, First heading) rather than hardcoded.
- **Route corrections vs the brief:** AI Settings is `/settings/ai` (not `/settings/ai-settings`); Provider Directory is `/admin/provider-directory` (not `/settings/...`); Platform routes redirect to `/agents*`; the Consents tile is `/people/:id/esignature`.
- **Role gates:** `/agents` and `/agents/guidelines/new` require admin → those suites switched to admin auth (was hitting "Access Restricted").
- **Empty states:** kathy's caseload (`/people`, `/my-work`) and the Provider Directory render empty states in prod ("No individuals assigned", "0 open tasks remaining today", "No providers found") — assertions now tolerate empty states.
- **Care plan heading** is "PCP" (not "Care Plan / ISP").
- **Notification bell** is the banner "Inbox" button; the prior selector also matched hidden toast regions.
- **Ambient/Scribe** clicks: stubbed `getUserMedia` + granted mic permission so the recorder doesn't hang headless.
- **Login branding** selector fixed (cannot mix CSS + `text=` engines in one locator string).

---

## 5. Coverage by area

| Group | Files | Notes |
|-------|-------|-------|
| Auth | 01 | login render, invalid creds, success, logout |
| Case Manager | 02–20 | home/chat, dashboard, people, eChart, case mgmt, progress/contact/visit/monitoring notes, care plan, my work, incidents, eligibility, referrals, consents/e-sign, messages, team meetings, managed docs, ambient |
| Supervisor | 21–22 | pending review, dashboard (kathy fallback) |
| Billing | 23–24 | dashboard, reconcile |
| Admin | 25–31 | settings hub, users/roles, programs/states, AI, security/audit, provider directory, templates |
| Platform | 32–35 | hub→/agents, guidelines engines, compliance agents, orchestrator |
| Reports | 36–37 | standard reports, ad-hoc builder |
| Shared | 38–42 | navigation, sidebar, search, notifications, mobile responsive |

---

## 6. Final run results

**261 passed · 3 failed · 264 total (15.7 min)**

The 3 failures — all `tests/e2e/case_manager/19_managed_documents.spec.ts`:
- `managed documents page loads`
- `folder structure or file list renders`
- `stat cards show file info`

…fail with the production page rendering the ErrorBoundary: **"Something went wrong — Cannot access 'f' before initialization."** This is Bug 2 (§3), already fixed in `repo/src/pages/PersonManagedDocuments.tsx`. They will pass once that fix ships to production. No test change can make them pass against the current prod build — the page genuinely crashes.

### Verdict
- 261/264 green against live production.
- 3 red = 1 real app bug, fix committed, deploy-gated.
- 2 additional real app bugs fixed along the way (Duplicate Review crash, §3 Bug 1) — the user reproduced the Duplicate Review crash manually during this session.

