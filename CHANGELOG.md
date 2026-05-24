# CHANGELOG — CaseManagement.AI

All notable changes to this project will be documented in this file.

Format: `[Version] - YYYY-MM-DD`

---

## [Unreleased]

### In Progress
- Monitoring Form → Firestore
- Care Plan → Firestore
- Incident Reporting → Firestore
- Visit Summary → Firestore
- Code splitting / lazy loading for performance

---

## [0.6.0] - 2026-05-23

### Added
- **Global Error Boundary** — prevents blank white screens; shows recoverable UI with "Go to Dashboard" button
- **Face Sheet** — fully wired to Firestore; shows real individual demographics, diagnosis, risk score, care team, last progress note
- **ContactNote breadcrumbs** — replaced mock `getPerson()` with `useIndividual()` hook; person search dropdown now pulls from real Firestore caseload
- **PersonModulePlaceholder** — upgraded to use `useIndividual()` hook; all 10 placeholder module pages now display real individual name in breadcrumbs and header
- **README.md** — comprehensive setup, environment variables, project structure, deployment guide
- **ARCHITECTURE.md** — system architecture, auth flow, data layer, AI integration, security, module map
- **FIRESTORE_SCHEMA.md** — all collections, fields, indexes, security rules

### Fixed
- **eChart blank white screen** — root cause: `useMemo` was called after early `return` statements (React Rules of Hooks violation). Fixed by moving all hooks above early returns.
- **Face Sheet crash** — removed all mock data imports (`getPerson`, `getProfile`, `getVisitSummariesForPerson`, etc.); replaced with `useIndividual` + `useProgressNotes`

---

## [0.5.0] - 2026-05-22

### Added
- **Progress Notes** — real-time Firestore list per individual, with status badges (Draft/Pending Signature/Signed)
- **New Progress Note form** — full clinical form with AI prefill via Gemini 2.0 Flash
- **useProgressNotes hook** — Firestore CRUD + AI draft generation utility
- **EChart** — migrated from mock `getPerson()` to `useIndividual()` Firestore hook

### Fixed
- Sign-out loop — `isAuthenticated` in `AuthContext` now depends solely on `!!firebaseUser`
- Build errors from duplicate variable declarations in `EChart.tsx`

---

## [0.4.0] - 2026-05-20

### Added
- **People list** — role-scoped Firestore queries (case managers see own caseload, supervisors see all)
- **Dashboard** — real Firestore KPI tiles (census, incidents, billing rate, ISP compliance)
- **useIndividuals hook** — `useIndividuals()` and `useIndividual(id)` with real-time `onSnapshot`
- **Role-based routing** — `ProtectedRoute` checks auth state before rendering

### Changed
- All dummy/mock people data replaced with Firestore data for core navigation flow

---

## [0.3.0] - 2026-05-15

### Added
- Firebase Auth integration (email/password login)
- Firebase Firestore project setup
- Seed data scripts for demo individuals and users
- Role system: case_manager, supervisor, admin, billing

---

## [0.2.0] - 2026-05-10

### Added
- Full eChart module tile grid (20+ tiles)
- Design system: ICMShell, Breadcrumbs, design tokens
- Billing module (claims, revenue cycle, audit log)
- Supervisor dashboard
- All placeholder module pages

---

## [0.1.0] - 2026-05-01

### Added
- Initial project scaffolding (React 18 + TypeScript + Vite)
- Firebase Hosting configuration
- Login page
- Navigation shell
- Dashboard mockup
