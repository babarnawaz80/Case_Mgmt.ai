# Security & Compliance — CaseManagement.AI

> **Document type:** Security Architecture & HIPAA Compliance Reference  
> **Version:** 0.6.x &nbsp;|&nbsp; **Updated:** May 2026  
> **Audience:** Security Officers, System Administrators, Compliance Auditors, Engineering

---

## Table of Contents

1. [HIPAA Compliance Posture](#1-hipaa-compliance-posture)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [Firestore Security Rules Strategy](#3-firestore-security-rules-strategy)
4. [Access Control Matrix](#4-access-control-matrix)
5. [Data Protection](#5-data-protection)
6. [PHI Handling Policy](#6-phi-handling-policy)
7. [Audit Logging](#7-audit-logging)
8. [AI & PHI Boundaries](#8-ai--phi-boundaries)
9. [Incident Response Procedure](#9-incident-response-procedure)
10. [Production Hardening Checklist](#10-production-hardening-checklist)
11. [Compliance Certifications & Roadmap](#11-compliance-certifications--roadmap)

---

## 1. HIPAA Compliance Posture

CaseManagement.AI is purpose-built for HCBS (Home and Community-Based Services) documentation, meaning it stores, processes, and transmits **Protected Health Information (PHI)**. The platform is designed to align with HIPAA's Security Rule, Privacy Rule, and Breach Notification Rule.

### Platform-Level HIPAA Controls

| Control Domain | Implementation | Status |
|---|---|---|
| Access Controls | Role-based Firestore security rules; Firebase Auth | ✅ Implemented |
| Audit Controls | Append-only `audit_log` Firestore collection | ✅ Implemented |
| Integrity Controls | Firestore ACID transactions; signed notes are immutable | ✅ Implemented |
| Transmission Security | TLS 1.2+ enforced by Firebase Hosting (HSTS enabled) | ✅ Implemented |
| Encryption at Rest | Google-managed AES-256 on all Firestore data | ✅ Implemented |
| Minimum Necessary | Role-scoped queries; case managers see only assigned individuals | ✅ Implemented |
| PHI in Browser Storage | No PHI stored in localStorage or sessionStorage | ✅ Implemented |
| Business Associate Agreement | Firebase/GCP BAA available; must be executed with Google | ⚠️ Required before go-live |
| MFA for Admin Users | Firebase Auth supports MFA; not yet enforced | ⚠️ Recommended |
| Demo Credentials | Seed script creates demo accounts | ⚠️ Must remove before production |

> [!IMPORTANT]
> Before go-live, your organization must execute a **Business Associate Agreement (BAA)** with Google Cloud Platform. Firebase services are covered under the GCP BAA. Instructions: [cloud.google.com/security/compliance/hipaa](https://cloud.google.com/security/compliance/hipaa)

### What CaseManagement.AI Does NOT Currently Provide

- **SOC 2 Type II certification** — in progress; audit readiness is being built toward this
- **FHIR/HL7 interoperability** — planned for a future release
- **On-premises or VPC deployment** — the system is Firebase-hosted SaaS only
- **Hardware security keys (FIDO2/WebAuthn)** — MFA is available via TOTP; physical keys are not yet configured

---

## 2. Authentication & Session Management

### Firebase Auth — Email/Password

All authentication is handled by **Firebase Authentication**. The system uses the email/password provider. Google SSO and Microsoft SSO are planned for a future release.

```
Authentication Flow:
1. User submits email + password to Firebase Auth
2. Firebase Auth returns an ID token (JWT, RS256-signed)
3. JWT is stored ONLY in Firebase's internal IndexedDB store
   (not in localStorage, not in sessionStorage, not in cookies)
4. AuthContext reads the token via onAuthStateChanged listener
5. Firestore SDK automatically attaches the token to every request
6. Token lifecycle: 1 hour validity, auto-refreshed silently while active
```

### Token Lifecycle

| Property | Value |
|---|---|
| Token format | JWT (RS256-signed by Google) |
| Token validity | 1 hour (`exp` claim) |
| Auto-refresh | Yes — Firebase SDK refreshes automatically while tab is active |
| Refresh token | Long-lived; stored in Firebase's internal secure store |
| Revocation | Admin can revoke sessions via Firebase Auth console or Admin SDK |
| Storage location | Firebase's internal IndexedDB — never `localStorage` or cookies |

### Session Security Properties

- **No XSS-accessible token storage** — Tokens are not in `localStorage` or `sessionStorage`. They cannot be exfiltrated by XSS attacks that read storage.
- **No CSRF risk** — Tokens are sent via the Firestore SDK (not cookies), so CSRF attacks cannot forge authenticated requests.
- **Session expiry** — If a user closes their browser tab and returns after token expiry, they are redirected to `/login`.
- **Role caching** — The user's role is loaded from Firestore once on login and cached in React context. A role change takes effect on next login.

### Password Reset

```
1. User enters their email on the login page
2. Clicks "Reset password"
3. Firebase Auth sends a time-limited reset link to their email
4. Link expires in 1 hour
5. User sets a new password; old sessions are not automatically invalidated
```

> [!WARNING]
> Password reset does NOT automatically invalidate existing sessions. If an account is compromised, use the Firebase Auth console to **revoke all refresh tokens** for that user, in addition to initiating a password reset.

### Future Authentication Enhancements

| Feature | Timeline |
|---|---|
| Google Workspace SSO | Planned |
| Microsoft Entra ID SSO | Planned |
| TOTP/Authenticator MFA | Available in Firebase — needs enforcement configuration |
| Session activity timeout (idle) | Planned — idle detection + token revocation after N minutes |

---

## 3. Firestore Security Rules Strategy

Firestore security rules are the primary authorization mechanism. All database access — read or write — must pass these rules or it is rejected at the Firebase infrastructure level. **Rejected reads never reach application code.**

The rules live in `firestore.rules` at the repo root and are deployed via `firebase deploy --only firestore:rules`.

### Rule Architecture Principles

1. **Default-deny** — A wildcard rule at the bottom denies all unmatched paths: `allow read, write: if false`
2. **Authentication required** — The `isAuth()` helper is the baseline check for all substantive access
3. **Role from Firestore** — Roles are read from `users/{uid}.role` (not from JWT custom claims) using `get()` calls in rule functions
4. **Organization scoping** — All multi-tenant data is filtered by `organizationId` to prevent cross-organization data access
5. **Append-only audit log** — `audit_log` allows `create` but never `update` or `delete`

### Security Rule Helper Functions

```javascript
// All authenticated users
function isAuth() {
  return request.auth != null;
}

// Read the current user's Firestore document
function userDoc() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}

// The current user's organization
function myOrgId() {
  return userDoc().organizationId;
}

// The current user's role
function myRole() {
  return userDoc().role;
}

// Admin check
function isAdmin() {
  return myRole() == 'admin';
}

// Supervisor or Admin check
function isSupervisor() {
  return myRole() in ['supervisor', 'admin'];
}
```

### Collection-Level Rules Summary

| Collection | `list` | `get` (single doc) | `create` | `update` | `delete` |
|---|---|---|---|---|---|
| `config` | isAuth() | isAuth() | isAdmin() | isAdmin() | isAdmin() |
| `organizations` | — | Same org | Same org + admin | Same org + admin | ❌ Never |
| `users` | isSupervisor() | Own doc or isSupervisor() | ❌ | Own doc or isAdmin() | ❌ Never |
| `individuals` | isAuth() (client filters org) | Same org + (supervisor or assigned CM) | isSupervisor() | Same org + (supervisor or assigned CM) | isAdmin() |
| `progress_notes` | isAuth() | isAuth() | isAuth() | isAuth() | ❌ |
| `contact_notes` | isAuth() | isAuth() | isAuth() | isAuth() | ❌ |
| `visit_summaries` | isAuth() | isAuth() | isAuth() | isAuth() | ❌ |
| `incidents` | isAuth() | isAuth() | isAuth() | isAuth() | ❌ |
| `care_plans` | isAuth() | isAuth() | isAuth() | isAuth() | ❌ |
| `audit_log` | ❌ | isAdmin() | isAuth() | ❌ Never | ❌ Never |
| `ai_usage_log` | ❌ | isAdmin() | ❌ (Functions only) | ❌ Never | ❌ Never |
| `credit_history` | ❌ | isAdmin() | ❌ (Functions only) | ❌ Never | ❌ Never |
| `notifications` | — | Own notifications only | isAuth() | Own only | Own only |
| `*` (catch-all) | ❌ | ❌ | ❌ | ❌ | ❌ |

> [!NOTE]
> Clinical sub-collections (`progress_notes`, `contact_notes`, etc.) currently use broad `isAuth()` rules with client-side filtering. These will be tightened in a future release to enforce `organizationId` at the Firestore rule level, consistent with the `individuals` collection model.

### Individuals Collection — Detailed Rules

The `individuals` collection contains the most sensitive PHI and has the tightest rules:

```javascript
match /individuals/{id} {
  // LIST queries: authenticated user (client query MUST include
  // where("organizationId", "==", myOrgId()) filter)
  allow list: if isAuth();

  // GET (single doc): same org AND (supervisor/admin OR assigned CM)
  allow get: if isAuth()
    && myOrgId() == resource.data.organizationId
    && (
      isSupervisor() ||
      resource.data.assigned_case_manager == request.auth.uid
    );

  // CREATE: only supervisors/admins can onboard new individuals
  allow create: if isSupervisor();

  // UPDATE: same org + (supervisor or assigned CM)
  allow update: if isAuth()
    && myOrgId() == resource.data.organizationId
    && (
      isSupervisor() ||
      resource.data.assigned_case_manager == request.auth.uid
    );

  // DELETE: admin only (soft delete preferred)
  allow delete: if isAdmin();
}
```

### Audit Log — Immutability Rules

```javascript
match /audit_log/{id} {
  allow create: if isAuth();           // Any authenticated user can append
  allow read:   if isAdmin();          // Only admins can read
  allow update, delete: if false;      // IMMUTABLE — permanently enforced
}
```

> [!CAUTION]
> The `allow update, delete: if false` rule on `audit_log` is absolute and cannot be overridden from the client — not even by admin users. This is by design for HIPAA audit integrity. Modification would require deploying new Firestore rules.

---

## 4. Access Control Matrix

This table defines what each role can read, create, update, and delete across the major data domains.

### Clinical Records

| Action | `case_manager` | `supervisor` | `admin` | `billing` |
|---|---|---|---|---|
| **View own caseload** | ✅ | ✅ (all) | ✅ (all) | ❌ |
| **View any individual** | ❌ (assigned only) | ✅ | ✅ | ❌ |
| **Create individual record** | ❌ | ✅ | ✅ | ❌ |
| **Edit individual demographics** | ✅ (own) | ✅ | ✅ | ❌ |
| **Delete individual record** | ❌ | ❌ | ✅ | ❌ |
| **Create progress note** | ✅ | ✅ | ✅ | ❌ |
| **Edit own draft note** | ✅ | ✅ | ✅ | ❌ |
| **Sign / approve note** | ❌ | ✅ | ✅ | ❌ |
| **View all team notes** | ❌ | ✅ | ✅ | ❌ |
| **Create contact note** | ✅ | ✅ | ✅ | ❌ |
| **Create incident report** | ✅ | ✅ | ✅ | ❌ |

### Administrative

| Action | `case_manager` | `supervisor` | `admin` | `billing` |
|---|---|---|---|---|
| **View user list** | ❌ | ✅ (read) | ✅ (full) | ❌ |
| **Create users** | ❌ | ❌ | ✅ | ❌ |
| **Change user roles** | ❌ | ❌ | ✅ | ❌ |
| **View audit log** | ❌ | ❌ | ✅ | ❌ |
| **Read billing claims** | ❌ | ❌ | ✅ | ✅ |
| **Write billing claims** | ❌ | ❌ | ✅ | ✅ |
| **Platform settings** | ❌ | ❌ | ✅ | ❌ |
| **AI usage log** | ❌ | ❌ | ✅ | ❌ |
| **View own profile** | ✅ | ✅ | ✅ | ✅ |
| **Edit own profile** | ✅ | ✅ | ✅ | ✅ |

### Compliance & Reports

| Action | `case_manager` | `supervisor` | `admin` | `billing` |
|---|---|---|---|---|
| **View compliance exceptions** | ❌ | ✅ | ✅ | ❌ |
| **Resolve compliance exceptions** | ❌ | ✅ | ✅ | ❌ |
| **Run reports** | ❌ | ✅ | ✅ | ✅ (billing reports) |
| **Export data** | ❌ | ❌ | ✅ | ✅ (billing only) |

---

## 5. Data Protection

### Encryption at Rest

All data stored in Google Cloud Firestore is encrypted at rest using **AES-256** with Google-managed encryption keys (GMEK). This applies to:
- All `individuals` documents (PHI)
- All clinical notes (`progress_notes`, `contact_notes`, `visit_summaries`, `incidents`)
- All user records
- All audit log entries

Google manages key rotation automatically. If your organization requires **Customer-Managed Encryption Keys (CMEK)**, this requires a Firestore Enterprise plan and additional configuration. Contact Google Cloud support for CMEK setup.

### Encryption in Transit

All data in transit is encrypted via **TLS 1.2 or higher**. This is enforced by:

1. **Firebase Hosting** — All HTTP traffic is redirected to HTTPS (HSTS configured):
   ```json
   {
     "key": "Strict-Transport-Security",
     "value": "max-age=63072000; includeSubDomains; preload"
   }
   ```
2. **Firestore SDK** — All Firestore client SDK calls use HTTPS/gRPC over TLS.
3. **Firebase Functions** — All Cloud Function calls are HTTPS-only.
4. **Firebase Auth** — All authentication calls are HTTPS-only.

> [!NOTE]
> The HSTS header with `preload` means browsers will refuse to connect via plain HTTP even on first visit. Do not disable this header in production.

### Security Response Headers

The following security headers are set on all responses via `firebase.json`:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS forever |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `microphone=(self), camera=()` | Restrict browser API access |

### Content Security Policy (Planned)

A Content Security Policy (CSP) header is recommended for production. Current status: not yet configured. The Vite build system and Firebase Hosting support CSP via the `headers` array in `firebase.json`.

Recommended starting point:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self'; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
}
```

> [!WARNING]
> Test CSP thoroughly in a staging environment before enabling in production. Overly strict CSP will break Firebase Auth redirects and Firestore WebSocket connections.

---

## 6. PHI Handling Policy

### Where PHI Lives

| Location | PHI Present | Protection |
|---|---|---|
| Firestore `individuals` collection | ✅ Yes | Encrypted at rest + security rules |
| Firestore `progress_notes` collection | ✅ Yes | Encrypted at rest + auth required |
| Firestore `contact_notes` collection | ✅ Yes | Encrypted at rest + auth required |
| Firestore `audit_log` collection | Partial (names, IDs) | Encrypted + admin-only read |
| Firebase Auth user records | Limited (email only) | Google-managed security |
| Browser `localStorage` | ❌ None | N/A — never stored there |
| Browser `sessionStorage` | ❌ None | N/A — never stored there |
| Browser cookies | ❌ None | N/A — Firebase uses IndexedDB |
| Client-side JavaScript state (React) | ✅ In-memory only | Cleared on page close |
| Firebase Functions (Cloud Functions) | Transient only (request lifecycle) | Not persisted |
| Application logs (Firebase Functions logs) | ⚠️ Possible if error messages include data | Must audit log output |

### PHI Prohibition in Logs

Application logs (Firebase Functions Cloud Logging) **must not** contain PHI. Engineers must:
1. Never log individual names, Medicaid IDs, diagnoses, or addresses in function logs.
2. Log resource IDs (Firestore document IDs) only — not the document content.
3. Review all `console.log` statements in `functions/src/` before production deployment.

### PHI in AI Calls

When the AI prefill feature is invoked:
1. A minimal data payload is sent to the Firebase Function: `individualName`, `diagnosis`, `lastVisitDate`, `riskScore`, `county`.
2. The Function constructs the Gemini prompt using this data.
3. The response (generated note text) is returned to the client and displayed in the form.
4. No PHI is permanently stored in the Gemini API — requests are transient.
5. An `ai_usage_log` entry is written by the Function (not the client) with usage metadata only.

> [!CAUTION]
> If you add new fields to the AI prompt (e.g., full address, SSN, diagnosis codes), this constitutes a PHI disclosure to Google's AI service. Ensure this is covered by your Google Cloud BAA and HIPAA risk analysis before expanding the data sent to Gemini.

---

## 7. Audit Logging

### Overview

CaseManagement.AI maintains an **append-only audit trail** in the Firestore `audit_log` collection. This log cannot be modified or deleted by any client or admin user — the constraint is enforced at the Firestore security rules level.

### Audit Log Schema

```typescript
interface AuditLogEntry {
  action: string;          // Event type (e.g., "note_signed")
  actor_uid: string;       // Firebase Auth UID of the user
  actor_name: string;      // Display name of the user
  resource_type: string;   // "individual" | "progress_note" | "user" | etc.
  resource_id: string;     // Firestore document ID of the affected record
  timestamp: Timestamp;    // Firestore server timestamp
  ip_address?: string;     // Client IP if available
  metadata?: Record<string, unknown>; // Additional context
}
```

### Auditable Events

| Action String | Trigger |
|---|---|
| `user_login` | Successful authentication |
| `user_logout` | Explicit sign-out |
| `individual_viewed` | Individual's eChart or Face Sheet opened |
| `individual_created` | New individual record created |
| `individual_updated` | Individual demographics updated |
| `note_created` | New progress or contact note saved (draft) |
| `note_submitted` | Note status changed to `pending_signature` |
| `note_signed` | Supervisor approves and signs a note |
| `note_returned` | Note returned to CM for revision |
| `note_ai_drafted` | AI prefill used in note creation |
| `incident_created` | New incident report filed |
| `incident_resolved` | Incident marked as resolved |
| `user_role_changed` | Admin changes a user's role |
| `user_deactivated` | User account deactivated |
| `billing_claim_submitted` | Billing claim submitted to payer |

### Writing Audit Events

Audit events are written from the client using an authenticated Firestore `addDoc` call:

```typescript
// Example: logging a note signing event
await addDoc(collection(db, "audit_log"), {
  action: "note_signed",
  actor_uid: currentUser.uid,
  actor_name: userProfile.displayName,
  resource_type: "progress_note",
  resource_id: noteId,
  timestamp: serverTimestamp(),
  metadata: { individual_id: individualId, status_before: "pending_signature" }
});
```

> [!NOTE]
> Audit events are written from the client SDK. This means a determined user could theoretically omit writing an audit event by using the Firestore API directly (bypassing application code). For critical actions (note signing, role changes), consider migrating audit log writes to Cloud Functions (server-side) for tamper-proof logging.

### Querying the Audit Log

Only users with `admin` role can read `audit_log`. Use the **Audit Evidence** page in the admin panel for a searchable UI view, or query directly from the Firebase Console for advanced forensics:

```javascript
// Example: all actions for a specific individual
query(
  collection(db, "audit_log"),
  where("resource_type", "==", "individual"),
  where("resource_id", "==", individualId),
  orderBy("timestamp", "desc")
)
```

### Audit Log Retention

Firebase Firestore does not automatically purge documents. By default, audit logs are retained indefinitely. HIPAA requires a minimum 6-year retention for PHI-related records. Consider setting up a Cloud Function scheduled job to archive logs older than 6 years to Cloud Storage (cold storage) if cost becomes a concern.

---

## 8. AI & PHI Boundaries

The AI integration uses Google Gemini via Firebase AI Logic (formerly Firebase ML). The following boundaries must be maintained:

### Data Sent to Gemini

| Field Sent | PHI Level | Justification |
|---|---|---|
| `individualName` (first + last) | PHI | Required for clinical context in the note |
| `diagnosis` | PHI | Drives clinical language in the draft |
| `lastVisitDate` | PHI | Informs recency in the note |
| `riskScore` (numeric) | De-identified | Score without name is not PHI |
| `county` | De-identified | Geographic area only |

### Data NOT Sent to Gemini

| Field | Reason |
|---|---|
| Medicaid ID | Not needed for note generation |
| Address | Not needed; county is sufficient |
| Phone number | Not needed |
| SSN / financial data | Never in the system |
| Diagnosis codes (ICD) | Not yet captured in the system |
| Previous note text | Avoid feeding clinical notes into AI to reduce PHI exposure |

### Gemini Data Processing

Google's Gemini API, when accessed via Firebase AI Logic, processes requests within Google's infrastructure. Data is subject to:
- Google's Generative AI Additional Terms of Service
- Your organization's Google Cloud BAA (if executed)
- Google's privacy and data processing agreements

> [!WARNING]
> Google does not retain Gemini API request content for training when used through the Cloud API. Verify this statement against the current Google AI Terms of Service before your production go-live, as terms may change.

---

## 9. Incident Response Procedure

### Security Incident Classification

| Severity | Examples | Response Time |
|---|---|---|
| **P0 — Critical** | PHI breach, unauthorized admin access, database exfiltration | Immediate (< 1 hour) |
| **P1 — High** | Account takeover, bulk unauthorized data access, auth bypass | < 4 hours |
| **P2 — Medium** | Single unauthorized record access, anomalous audit log activity | < 24 hours |
| **P3 — Low** | Failed brute-force attempts, minor policy violations | < 72 hours |

### HIPAA Breach Notification Requirements

Under the HIPAA Breach Notification Rule:
- **Individual notification:** Within 60 days of breach discovery
- **HHS notification:** Within 60 days of discovery (HHS breach portal)
- **Media notification:** If > 500 residents of a state affected — without unreasonable delay
- **Documentation:** All breach assessments must be documented for 6 years

### Step-by-Step Incident Response

#### Step 1 — Detection & Triage

```
1. Alert received (monitoring alert, user report, audit log anomaly)
2. Assign incident commander (system admin or security officer)
3. Classify severity (P0–P3) using table above
4. Open incident record (timestamp, reporter, initial description)
```

#### Step 2 — Containment

**For P0/P1 incidents:**
1. Immediately revoke the compromised user's Firebase Auth refresh tokens:
   - Firebase Console → Authentication → Users → Select user → Revoke all sessions
   - Or via Admin SDK: `admin.auth().revokeRefreshTokens(uid)`
2. If a service account or API key is compromised, rotate it immediately in Firebase Console → Project Settings → Service Accounts.
3. If the breach is via Firestore, review security rules for the exploited path.

```bash
# Revoke user sessions via Firebase CLI
firebase auth:export users.json --format json
# Identify compromised UID, then:
# Use Admin SDK in a Cloud Function or script to call revokeRefreshTokens(uid)
```

#### Step 3 — Investigation

1. Pull the `audit_log` for the compromised user/resource across the suspected timeframe.
2. Review Firebase Authentication logs in the Firebase Console → Authentication → Usage.
3. Review Cloud Function logs for anomalous API calls.
4. Determine: what data was accessed, when, by whom, and from what IP.
5. Document findings.

#### Step 4 — Eradication

1. Patch the vulnerability (fix Firestore rules, update compromised credentials).
2. Deploy fixed rules: `firebase deploy --only firestore:rules`
3. Rotate any exposed API keys.
4. If AI API keys were exposed: rotate in Firebase Console → AI Logic settings.

#### Step 5 — Recovery

1. Restore normal operations.
2. Verify security controls are functioning.
3. Monitor for continued anomalous activity.

#### Step 6 — Notification

1. Internal notification: engineering, leadership, compliance officer.
2. If PHI was accessed: engage legal counsel.
3. Notify affected individuals (HIPAA Breach Notification Rule — within 60 days).
4. File HHS breach report at: [hhs.gov/hipaa/for-professionals/breach-notification](https://www.hhs.gov/hipaa/for-professionals/breach-notification).
5. Document all notification actions.

#### Step 7 — Post-Incident Review

1. Root cause analysis within 5 business days.
2. Remediation plan with owners and deadlines.
3. Update security documentation.
4. Consider additional controls to prevent recurrence.

---

## 10. Production Hardening Checklist

Before going live with real patient data, complete every item in this checklist. Check off each item and retain this document as evidence for your compliance audit.

### Authentication Hardening

- [ ] **Remove all demo/seed user accounts** created by `functions/seed-demo.cjs`
- [ ] **Remove all seed test individuals** from the `individuals` collection
- [ ] **Enable MFA** in Firebase Authentication settings for admin accounts
- [ ] **Review password policy** — Firebase Auth default minimum password length is 6 characters; consider enforcing a stronger policy (12+ characters)
- [ ] **Disable email enumeration protection** — Firebase Auth has an option to prevent user existence inference; enable it
- [ ] **Verify no hardcoded credentials** exist in the codebase (`git grep -r "password\|secret\|apikey"`)

```bash
# Search for potential hardcoded credentials
git grep -ri "password\s*=\s*['\"]" -- '*.ts' '*.tsx' '*.js'
git grep -ri "api.key\s*=\s*['\"]" -- '*.ts' '*.tsx' '*.js'
```

### Access Control Hardening

- [ ] **Audit all user accounts** — remove any test or development accounts
- [ ] **Verify role assignments** — ensure no test accounts have `admin` role in production
- [ ] **Review Firestore security rules** — tighten clinical sub-collection rules to enforce `organizationId` filtering
- [ ] **Test security rules** with Firebase Local Emulator Suite before deploying

```bash
# Run security rules tests
firebase emulators:start --only firestore
# Then run rules unit tests (set up with @firebase/rules-unit-testing)
```

### Data Hardening

- [ ] **Execute Google Cloud BAA** — mandatory before storing real PHI
- [ ] **Verify no PHI in Firebase Function logs** — review all Cloud Logging output
- [ ] **Enable Firebase App Check** — prevents unauthorized clients from accessing Firebase services
- [ ] **Review Firestore indexes** — ensure `firestore.indexes.json` is deployed
- [ ] **Verify Firestore backup** — set up automated Firestore exports to Cloud Storage

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions
```

### Network & Infrastructure Hardening

- [ ] **Enable Firebase App Hosting custom domain** with your organization's domain
- [ ] **Verify HSTS header** is present on all responses (check via `curl -I https://yourdomain.com`)
- [ ] **Set up Firebase Performance Monitoring** to detect abnormal request patterns
- [ ] **Configure Firebase Alerts** for authentication anomalies, error rate spikes
- [ ] **Set up Cloud Monitoring alert policies** for error rates > threshold

### Monitoring & Alerting

- [ ] **Set up Firebase Authentication alerts** — alert on unusual sign-in activity
- [ ] **Set up Firestore error rate alerts** — in Google Cloud Monitoring
- [ ] **Set up Cloud Functions error alerts** — alert on function crash rate
- [ ] **Configure uptime monitoring** — Google Cloud Monitoring uptime check on the app URL
- [ ] **Review AI usage log** regularly for anomalous generation volumes

### Documentation & Training

- [ ] **Document all user account provisioning steps** for your organization
- [ ] **Train all users** on PHI handling policy (no screenshots, no copy-paste to personal devices)
- [ ] **Establish incident response contacts** — who to call for P0/P1 incidents
- [ ] **Schedule annual security review** of Firestore security rules

---

## 11. Compliance Certifications & Roadmap

### Current Status

| Certification / Compliance | Status |
|---|---|
| HIPAA Security Rule alignment | ✅ Controls implemented (self-assessed) |
| HIPAA Privacy Rule (policy layer) | ⚠️ Requires organizational policy documentation |
| Google Cloud HIPAA BAA | ⚠️ Must be executed before go-live |
| SOC 2 Type II | 🔄 In progress — audit readiness being built |
| StateRAMP | ⏳ Planned — required for some state HCBS contracts |
| HITRUST CSF | ⏳ Future — for enterprise health system customers |

### Roadmap

| Q | Milestone |
|---|---|
| Q2 2026 | Firebase App Check deployed; CSP header added |
| Q3 2026 | TOTP MFA enforced for admin and supervisor accounts |
| Q3 2026 | Firestore security rules tightened to org-level for clinical sub-collections |
| Q4 2026 | SOC 2 Type II readiness assessment |
| Q1 2027 | SOC 2 Type II audit initiated |

---

*Last updated: May 2026 — CaseManagement.AI v0.6.x*  
*For security disclosures, contact your system administrator or designated security officer.*
