# CaseManagement.AI — User Guide

> **Version:** 0.6.x &nbsp;|&nbsp; **Updated:** May 2026 &nbsp;|&nbsp; **Platform:** HCBS Case Management

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started — All Roles](#2-getting-started--all-roles)
3. [Case Manager Role](#3-case-manager-role)
   - 3.1 [Dashboard](#31-dashboard)
   - 3.2 [People Supported (Caseload)](#32-people-supported-caseload)
   - 3.3 [The eChart](#33-the-echart)
   - 3.4 [Face Sheet](#34-face-sheet)
   - 3.5 [Progress Notes (AI-Assisted)](#35-progress-notes-ai-assisted)
   - 3.6 [Contact Notes](#36-contact-notes)
   - 3.7 [Monitoring Forms](#37-monitoring-forms)
   - 3.8 [Incident Reporting](#38-incident-reporting)
   - 3.9 [Visit Summaries](#39-visit-summaries)
   - 3.10 [My Work](#310-my-work)
4. [Supervisor Role](#4-supervisor-role)
   - 4.1 [Supervisor Dashboard](#41-supervisor-dashboard)
   - 4.2 [Reviewing Notes](#42-reviewing-notes)
   - 4.3 [Compliance Exceptions](#43-compliance-exceptions)
   - 4.4 [Coordinator Scorecard](#44-coordinator-scorecard)
5. [Admin Role](#5-admin-role)
   - 5.1 [User Management](#51-user-management)
   - 5.2 [Billing Hub](#52-billing-hub)
   - 5.3 [Platform Settings](#53-platform-settings)
   - 5.4 [Audit Evidence](#54-audit-evidence)
6. [Mobile Use](#6-mobile-use)
7. [AI Features](#7-ai-features)
8. [Glossary](#8-glossary)
9. [Support & Troubleshooting](#9-support--troubleshooting)

---

## 1. System Overview

**CaseManagement.AI** is a cloud-based, HIPAA-aligned case management platform designed specifically for Home and Community-Based Services (HCBS) providers. It replaces paper-based and spreadsheet workflows with a real-time, AI-assisted system that keeps case managers, supervisors, and administrators aligned.

### Core Capabilities

| Capability | Description |
|---|---|
| **Electronic Health Chart (eChart)** | Centralized hub for all documentation per individual served |
| **AI-Assisted Notes** | Gemini 2.0 Flash generates clinically-appropriate note drafts in seconds |
| **Real-Time Caseload** | Live Firestore data — changes appear instantly across all devices |
| **Role-Based Access** | Case managers see only their assigned individuals; supervisors see all |
| **Compliance Tracking** | Automated ISP renewal alerts, monitoring compliance rates, and exceptions queue |
| **Billing Integration** | Claims management, service authorization tracking, and revenue cycle reporting |
| **Audit Trail** | Immutable audit log of every significant action for HIPAA accountability |

### Supported Roles

| Role | Primary Function |
|---|---|
| `case_manager` | Document visits, write notes, manage an assigned caseload |
| `supervisor` | Review and approve documentation, monitor team compliance |
| `admin` | Manage users, configure the platform, access billing and audit data |
| `billing` | Access billing hub, claims, and revenue reporting (read-focused) |

> [!NOTE]
> Accounts are provisioned by an administrator — you cannot self-register. Contact your supervisor if you need access.

---

## 2. Getting Started — All Roles

### 2.1 Logging In

1. Navigate to **[https://app.casemanagement.ai](https://app.casemanagement.ai)** (or your organization's custom URL).
2. Enter your **work email address** and **password**.
3. Click **Sign In**.
4. If you have forgotten your password, type your email address in the field and click **Reset password** — a reset link will be emailed to you.

> [!IMPORTANT]
> Accounts are email/password only at this time. Google and Microsoft SSO are coming in a future release.

### 2.2 First Login

On your first login:
- Your role and caseload assignment are already configured by your administrator.
- You will land directly on the **Dashboard** for your role.
- Your session token is valid for **1 hour** and auto-refreshes while you remain active.

### 2.3 Signing Out

Click your **avatar or initials** in the top-right of the navigation shell, then select **Sign out**. For security, always sign out on shared or public computers.

### 2.4 Navigation Shell

The left sidebar (on desktop) and bottom tab bar (on mobile) provide navigation to all major sections. Items shown depend on your role:

| Nav Item | Roles With Access |
|---|---|
| Dashboard | All |
| People Supported | case_manager, supervisor, admin |
| My Work | case_manager |
| Progress Notes | case_manager, supervisor |
| Supervisor Dashboard | supervisor, admin |
| Billing Hub | admin, billing |
| Settings | admin |
| Reports | supervisor, admin |

---

## 3. Case Manager Role

The Case Manager role is the primary user of CaseManagement.AI. Your day-to-day work centers on documenting interactions, monitoring the health of your caseload, and keeping individual records current.

### 3.1 Dashboard

**Route:** `/dashboard`

When you log in, you land on the **iCM Dashboard**. It gives you a personalized snapshot of your caseload at a glance.

#### Dashboard Sections

**Greeting Banner**
Displays your name, today's date, and time-appropriate greeting. A quick orientation before you begin work.

**Hero KPI Cards**

| Card | What It Shows |
|---|---|
| **Census** | Total individuals in your caseload; active vs. inactive count |
| **Incidents** | Open incidents — overdue incidents highlighted in amber/red |
| **Billing** | Current claims clean rate percentage |
| **People Needing Attention** | Donut meter of high-risk + review-tier individuals |

**Compliance Donut Row**

| Donut | What It Tracks |
|---|---|
| PCP Compliance | Percentage of Person-Centered Plans on track |
| Services | Care Tracker delivery rate |
| My Work | Open task breakdown (open / past due / in progress) |
| ISP Reviews | Upcoming ISP renewals in the next 30 days |

**Quick Actions**
Color-coded tiles for the most common documentation tasks. Click any tile to jump directly to that module. Tiles with a number badge indicate pending items.

| Color | Category | Examples |
|---|---|---|
| Blue | Documentation | Contact Note, Progress Note, Visit Summary, Monitoring Form |
| Orange | Operations | Managed Documents, On-Call Log, Trainings, Leads |
| Purple | Care | Assigned Staff, Referrals, Team, Communications |

> [!TIP]
> Use **Quick Actions** from the dashboard to start a Contact Note or Progress Note — it opens an individual picker so you can begin in one click, without navigating to the eChart first.

---

### 3.2 People Supported (Caseload)

**Route:** `/people`

This is your caseload list — all individuals assigned to you.

#### Reading the Caseload Table

| Column | Description |
|---|---|
| **Name** | Full name (Last, First); click to open the eChart |
| **Status** | `Active`, `Inactive`, `Pending`, or `Discharged` |
| **Risk Score** | 0–100 numeric risk score; color-coded by tier |
| **Last Visit** | Date of most recent documented visit |
| **Open Tasks** | Count of outstanding tasks |
| **Open Incidents** | Count of unresolved incidents |
| **ISP Due** | ISP renewal due date |
| **Monitoring %** | Compliance percentage for monitoring forms |

#### Risk Tier Colors

| Color | Tier | Score Range |
|---|---|---|
| 🟢 Green | Stable | 0–39 |
| 🟡 Amber | Review | 40–69 |
| 🔴 Red | High | 70–100 |

#### Filtering and Search

Use the search bar at the top to filter by name. Use the status filter to view only Active individuals. Supervisors and admins see all individuals organization-wide; case managers see only their assigned caseload.

---

### 3.3 The eChart

**Route:** `/people/:id/echart`

The eChart is the individual's electronic chart — the hub for all documentation. Access it by clicking any individual's name from the People Supported list.

#### eChart Tile Grid

The eChart displays a grid of module tiles. Each tile opens a specific documentation module for that individual.

| Tile | Status | Route |
|---|---|---|
| Face Sheet | ✅ Live | `/people/:id/facesheet` |
| Progress Notes | ✅ Live | `/people/:id/progress-note` |
| Contact Note | ✅ Live | `/people/:id/contact-note` |
| Care Plan | 🔄 In progress | `/people/:id/care-plan` |
| Monitoring Form | 🔄 In progress | `/people/:id/monitoring-form` |
| Incident Reporting | 🔄 In progress | `/people/:id/incident-reporting` |
| Visit Summary | 🔄 In progress | `/people/:id/visit-summary` |
| Assigned Staff | ⏳ Planned | `/people/:id/assigned-staff` |
| Managed Documents | ⏳ Planned | `/people/:id/managed-documents` |
| On Call Log | ⏳ Planned | `/people/:id/oncall` |
| Trainings | ⏳ Planned | `/people/:id/trainings` |
| Service Plan | ⏳ Planned | `/people/:id/service-plan` |
| e-Signature | ⏳ Planned | `/people/:id/esignature` |
| Eligibility Verification | ⏳ Planned | `/people/:id/eligibility-verification` |
| Referrals | ⏳ Planned | `/people/:id/referrals` |
| Billing Summary | ⏳ Planned | `/people/:id/billing` |
| Workflow Manager | ⏳ Planned | `/people/:id/workflow-manager` |

> [!NOTE]
> Tiles marked ⏳ Planned are visible but display a placeholder. Full functionality is being rolled out progressively. Check the CHANGELOG for the latest module status.

#### eChart Header

The eChart header always shows:
- Individual's full name and Medicaid ID
- Enrollment status badge
- Risk score chip
- Assigned case manager and supervisor

---

### 3.4 Face Sheet

**Route:** `/people/:id/facesheet`

The Face Sheet is a read-only summary of the individual's core demographics and clinical information. It is the first stop when preparing for a visit or a documentation session.

#### Face Sheet Sections

| Section | Information Shown |
|---|---|
| **Demographics** | Full name, preferred name, DOB, age, gender, address, phone |
| **Clinical** | Diagnosis, level of care, county, Medicaid ID, program |
| **Care Team** | Assigned case manager, supervisor, and any other team members |
| **Enrollment** | Enrollment status, start date, ISP due date |
| **Risk** | Current risk score with tier visualization |
| **Last Visit** | Date and type of most recent documented visit |
| **Open Items** | Count of open tasks, open incidents, monitoring compliance % |

> [!TIP]
> Open the Face Sheet before writing a Progress Note — the AI prefill uses the same data fields, so verifying accuracy first ensures the AI draft is accurate.

---

### 3.5 Progress Notes (AI-Assisted)

**Routes:** `/people/:id/progress-note` (log) · `/people/:id/progress-note/new` (new note)

Progress Notes are the core clinical documentation for face-to-face and phone contacts. CaseManagement.AI includes **AI-assisted draft generation** powered by Google Gemini 2.0 Flash to dramatically reduce documentation time.

#### Viewing the Progress Note Log

Navigate to an individual's eChart and click **Progress Notes**. The log shows all notes for that person in reverse chronological order, with status badges:

| Status Badge | Meaning |
|---|---|
| `Draft` | Note started but not yet submitted |
| `Pending Signature` | Submitted for supervisor review / signature |
| `Signed` | Signed and locked — cannot be edited |

Click any note row to view the full note detail.

#### Creating a New Progress Note — Step by Step

1. From the Progress Note log, click **+ New Progress Note**, or use the Quick Action tile on the Dashboard.
2. If you came from the eChart, the individual is pre-selected. Otherwise, use the **Person Supported** search dropdown to find and select the correct individual.

**Note Details Section**

Fill in the required fields (marked with a red asterisk):

| Field | Options / Format |
|---|---|
| **Activity Type** *(required)* | Face-to-face Visit, Phone Contact, Collateral Contact, Documentation, Team Meeting, etc. |
| **Progress Date** *(required)* | YYYY-MM-DD; defaults to today |
| **Contact Type** *(required)* | In-Person, Phone, Video |
| **Start Time** | HH:MM (24-hour or 12-hour) |
| **End Time** | HH:MM |
| **Is Billable** *(required)* | Yes — Billable / No — Non-Billable |

**Using AI Prefill (Recommended)**

3. After selecting an individual, the **AI Assist banner** appears at the top of the form. Click **Generate draft**.
4. The AI calls the backend (Firebase Functions → Gemini 2.0 Flash) and generates draft text for:
   - Purpose of Activity
   - Additional Observations
   - Next Steps
   - Suggested Activity Type

5. The AI-generated content populates the form fields automatically. A violet **AI-assisted** badge appears in the form header.
6. **Always review and edit AI-generated content** before saving. The AI draft is a starting point, not a finished note.

> [!WARNING]
> AI-generated text must be reviewed for clinical accuracy. The system flags the note with `ai_generated: true` in Firestore. Supervisors can see this flag on all AI-drafted notes.

**Activity Documentation Section**

| Field | Description |
|---|---|
| **Purpose of Activity** *(required)* | Describe the purpose and context. Minimum content required to save. |
| **Additional Observations** | Observations, concerns, behavioral notes, or context |
| **Next Steps** | Planned follow-up actions |

**Saving the Note**

7. Click **Save draft** to save without submitting. The note is stored in Firestore immediately — you can return and edit later.
8. Click **Sign & submit** to submit the note for supervisor review. This sets status to `pending_signature`.
9. Once submitted, the note appears in the supervisor's approval queue.

> [!IMPORTANT]
> A note can only be saved when: an individual is selected, an activity type is chosen, a date is set, and the Purpose of Activity field has content. The **Save draft** and **Sign & submit** buttons are disabled until all four conditions are met.

#### Printing a Note

Open a saved note and click the **Print** icon in the top-right. The note renders in a printer-friendly format. Use your browser's print dialog to save as PDF if needed.

---

### 3.6 Contact Notes

**Route:** `/people/:id/contact-note`

Contact Notes document all non-face-to-face contacts: phone calls, email correspondences, coordination calls, and collateral contacts.

#### Creating a Contact Note

1. Navigate to the individual's eChart → **Contact Note**.
2. Click **+ New Contact Note**.
3. Fill in the required fields:

| Field | Description |
|---|---|
| **Date** *(required)* | Date of the contact |
| **Activity Type** *(required)* | Phone, Email, Collateral, Coordination, etc. |
| **Contact Type** *(required)* | Phone, In-Person, Video |
| **Start / End Time** | Optional but recommended for billable contacts |
| **Is Billable** *(required)* | Yes or No |
| **Who Was Present** | Names of all parties on the contact |
| **Purpose** | Why the contact occurred |
| **Background** | Relevant context |
| **Details** | What was discussed or accomplished |
| **Issues / Concerns** | Any problems identified |
| **Next Steps** | Follow-up plan |

4. Click **Submit** to save the contact note. Contact notes use a `submitted` status (unlike progress notes which use `pending_signature`).

> [!TIP]
> Contact notes are often shorter than progress notes. Use the Background and Details fields to capture the essential facts: who you spoke with, what was discussed, and what was decided.

---

### 3.7 Monitoring Forms

**Route:** `/people/:id/monitoring-form`

Monitoring Forms capture periodic health and welfare checks required by the individual's service plan. These are distinct from visit notes — they track structured data points over time.

> [!NOTE]
> Monitoring Forms are currently being migrated to Firestore. The form UI is live. Data persistence will be fully enabled in an upcoming release. See CHANGELOG for the current status.

#### Viewing Monitoring Form History

Open the individual's eChart → **Monitoring Form**. The list view shows all historical monitoring form submissions sorted by date.

#### Completing a Monitoring Form

1. Click **+ New Monitoring Form**.
2. Select the **Form Type** (monthly check-in, quarterly review, etc.).
3. Answer all structured questions.
4. Add any free-text observations.
5. Click **Submit**. The form is saved and counted toward the individual's `monitoring_compliance_pct` score.

> [!TIP]
> The monitoring compliance percentage shown on the caseload list and Face Sheet is calculated from submitted monitoring forms. Keeping these up to date directly impacts your compliance dashboard metrics.

---

### 3.8 Incident Reporting

**Route:** `/people/:id/incident-reporting`

Incident Reports document any significant events affecting an individual's health, safety, or well-being. These are mandatory reports with state-specific timelines.

> [!IMPORTANT]
> Incidents must typically be reported within 24 hours of occurrence. Check your organization's incident reporting policy for exact timelines. CaseManagement.AI tracks submission timestamps against incident dates.

#### Creating an Incident Report

1. Navigate to the individual's eChart → **Incident Reporting**.
2. Click **+ New Incident**.
3. Fill in the required fields:

| Field | Description |
|---|---|
| **Incident Date / Time** | When the incident occurred |
| **Incident Type** | Fall, Medication Error, Behavioral Event, Abuse/Neglect, etc. |
| **Location** | Where the incident occurred |
| **Description** | Detailed factual description of what happened |
| **Witnesses** | Names of anyone who witnessed the incident |
| **Immediate Actions** | What was done immediately after the incident |
| **Injury** | Whether the individual sustained injury (Yes/No + description) |
| **Notifications Made** | Who was notified (family, physician, supervisor, state agency) |

4. Click **Submit**. The incident appears in the global Incidents view and supervisor queue.

#### Incident Status Flow

```
Open → Under Investigation → Resolved
         ↑
     Overdue flag added if
     not resolved within
     required timeframe
```

---

### 3.9 Visit Summaries

**Route:** `/people/:id/visit-summary`

Visit Summaries document in-home or community-based visits in a structured format. They are distinct from Progress Notes in that they include a standardized structure for visit outcomes, individual goals, and service delivery confirmation.

#### Creating a Visit Summary

1. Navigate to the individual's eChart → **Visit Summary**.
2. Click **+ New Visit Summary**.
3. Complete the visit details:

| Field | Description |
|---|---|
| **Visit Date** | Date of the visit |
| **Visit Type** | Home visit, community outing, day program, etc. |
| **Duration** | Start and end time |
| **Goals Addressed** | Which ISP goals were worked on |
| **Individual's Status** | How the individual appeared / health status |
| **Services Delivered** | What services were provided |
| **Family / Caregiver Present** | Who else was present |
| **Environmental Safety** | Home safety observations |
| **Summary / Narrative** | Free-text narrative |
| **Follow-Up Needed** | Yes/No + description |

4. Click **Submit** to save. The visit date updates the individual's `last_visit_date` field.

---

### 3.10 My Work

**Route:** `/my-work`

My Work is your personal task management center. It aggregates all open tasks, overdue items, and scheduled activities across your entire caseload into a single view.

#### Task Statuses

| Status | Color | Description |
|---|---|---|
| Open | Blue | Assigned and not yet started |
| In Progress | Amber | Actively being worked |
| Past Due | Red | Past the due date and not completed |
| Completed | Green | Finished |

Use My Work to triage your day. Past Due items should be addressed first. Click any task to navigate directly to the relevant individual's eChart.

---

## 4. Supervisor Role

Supervisors have full visibility across all individuals in their program. Their primary responsibilities are documentation review, compliance monitoring, and caseload management.

### 4.1 Supervisor Dashboard

**Route:** `/supervisor/dashboard`

The Supervisor Dashboard provides a team-wide health overview.

#### KPI Grid

| KPI | Description |
|---|---|
| Total Caseload | Sum of all individuals across all coordinators |
| Overdue Contacts | Individuals who haven't been contacted within required frequency |
| Notes Pending | Notes awaiting supervisor approval |
| Documentation Errors | Flagged errors in the last 7 days |
| High-Risk Individuals | Individuals with risk score ≥ 70 across the team |
| Plan Renewals (30d) | ISP renewals due within the next 30 days |
| Avg Compliance | Team average compliance percentage |
| Open Exceptions | Unresolved compliance exceptions |

#### Notes Awaiting Approval

The panel shows all notes submitted by coordinators with `pending_signature` status. Each note row shows:
- Individual's name
- Service code and units
- Submitting coordinator
- **Aging hours** (how long the note has been waiting)
  - 🔵 Blue = < 24 hours
  - 🟡 Amber = 24–48 hours
  - 🔴 Red = > 48 hours (urgent)
- Validation flags (no plan link, auth issue, no attachments)

Click any note row to open it for review.

#### Upcoming Plan Renewals

Lists ISP renewals sorted by days until due. Color-coded:
- 🔴 ≤ 7 days (critical)
- 🟡 ≤ 14 days (warning)
- 🔵 > 14 days (informational)

---

### 4.2 Reviewing Notes

**Route:** `/supervisor/review/:noteId`

When you click a pending note from the Supervisor Dashboard, you enter the review screen.

#### Review Workflow

1. Read the full note narrative.
2. Check the validation flags panel (authorization, plan linkage, attachments).
3. Make a decision:
   - **Approve & Sign** — sets status to `signed`, note is locked.
   - **Return for Revision** — sends the note back to the case manager's draft state with your comment.
   - **Reject** — marks the note as rejected with a mandatory reason field.

> [!IMPORTANT]
> Once a note is **Signed**, it cannot be edited by anyone — including admins. This is intentional for HIPAA audit integrity. If a correction is needed, a new addendum note must be created.

#### What Supervisors Can See

- All notes submitted by coordinators in their program
- AI-assisted flags on notes (notes where AI prefill was used)
- Aging timestamps (how long the note has been pending)
- Validation flags surfaced by the compliance engine

---

### 4.3 Compliance Exceptions

**Route:** `/supervisor/compliance`

The Compliance Exceptions view lists all flagged items that violate compliance rules — late notes, missing documentation, expired authorizations, and ISP overdue items.

#### Exception Types

| Type | Trigger |
|---|---|
| **Late Note** | Note not submitted within 24h of the documented visit |
| **Missing Monitoring Form** | Monitoring form due date passed with no submission |
| **Expired Authorization** | Service authorization past end date |
| **ISP Overdue** | ISP renewal date passed without a new plan |
| **Contact Frequency** | Individual not contacted within required frequency |
| **Unsigned Note** | Note in `pending_signature` status for > 72 hours |

Each exception shows the individual, coordinator, type, and days overdue. Click an exception to navigate to the relevant record.

---

### 4.4 Coordinator Scorecard

The Coordinator Scorecard table (bottom of Supervisor Dashboard) shows per-coordinator performance metrics:

| Column | Description |
|---|---|
| **Caseload** | Number of assigned individuals |
| **Capacity** | Caseload ÷ target (recommended max: 33). Color: 🟢 < 85% / 🟡 85–99% / 🔴 ≥ 100% |
| **Overdue** | Overdue contact count |
| **Pending Notes** | Notes awaiting signature |
| **Errors** | Documentation errors flagged in 7 days |
| **High-Risk** | Individuals with high-risk score |
| **Compliance %** | Percentage compliance across their caseload |
| **Productivity %** | Activities completed vs. scheduled |

The **Balance →** link on each row opens a workload rebalancing tool to redistribute caseload from an overloaded coordinator.

---

## 5. Admin Role

Administrators have full platform access including user management, billing, platform configuration, and immutable audit log access.

### 5.1 User Management

**Route:** `/settings/users`

#### Creating a New User

1. Navigate to **Settings → Users**.
2. Click **+ Invite User**.
3. Enter the user's email address, full name, and assign a **Role**:
   - `case_manager` — standard clinical user
   - `supervisor` — team oversight, note approval
   - `admin` — full access
   - `billing` — billing hub read/write, no clinical access
4. Assign the user to a **Program** (for supervisors, this scopes their team view).
5. For case managers, set their **Assigned Individuals** (or this can be done later from the individual's Face Sheet).
6. Click **Send Invitation**. The user receives a Firebase Auth invitation email.

> [!CAUTION]
> Be deliberate with the `admin` role. Admin users can read the full audit log, modify all user records, and access all billing data. Follow the principle of least privilege.

#### Editing a User

Click any user row to open their profile. You can:
- Update their role
- Reassign their program / caseload
- Reset their password (sends a Firebase Auth reset email)
- Deactivate their account (does not delete — preserves audit history)

> [!WARNING]
> Never delete user accounts — this breaks the audit trail. Deactivate accounts for departed staff instead.

#### Role Assignment in Firestore

Roles are stored in `users/{uid}.role` in Firestore. Changing a role in the UI writes directly to this field. The change takes effect on the user's next page load (their role is cached in React context for the session duration).

---

### 5.2 Billing Hub

**Route:** `/billing`

The Billing Hub manages the full revenue cycle for HCBS services.

#### Billing Hub Sections

| Section | Description |
|---|---|
| **Claims Queue** | All pending billing claims awaiting submission |
| **Clean Claims** | Claims that passed validation — ready to submit to payer |
| **Exceptions** | Claims with errors requiring correction |
| **Authorization Tracker** | Active service authorizations with usage/remaining units |
| **Revenue Summary** | MTD and YTD billing metrics |

#### Claim Status Flow

```
Draft → Validated → Submitted → Paid
           ↓
       Exception (error — needs correction)
```

#### Billing Claim Fields

Each claim is auto-generated from signed progress notes and visit summaries. Key fields:
- Individual Medicaid ID
- Service code (procedure code)
- Units rendered
- Service date
- Provider NPI
- Authorization number (if required)
- Diagnosis code

---

### 5.3 Platform Settings

**Route:** `/settings`

#### Settings Sections

| Section | Description |
|---|---|
| **Organization Profile** | Name, NPI, address, state, contact info |
| **AI Configuration** | Gemini model selection, temperature, prompt customization |
| **Notification Rules** | Email alerts for overdue contacts, expiring authorizations, etc. |
| **Multi-State Config** | Per-state program rules, service codes, and compliance requirements |
| **Workflow Templates** | Reusable task workflow templates for common care scenarios |
| **Integrations** | Medicaid portal connections, EVV, payer connections (future) |

> [!NOTE]
> AI configuration changes take effect immediately for all new note generations. Existing saved notes are not affected.

---

### 5.4 Audit Evidence

**Route:** `/audit-evidence`

The Audit Evidence page provides a searchable, read-only view of the `audit_log` Firestore collection. This is the system's immutable record of all significant actions.

#### Audit Log Fields

| Field | Description |
|---|---|
| **Timestamp** | Exact time of the action |
| **Actor** | User who performed the action (name + UID) |
| **Action** | What happened (e.g., `note_signed`, `individual_viewed`) |
| **Resource Type** | What was affected (individual, progress_note, etc.) |
| **Resource ID** | Firestore document ID of the affected record |
| **IP Address** | Client IP if available |

#### Common Audit Events

| Event | Trigger |
|---|---|
| `user_login` | Successful sign-in |
| `individual_viewed` | eChart or Face Sheet opened |
| `note_created` | New progress or contact note saved |
| `note_signed` | Note moved to `signed` status |
| `note_ai_drafted` | AI prefill used on a note |
| `incident_created` | New incident report filed |
| `user_role_changed` | Admin changed a user's role |

> [!CAUTION]
> Audit log records are append-only and cannot be modified or deleted — even by admins. This is enforced at the Firestore security rules level (`allow update, delete: if false`). Attempting to delete records will always fail.

---

## 6. Mobile Use

CaseManagement.AI is designed with a mobile-responsive layout. Here are tips for the best mobile experience:

### Best Practices for Mobile

1. **Use landscape mode** for the eChart tile grid — tiles display in a single column in portrait but expand to 2–3 columns in landscape.
2. **Bookmark the app URL** to your home screen via your browser's "Add to Home Screen" option. This gives a near-native app experience.
3. **Quick Actions** on the dashboard are optimized for touch — large tap targets, no hover required.
4. **Progress Note forms** are fully usable on mobile. The AI Generate Draft button is prominently placed at the top.
5. **The Supervisor Dashboard** table (Coordinator Scorecard) requires horizontal scrolling on narrow screens — swipe left to see all columns.
6. **Offline behavior:** The app requires an active internet connection for all Firestore reads/writes. A "No connection" banner will appear if you go offline. Notes started offline will not save until connectivity is restored.

> [!WARNING]
> Do not use mobile browsers with aggressive privacy settings (Private/Incognito mode, strict tracker blocking) as these can interfere with Firebase Auth session persistence. Use your browser's standard mode.

### Recommended Mobile Browsers

| Browser | iOS | Android |
|---|---|---|
| Safari | ✅ Recommended | — |
| Chrome | ✅ | ✅ Recommended |
| Firefox | ✅ | ✅ |
| Edge | ✅ | ✅ |

---

## 7. AI Features

### How AI Prefill Works

The AI draft generation pipeline:

```
1. User clicks "Generate Draft"
2. Client fetches individual data from Firestore
   (name, diagnosis, last visit date, risk score, county)
3. HTTP POST to Firebase Functions /api/ai-forms/progress-note-prefill
4. Function constructs a HIPAA-safe prompt with the individual data
5. Google Gemini 2.0 Flash generates structured note text
6. Fields returned: purposeOfActivity, additionalObservations,
   nextSteps, activityType, isBillable
7. Form fields auto-populated
8. User reviews, edits, and submits
```

### AI Configuration

| Parameter | Value | Purpose |
|---|---|---|
| Model | `gemini-2.0-flash` | Fast, cost-effective, clinically capable |
| Temperature | `0.4` | Low temperature = factual, consistent output |
| Max Tokens | `1024` | Sufficient for a full note draft |
| System Prompt | Enforces clinical tone, HIPAA-safe language, no hallucinated data |

### AI Transparency

- Every AI-drafted note is flagged with `ai_generated: true` in Firestore.
- A violet **AI-assisted** badge appears on the note in the UI.
- Supervisors can filter the pending queue by AI-drafted notes.
- The audit log records a `note_ai_drafted` event whenever AI prefill is used.

### Care Companion (AI Chat)

**Route:** `/companion`

The Care Companion is an AI-powered chat assistant that helps case managers look up policy, summarize an individual's situation, or brainstorm documentation language. It uses a secure token-gated API endpoint (`/care-assistant/:token`).

> [!NOTE]
> The Care Companion is a general-purpose assistant. It does not have access to individual PHI unless you paste specific details into the chat. Always follow your organization's policy on what information can be shared with AI systems.

---

## 8. Glossary

| Term | Definition |
|---|---|
| **eChart** | Electronic Health Chart — the digital record hub for an individual served by HCBS |
| **HCBS** | Home and Community-Based Services — Medicaid-funded services delivered in home and community settings |
| **ISP** | Individual Support Plan — the comprehensive, person-centered plan outlining goals, services, and support needs. Must be reviewed and renewed annually (or per-state requirement) |
| **PCP** | Person-Centered Plan — often used interchangeably with ISP; emphasizes the individual's goals and preferences driving all care decisions |
| **Progress Note** | Clinical documentation of a face-to-face or phone contact; the primary billable documentation unit |
| **Contact Note** | Documentation of non-face-to-face contacts (phone calls, emails, coordination calls) |
| **Monitoring Form** | Structured periodic check documenting health, welfare, and service delivery status |
| **Visit Summary** | Structured documentation of an in-home or community visit |
| **Incident Report** | Mandatory documentation of any significant event affecting individual health or safety |
| **Face Sheet** | One-page demographic and clinical summary of an individual |
| **Caseload** | The set of individuals assigned to a specific case manager |
| **Enrollment Status** | Active / Inactive / Pending / Discharged — the current service status of an individual |
| **Risk Score** | A 0–100 numerical score indicating clinical risk. Calculated from multiple factors. Higher = more risk |
| **Authorization** | State or payer approval for a specific service type, number of units, and date range |
| **Service Code** | Medicaid procedure code identifying the type of service delivered |
| **Units** | Billing units — typically 15-minute increments for HCBS services |
| **NPI** | National Provider Identifier — the provider's unique billing number |
| **AI Prefill** | The system's ability to auto-generate note draft content using Gemini AI |
| **Audit Log** | Immutable record of all significant system actions for HIPAA compliance |
| **Firestore** | Google Cloud Firestore — the real-time database storing all clinical records |
| **EVV** | Electronic Visit Verification — system for confirming in-home service delivery |
| **Medicaid ID** | State-issued identifier for a Medicaid beneficiary |
| **SOC 2** | Service Organization Control Type 2 — security certification (in progress for this platform) |

---

## 9. Support & Troubleshooting

### Common Issues

| Issue | Resolution |
|---|---|
| **Can't log in** | Verify email spelling. Try "Reset password" to get a new link. Contact admin if account may be deactivated. |
| **Page shows blank** | Refresh the page. If the error persists, click "Go to Dashboard" on the error screen. Report to your supervisor. |
| **AI draft button disabled** | You must select an individual first before generating a draft. |
| **Note won't save** | Check all required fields (marked with ★): individual, activity type, date, purpose of activity. |
| **Caseload is empty** | Your caseload assignment may not be set up yet. Contact your administrator. |
| **Can't see an individual** | You may not be assigned to that individual. Case managers only see their own caseload. Ask your supervisor. |
| **Session expired** | Firebase Auth sessions auto-refresh every hour while active. If you see a login screen, your session expired. Sign in again — your unsaved note may be lost. |

### Reporting Bugs

Contact your system administrator with:
1. The URL you were on when the issue occurred
2. The time and date of the issue
3. A description of what happened vs. what you expected
4. Your browser and device (e.g., Chrome on iPhone, Safari on MacBook)

> [!TIP]
> Right-click → Inspect → Console in your browser may show error messages that help your admin diagnose issues faster. Take a screenshot of the Console tab if possible.

---

*Last updated: May 2026 — CaseManagement.AI v0.6.x*
