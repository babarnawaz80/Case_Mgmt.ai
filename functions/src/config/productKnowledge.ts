/**
 * PRODUCT_KNOWLEDGE
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical reference block for CaseAI Assistant.
 * Injected at the TOP of every system prompt, before any caseload data.
 * Kept ≤ 1 900 tokens so the context window is not crowded.
 * Update this file whenever a feature changes — one source of truth.
 */

export const PRODUCT_KNOWLEDGE = `
## CaseManagement.AI — Product Knowledge (authoritative, do not contradict)

### Platform Overview
CaseManagement.AI (also called iCM) is a HIPAA-compliant HCBS case management SaaS. Core modules: eChart, My Work, Documentation, Billing Hub, Brain Orchestrator, Schedule, Messages, Reports, Platform (admin-only). Role hierarchy: case_manager → supervisor → admin → platform_admin.

### eChart Tile Structure
Each individual's eChart shows a header (name, ID, risk badge, enrollment status, county, program) then a tile grid. Tiles: Visit Summary, Progress Notes, Contact Notes, Care Plan, Monitoring Forms, Incidents, Referrals, Authorizations, Eligibility, Service Plan, Managed Documents, Assessments, Medications, Employment, Trainings, On-Call Log, Meeting Notes, Workflows, Risk Score. Clicking a tile opens that module filtered to that individual. The "Next Visit" metric on the header pulls from scheduled_visits. The "Last Visit" metric pulls from visit_summaries.

### Documentation Hub Modules
Accessible via sidebar "Documentation" or quick actions. Modules: Progress Notes (billable activity notes requiring signature), Visit Summaries (in-person documentation), Contact Notes (phone/community contacts), Monitoring Forms (monthly/quarterly/annual health & safety review), On-Call Log (after-hours calls), Meeting Notes, Incident Reports, Referrals, Managed Documents (uploaded files), Care Plans (goals + interventions), Service Plans, Assessments. All support draft → submitted/signed workflow. AI can pre-fill forms from ambient session transcripts.

### Note Signing & Amendment Process
Draft → click "Submit" → confirmation modal → status becomes "Submitted/Signed" and note locks to read-only. Locked notes show a green "Submitted & locked" banner. To correct a signed note: click "Request Amendment" (or "Addendum") — this creates a new linked addendum note while the original remains immutable for audit. Supervisors can reject notes (see Rejection workflow). Billing records are auto-created when a billable note is signed.

### Note Rejection & Correction Workflow
Supervisor opens a submitted note and clicks "Reject" → enters rejection reason → note status changes to "Returned for Correction" with the reason visible to the case manager. The case manager sees a red banner on the note with the rejection reason, edits the note, and resubmits. The original rejection is preserved in the audit log.

### Billing Hub & Queue
Located at /billing. The queue (billing_records collection) shows claims auto-created when billable notes are signed. **4 scrub validation checks**: (1) Service code present, (2) Authorization number linked and units within cap, (3) Date of service within authorization period, (4) Units > 0 and duration matches service code rules. Status badges: **scrub_passed** (green, ready to submit), **needs_attention** (amber, one or more checks failed — view the claim drawer to see specific issues and fix instructions), **submitted** (blue, sent to payer), **paid** (emerald), **denied** (red). The "Sync from Notes" button backfills existing signed billable notes into the queue. "Export CSV" downloads all visible claims in CMS-1500-compatible format. "Run Full Scrub" re-validates all queue records against current authorizations.

### Brain Orchestrator
Located at /platform (admin only). An automated compliance agent that runs on a schedule or on demand. It scans the org's caseload for: overdue monitoring forms, expiring authorizations, missing progress notes, unsigned notes, ISP renewal dates, open incidents past SLA. When it finds issues it creates tasks in My Work, sends inbox notifications, and logs to the orchestrator_logs collection. Manual run available via "Run Now" button. Frequency configurable: daily, weekly, or real-time triggers. Results viewable in the Orchestrator Runs history panel.

### My Work (Task Management)
Located at /my-work. Tasks stored in the tasks collection. Statuses: open, in_progress, completed, overdue. Priority: high (red dot), medium (amber dot), low (grey dot). Groups: Overdue, Due Today, This Week, Upcoming. Clicking the circle checkbox completes a task optimistically (Firestore write in background). Clicking a task row opens a detail drawer with description, linked individual, comments thread, and action buttons (Complete, View Module, Add Comment). If a task title contains "schedule" the complete action opens the Schedule Visit modal instead of marking it done. Task types: Progress Note Due, Care Plan Review, Assessment Due, Monitoring Form, Plan Renewal, Eligibility Verification, Incident Follow-up, Visit Scheduled, Contact Required, Document Review, General.

### Ambient Listening Flow & Consent
Accessed via the microphone icon on any note form or via the Companion app. Steps: (1) Confirm individual consent on-screen (required — cannot proceed without), (2) Session begins recording via Deepgram real-time transcription, (3) Live transcript shown, (4) Click "Stop & Review" to end session, (5) AI drafts the note from the transcript, (6) Case manager reviews AI-highlighted fields, edits as needed, then submits. Consent is logged in the audit_log. Ambient sessions are stored in companion_sessions. The AI-drafted fields are labeled with a purple ✦ badge in the form.

### Care Plan & Renewal Countdown
Care plans (care_plans collection) have an effective_date and review_date. The eChart header and the Care Plan tile show a countdown badge: green (>60 days), amber (31–60 days), red (≤30 days, labeled "Renewal Due"). Clicking "Renew" opens the Care Plan Builder pre-filled from the existing plan. Goals have status: not_started, in_progress, achieved, discontinued. Supervisors must approve care plans; case managers create/edit them.

### Compliance Scores
Displayed as a percentage on the individual's eChart header and in the Supervisor Dashboard. Calculated from: (signed notes on time / required notes) × weight + (open incidents closed on time / open incidents) × weight + (monitoring forms submitted / due) × weight + (authorizations current / all) × weight. Score ranges: 90–100% = green "Compliant", 70–89% = amber "Needs Attention", <70% = red "At Risk". The Compliance Score drawer (click the badge) shows the breakdown by category and lists the specific gaps dragging the score down.

### Monitoring Form Sections
Sections (all required for submission): (1) General Health Status — current health, recent illnesses, hospitalizations; (2) Behavioral Status — mood, behaviors, incidents since last form; (3) Living Situation — home environment safety, roommates; (4) Community Integration — day program attendance, activities; (5) Support Services — services received vs authorized, provider issues; (6) Goals Progress — update on each active ISP goal; (7) Recommendations & Next Steps — planned actions; (8) Signatures — case manager signature locks the form. Forms are monthly, quarterly, or annual based on the individual's program level.

### Guidelines Engine & Rule Packs
Located at /platform → Guidelines Engines (admin only). A rule engine that validates documentation against configurable compliance rules. A "rule pack" is a collection of rules for a specific program or payer (e.g., "Indiana HCBS Waiver", "Ohio SELF Waiver"). Rules define: required fields, required frequencies, time limits, and billing code constraints. The engine runs automatically on save/submit of notes and surfaces a compliance badge (pass/warn/fail) on the note. Admins can create custom rule packs via the wizard or import from YAML. Rules are versioned — changing a rule does not affect already-signed notes.

### Schedule Module
Located at /schedule. Shows Day / Week / Month calendar views with navigation (← Today →). Visit types color-coded: In-Home (blue), Office (indigo), Community (violet), Phone (green), Virtual (cyan), Wraparound Meeting (amber). Filters: individual name, visit type, county, assigned staff, status. Clicking an event opens a detail drawer with "Start Visit" (→ pre-fills Visit Summary form) and "Cancel Visit". Visits stored in scheduled_visits collection. Reminders sent via Cloud Function hourly to assigned staff inbox.

### Admin Settings Categories
Located at /settings (admin role required). Categories: Organization (name, address, NPI, logo), Users (invite, deactivate, role change, import via CSV), Programs (program types, LOC tiers), Billing Configuration (rate tables, payer mappings, service code rules), AI Settings (model, temperature, enable/disable features per role), Integrations (EVV systems, e-signature providers), Security (MFA enforcement, session timeout, IP allowlist), Notifications (email/SMS triggers per event type), Templates (note templates, care plan templates), Import/Export (bulk individual import, staff import, data export).
`.trim();
