# e2e-ipmg — Playwright E2E Suite

End-to-end Playwright tests for CaseManagement.ai, covering case manager, supervisor,
billing, admin, platform, reports, and shared/navigation flows (42 spec files,
~264 tests). Tests run against the live app at `https://app.casemanagement.ai`.

## Running

From the **repo root**:

```bash
npx playwright test --config=playwright-ipmg.config.ts
```

List tests without running them:

```bash
npx playwright test --config=playwright-ipmg.config.ts --list
```

## Authentication

`global-setup.ts` runs as a `setup` project before the main suite. It logs in each
demo account fresh via the login form, then extracts the Firebase auth state from
IndexedDB and caches it under `.auth/` (both `<role>.json` storageState and
`<role>-idb.json` IndexedDB records). Cached auth younger than 6 hours is reused.

The `.auth/` directory is **gitignored** (it holds Firebase refresh tokens). It is
created automatically on first run — nothing to commit.

Specs inject the cached IndexedDB auth via `injectAuth(page, role)` (see
`inject-auth.ts`) and select their storageState file via `authStateFile(role)`.
All auth paths resolve relative to this directory (`__dirname`), so the suite works
regardless of the cwd it is launched from.

## Accounts

Credentials come from `.env.test` (gitignored). Copy `.env.test.example` to
`.env.test` and fill in values. The confirmed-working demo accounts are:

- `kathy@demo.casemanagement.ai` / `Demo1234!` (case manager; also used as the
  supervisor/billing fallback)
- `admin@demo.casemanagement.ai` / `Demo1234!` (admin)

`VITE_FIREBASE_API_KEY` is a public Firebase client key and is safe to commit in
the example file.

## Layout

- `e2e/` — spec files, grouped by role/area (`auth`, `case_manager`, `supervisor`,
  `billing`, `admin`, `platform`, `reports`, `shared`)
- `inject-auth.ts`, `global-setup.ts`, `auth-helper.ts`, `fixtures.ts`, `helpers.ts`
  — shared support code
- `.auth/`, `report/`, `results.json`, `.env.test` — generated/secret, gitignored
