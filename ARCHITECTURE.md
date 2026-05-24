# Architecture — CaseManagement.AI

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
│                                                             │
│  React 18 + TypeScript + Vite                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │  Auth    │  │  Router  │  │   Component Tree          │  │
│  │ Context  │  │ (React   │  │   ICMShell > Pages >      │  │
│  │ (Firebase│  │ Router   │  │   Hooks > Firestore SDK   │  │
│  │  Auth)   │  │ v6)      │  │                          │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │ HTTPS                           │ Firestore SDK
         ▼                                 ▼
┌──────────────────┐             ┌──────────────────────┐
│  Firebase Hosting│             │   Cloud Firestore    │
│  (Static CDN)    │             │   (Real-time DB)     │
│  casemanagement- │             │                      │
│  ai.web.app      │             │  individuals/        │
└──────────────────┘             │  progress_notes/     │
                                 │  users/              │
                                 │  audit_log/          │
                                 └──────────────────────┘
                                          │
                                          ▼
                                 ┌──────────────────────┐
                                 │  Firebase Auth       │
                                 │  (Email/Password)    │
                                 └──────────────────────┘
                                          │
                                 ┌──────────────────────┐
                                 │  Google Gemini AI    │
                                 │  (via Firebase AI    │
                                 │   Logic)             │
                                 │  Model: gemini-2.0-  │
                                 │  flash               │
                                 └──────────────────────┘
```

---

## Authentication Flow

```
1. User visits /
2. AuthContext checks Firebase Auth state (onAuthStateChanged)
3. If no user → redirect to /login
4. After login → fetch user doc from Firestore users/{uid}
5. Set role in RoleContext (case_manager | supervisor | admin | billing)
6. Redirect to /dashboard
7. All protected routes wrapped in <ProtectedRoute>
```

### Role Assignment
- Roles stored in `users/{uid}` Firestore document
- Read once on login, cached in React context
- Role controls: visible nav items, caseload scope, module access

---

## Data Layer

### Firestore Hooks Pattern

All data is fetched via custom React hooks using `onSnapshot` for real-time updates:

```typescript
// Example: useIndividual(id)
const { individual, loading, error } = useIndividual(personId);

// Example: useProgressNotes(personId)
const { notes, loading, addNote } = useProgressNotes(personId);
```

### Caseload Scoping (Role-based Firestore Queries)

```typescript
// Case Manager: only their assigned individuals
query(collection(db, "individuals"),
  where("assigned_case_manager_uid", "==", currentUser.uid),
  where("enrollment_status", "==", "active"))

// Supervisor: all individuals in their program
query(collection(db, "individuals"),
  where("program", "==", supervisorProgram))

// Admin: all individuals
collection(db, "individuals")
```

---

## AI Integration

### Progress Note Prefill (Gemini)

```
1. User clicks "Generate Draft" on progress note form
2. Client fetches individual data from Firestore
3. Prompt constructed with: name, diagnosis, last visit date, open tasks
4. Gemini 2.0 Flash generates structured note text
5. Fields auto-populated: Purpose of Activity, Background, Details
6. User reviews, edits, and signs
```

### Model Configuration
- Model: `gemini-2.0-flash`
- Temperature: 0.4 (factual, consistent output)
- Max tokens: 1024
- System prompt enforces: clinical tone, HIPAA-safe language, no hallucinated data

---

## Component Architecture

### Design System

All pages use the `ICMShell` layout wrapper:

```tsx
<ICMShell title="Page Title" showAIPanel={false}>
  <Breadcrumbs items={[...]} />
  {/* Page content */}
</ICMShell>
```

### Key Design Tokens (Tailwind)

| Token | Usage |
|-------|-------|
| `icm-bg` | Page background |
| `icm-panel` | Card/panel background |
| `icm-border` | Default border |
| `icm-text` | Primary text |
| `icm-text-dim` | Secondary text |
| `icm-accent` | Teal accent (interactive) |
| `icm-green` | Success states |
| `icm-amber` | Warning states |
| `icm-red` | Error/danger states |

### Error Handling

- Global `<ErrorBoundary>` wraps the entire app
- Any React render error shows a recoverable UI (not a blank white screen)
- Individual hooks return `{ error }` state for query failures

---

## Security Architecture

### Firestore Security Rules Strategy

```
1. All reads/writes require authentication (request.auth != null)
2. Individuals: case managers can only read their own caseload
3. Progress notes: only the assigned CM or supervisor can write
4. Users collection: users can only read their own doc
5. Admin: elevated access via custom claim or role field
```

### HIPAA Considerations

- No PHI stored in browser localStorage or sessionStorage
- All data transit over HTTPS (Firebase enforces TLS)
- Firestore at-rest encryption (Google-managed keys)
- Session expires on Firebase Auth token expiry (1 hour, auto-refreshed)
- Audit log written to Firestore `audit_log/` on sensitive operations
- Demo credentials to be removed before production go-live

---

## Performance

### Current Bundle Size
- JS: ~3.2 MB minified (~786 KB gzipped)
- CSS: ~180 KB minified (~27 KB gzipped)

### Planned Optimizations
- Code splitting via dynamic `import()` per route
- `React.lazy()` for heavy pages (billing, reports)
- `content-visibility: auto` for long lists
- Firestore offline persistence for poor connectivity

---

## Module Map

| eChart Tile | Route | Status |
|-------------|-------|--------|
| Face Sheet | `/people/:id/facesheet` | ✅ Firestore |
| Progress Notes | `/people/:id/progress-note` | ✅ Firestore |
| New Progress Note | `/people/:id/progress-note/new` | ✅ Firestore + AI |
| Contact Note | `/people/:id/contact-note` | ✅ Firestore |
| eChart Hub | `/people/:id/echart` | ✅ Firestore |
| Care Plan | `/people/:id/care-plan` | 🔄 In progress |
| Monitoring Form | `/people/:id/monitoring-form` | 🔄 In progress |
| Incident Reporting | `/people/:id/incident-reporting` | 🔄 In progress |
| Visit Summary | `/people/:id/visit-summary` | 🔄 In progress |
| Care Tracker | `/people/:id/care-tracker` | ⏳ Placeholder |
| Assigned Staff | `/people/:id/assigned-staff` | ⏳ Placeholder |
| Managed Documents | `/people/:id/managed-documents` | ⏳ Placeholder |
| On Call Log | `/people/:id/oncall` | ⏳ Placeholder |
| Trainings | `/people/:id/trainings` | ⏳ Placeholder |
| Service Plan | `/people/:id/service-plan` | ⏳ Placeholder |
| e-Signature | `/people/:id/esignature` | ⏳ Placeholder |
| Eligibility Verification | `/people/:id/eligibility-verification` | ⏳ Placeholder |
| Referrals | `/people/:id/referrals` | ⏳ Placeholder |
| Billing Summary | `/people/:id/billing` | ⏳ Placeholder |
| Workflow Manager | `/people/:id/workflow-manager` | ⏳ Placeholder |
