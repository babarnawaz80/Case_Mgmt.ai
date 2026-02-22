# Product Requirements Document (PRD)
# CaseManagement.AI
### Version 2.0 · February 22, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [System Architecture](#3-system-architecture)
4. [Engine 1: CaseManagement.ai Daily Assistant](#4-engine-1-casemanagementai-daily-assistant)
5. [Engine 2: CaseManagement.ai Compliance Engine](#5-engine-2-casemanagementai-compliance-engine)
6. [iCM Integration Layer](#6-icm-integration-layer)
7. [Data Flow Rules](#7-data-flow-rules)
8. [Data Source Priority Order](#8-data-source-priority-order)
9. [Module Mapping Reference](#9-module-mapping-reference)
10. [User Roles & Permissions](#10-user-roles--permissions)
11. [UI/UX Specification](#11-uiux-specification)
12. [API Integration Contracts](#12-api-integration-contracts)
13. [Security & Audit Requirements](#13-security--audit-requirements)
14. [Technical Architecture](#14-technical-architecture)
15. [Versioning, Pinning, and Upgrade Rules](#15-versioning-pinning-and-upgrade-rules)
16. [Idempotency & Write Safety](#16-idempotency--write-safety)
17. [Rule Pack Quality & Testing](#17-rule-pack-quality--testing)
18. [Non-Functional Requirements](#18-non-functional-requirements)
19. [Glossary](#19-glossary)

---

## 1. Executive Summary

**CaseManagement.AI** is an AI-powered layer that sits on top of iCareManager (iCM), an existing case management platform used by disability service providers. The system does NOT replace iCM — it enhances it by providing:

- **Ambient Listening** with structured entity extraction
- **AI-assisted documentation** generation
- **Compliance validation** against state guidelines
- **Selective, user-confirmed writes** to existing iCM modules via API

### Core Design Principles

| Principle | Description |
|---|---|
| **Legally Defensible** | All AI outputs are reviewed by humans before application |
| **Audit-Safe** | Every action is logged with user, timestamp, session ID, and origin |
| **No Silent Automation** | Nothing writes to iCM without explicit user confirmation |
| **Data Origin Transparency** | Every data point shows where it came from |
| **Retroactive Rule Protection** | Published compliance engines are frozen/versioned |

---

## 2. Product Overview

### 2.1 What We're Building

An AI layer with two distinct engines:

| Engine | Name | Purpose | Users |
|---|---|---|---|
| **Engine 1** | CaseManagement.ai Daily Assistant | Day-to-day case manager support (chat, ambient listening, documentation) | Case Managers |
| **Engine 2** | CaseManagement.ai Compliance Engine | Structured plan generation & validation (PCP/ISP, compliance reports) | Case Managers, Admins |

### 2.2 What Already Exists (iCM)

All iCM modules are **pre-existing production systems**. Our AI layer connects via API. The modules include:

**iCM Dashboard Modules:**
Activity Note, Billable Activity Note, Comprehensive Assessment, Monitoring Form, Progress Note, Visit Summary, Workflow Manager, Announcements, Attendance, Agency Documents, Care Tracker, PCP, Incidents, My Work

**Individual eChart Modules:**
Activity Note, Billable Activity Note, Case Management, Comprehensive Assessment, MA Status Verification, Monitoring Form, PCP, Progress Note, Visit Summary, Workflow Manager, Assigned Staff, Care Notes, Care Tracker, e-Signature, Employment & Education, Face Sheet, Incident Reporting Center, Global Discharge & External Transfer, Managed Documents, On Call Log, Person Supported Trainings, Progress Notes, Services, Service Plan, General Ledger

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CaseManagement.AI (Our Build)                │
│                                                                 │
│  ┌───────────────────────────┐  ┌────────────────────────────┐  │
│  │  ENGINE 1                  │  │  ENGINE 2                  │  │
│  │  Daily Assistant           │  │  Compliance Engine         │  │
│  │                            │  │                            │  │
│  │  • Chat Interface          │  │  • Rule Pack Engine        │  │
│  │  • Ambient Listening       │  │  • Eligibility Check       │  │
│  │  • Entity Extraction       │  │  • PCP Alignment           │  │
│  │  • Suggestions             │  │  • Limits & Caps           │  │
│  │  • Draft Notes             │  │  • Conflict Engine         │  │
│  │  • Selective Apply         │  │  • Doc Builder             │  │
│  │                            │  │  • Selective Apply         │  │
│  └────────────┬───────────────┘  └──────────────┬─────────────┘  │
│               │                                 │                │
│               │   User-Confirmed Writes (API)   │                │
│               ▼                                 ▼                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              iCM API Gateway (Integration Layer)         │    │
│  └──────────────────────────────┬───────────────────────────┘    │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────┐
│              iCareManager (Pre-existing · Production)            │
│                                                                  │
│   Contact Notes │ PCP/ISP │ Services │ Workflow Manager          │
│   Care Tracker │ Billable Activity Notes │ Progress Notes        │
│   Assessments │ Incident Reporting │ Service Plan                │
│   Face Sheet │ Employment & Education │ All Other Modules...     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Connection Model

- **Daily Assistant** → Writes incrementally to iCM modules (user-confirmed)
- **Compliance Engine** → Reads structured data from iCM modules, generates plans, writes via selective apply
- **Both engines** → Connected via stored iCM module data (not directly to each other)

---

## 4. Engine 1: CaseManagement.ai Daily Assistant

### 4.1 Purpose
Assist case managers in day-to-day activities including documentation, note-taking, and data capture.

### 4.2 Features

#### 4.2.1 Chat Interface
- AI-powered conversational assistant
- Context-aware: knows the selected individual's data
- Suggested prompts for common queries
- Chat history with searchable sessions

**Suggested Prompts Include:**
- "Show incidents in the last 24 hours"
- "Who is out of PCP compliance?"
- "Any overdue ISP reviews?"
- "Who am I seeing today?"
- "Pending notes awaiting signature"
- "Show high-risk individuals"

#### 4.2.2 Ambient Listening

**Flow:**

```
Consent Screen → Live Recording → Stop & Process → Review Outputs → Selective Apply
```

**Step 1: Consent**
- Display consent screen before recording
- Require individual acknowledgment
- Log consent with timestamp

**Step 2: Live Recording**
- Real-time transcription with speaker labels
- Inline entity tags (services, barriers, risks, PCP items)
- Pause/Resume controls
- Live duration counter

**Step 3: Stop & Process**

When user clicks "Stop & Process":

| Action | Behavior |
|---|---|
| Stop recording | Immediately |
| Lock transcript | Read-only |
| Run extraction | Final entity extraction + classification |
| Populate tabs | Entities, Suggestions, Draft Note |
| Auto-write to iCM | ❌ **NEVER** |
| Display banner | "Draft only — nothing has been written to iCM yet." |

**Step 4: Review Outputs**

Three tabs are populated:

**Entities Tab:**
- Categorized list with confidence scores
- Categories: Participants, Services Mentioned, Plan/PCP Items, Utilization/Caps, Risk & Safety, Assessments/Documentation, Barriers/SDoH
- Items < 85% confidence show warning icon

**Suggestions Tab:**
- Recommended actions (tasks, reminders, flags) that are **not documentation**
- Action cards with title, reason, destination module tag
- "Create Draft" button per card (does NOT apply to iCM)
- Cards are toggleable before review
- Suggestions can be "converted into draft content" but remain separate objects with independent lifecycle

**Draft Note Tab:**
- Structured narrative documentation (what gets filed as a note in iCM)
- Editable inline (click-to-edit sections)
- Controls: Save Draft | Edit | Review & Apply | Discard
- Save Draft = stored in Draft Store (see §4.4), no iCM write
- **Edit Mode:** Inline edits, save as version (v1, v2, v3…), view previous versions, mark sections "Approved" vs "Needs Review"
- Discard = behavior governed by tenant retention policy (see §4.5)

**Step 5: Review & Apply to iCM**

Three-panel modal:

| Panel | Purpose |
|---|---|
| **Left: Apply Targets** | Checkbox groups with Select All / Clear All |
| **Center: Preview** | Formatted preview of what will be written |
| **Right: Destination** | iCM module + field mapping |

**Apply Targets (Default States):**

| Target | Default | Draft Only? |
|---|---|---|
| Contact Note | ✅ Checked | No |
| Progress / Case Note | ✅ Checked | No |
| Barriers / SDoH | ✅ Checked | No |
| Risk & Safety | ✅ Checked | No |
| PCP / ISP Updates | ✅ Checked | No |
| Workflow Tasks | ✅ Checked | No |
| Service Authorization Draft | ⬜ Unchecked | Yes |
| Utilization / Caps Update Draft | ⬜ Unchecked | Yes |
| Assessments / LOC Renewal Item | ⬜ Unchecked | Yes |

**Apply Modes:**

| Mode | Behavior | Requirements |
|---|---|---|
| **Manual Apply** | User must individually confirm every write | Default mode |
| **Pre-Selected Apply** | Items that pass all checks are pre-selected; user still sees the Review & Apply modal and must click "Confirm & Apply" | Org-level opt-in, role-limited |
| **Supervisor Bulk Apply** | Supervisor reviews and approves a batch of pending apply plans from multiple sessions | Optional, gated to supervisor role, audited |

> **Note:** There is NO fully automatic write mode. Every apply action requires a human confirmation click. "Pre-Selected Apply" only pre-checks the checkboxes — the user still reviews and confirms. All apply modes are opt-in, role-limited, audited, and reversible (via the undo/correction workflow in §16).

**Apply Later Support:**
- "Save Apply Plan" button saves the current selections without writing to iCM
- Saved plans are accessible from the individual's pending items list
- Plans can be reopened, modified, and applied later
- Optional: route saved plans to a supervisor for review before applying
- Saved plans expire after a configurable period (default: 7 days)

**Apply Action:**
1. Validate selections (block if nothing selected)
2. Write ONLY selected items to iCM (with idempotency key — see §16)
3. Show confirmation summary
4. Create audit log entry
5. Display success banner

**Safety Rules:**
- Items < 85% confidence require user confirmation checkbox: "I confirm this item is correct"
- Duplicate detection: warn if same barrier/task exists within 14 days
- Draft-only items stored in Draft Store (see §4.4)

### 4.3 Critical Behavior Rules

| Rule | Description |
|---|---|
| No auto-write | Nothing writes to iCM without Review & Apply |
| No auto-tasks | Tasks are never created automatically |
| No auto-alerts | Alerts are never triggered automatically |
| No PCP overwrites | Daily Assistant does NOT generate full PCP — incremental updates only |
| No cap modifications | Caps/authorizations never modified without explicit confirmation |

### 4.4 Draft Store

All draft items (not yet applied to iCM) are stored in a dedicated Draft Store within CaseManagement.ai.

**Draft Entity Types:**

| Draft Type | Description | Example |
|---|---|---|
| `DraftContactNote` | Draft contact note awaiting apply | Family call summary |
| `DraftAuthorization` | Draft service authorization | New service request |
| `DraftUtilizationWarning` | Utilization/cap alert pending review | 85% cap warning |
| `DraftAssessmentReminder` | LOC renewal or assessment reminder | LOC due in 30 days |
| `DraftPCPUpdate` | Proposed PCP/ISP addition | New goal or service interest |
| `DraftBarrier` | Identified barrier pending apply | Transportation issue |
| `DraftTask` | Suggested workflow task | Follow-up call |
| `DraftApplyPlan` | Saved Review & Apply plan (Apply Later) | Saved selections for later |

**Draft Store Requirements:**

| Requirement | Detail |
|---|---|
| **Storage** | CaseManagement.ai database (NOT iCM) |
| **Linked IDs** | Each draft is linked to: `session_id`, `individual_id`, `user_id` |
| **Searchable** | Drafts are searchable by individual, session, user, type, date |
| **Reportable** | Admin dashboard shows draft counts, aging, and completion rates |
| **Access** | Draft creator + supervisors (configurable per org) |
| **Expiration** | Configurable per org (default: 30 days, then auto-archive with notification) |
| **Status** | `pending` → `applied` → `expired` / `discarded` |

### 4.5 Transcript Retention Policy

Transcript handling is governed by per-tenant configuration:

| Retention Option | Behavior |
|---|---|
| **Keep transcript for X days** | Transcript auto-deleted after X days (configurable: 7, 30, 90, 365) |
| **Keep transcript forever** | Transcript stored indefinitely |
| **Delete transcript when session is discarded** | If user clicks "Discard," transcript is deleted along with all extracted items |
| **Store transcript but redact PII/PHI** | Transcript retained but PII/PHI fields are programmatically redacted after session close |

**Transcript Access Control:**

| Role | Access |
|---|---|
| Case Manager (creator) | Full access to own transcripts |
| Supervisor | Access to transcripts of supervised case managers |
| Compliance/Audit | Access to transcript metadata only (not full text) unless required for investigation |
| Admin | Configures retention policy; no default transcript access |

**On "Discard" Action:**
- Behavior depends on tenant retention policy (above)
- If retention = "Delete on discard": transcript + all extracted entities + draft note are permanently deleted
- If retention ≠ "Delete on discard": extracted entities and draft note are deleted; transcript retained per policy
- Discard action is logged in audit trail regardless of retention policy

---

## 5. Engine 2: CaseManagement.ai Compliance Engine

### 5.1 Purpose
Generate and validate structured plans (PCP / ISP / Compliance Reports) against state guidelines.

### 5.2 Admin Layer: Compliance Engine Builder

**Access:** Admin only

**Flow:**

```
Upload Guidelines (PDF) → Upload Templates → Default Data Mapping → Review & Publish
```

**Step 1: Upload Guidelines**
- Parse PDF into structured Rule Packs
- Configure engine name and instructions
- Service code mapping (optional)

**Step 2: Upload Templates**
- Organization-level document templates
- Billable note templates, progress note templates, etc.

**Step 3: Default Data Mapping**
- Organization-wide module defaults
- Map fields to iCM modules

**Step 4: Review & Publish**
- Admin approval required
- Published engines are **frozen** (immutable)
- New versions require creating a new version (preserves history)
- See §15 for full versioning rules

### 5.3 Compliance Engine Structure

```typescript
interface ComplianceEngine {
  id: string;
  name: string;                    // e.g., "Maryland DDA"
  state: string;                   // e.g., "Maryland"
  program: string;                 // e.g., "DDA Waiver"
  effectiveDate: string;
  version: string;                 // Auto-incrementing (e.g., "1.0", "2.0")
  status: 'draft' | 'published' | 'archived';
  serviceCount: number;
  hardStopCount: number;
  warningCount: number;
  createdBy: string;
  publishedAt: string | null;
  parentVersionId: string | null;  // Links to previous version
}
```

### 5.4 Rule Pack Structure

Each compliance engine contains Rule Packs per service:

```typescript
interface RulePack {
  id: string;
  state: string;
  program_waiver_type: string;
  service_name: string;
  service_category: 'Meaningful Day' | 'Support' | 'Residential' | 'Behavioral' | 'Other';
  billing_unit: '15 min' | 'hourly' | 'daily' | 'monthly' | 'milestone' | 'other';
  eligibility_rules: RuleItem[];
  authorization_requirements: RuleItem[];
  pcp_requirements: RuleItem[];
  prerequisite_requirements: RuleItem[];
  limits: LimitRule[];
  conflicts: ConflictRule[];
  documentation_requirements: RuleItem[];
  hard_stops: RuleItem[];
  warnings: RuleItem[];
  citations: Citation[];           // Page + section + text for each rule
  published: boolean;
}

interface Citation {
  page: string;          // e.g., "42"
  section: string;       // e.g., "4.2.1(a)"
  text: string;          // Exact quoted text from guideline
}
```

### 5.5 Runtime Agent Layer

**Access:** Case Managers

Runtime Agents are execution wrappers that apply a published Compliance Engine to individuals. The term "Compliance Agent" refers to this runtime execution experience.

**Agent Types:**

| Type | Purpose |
|---|---|
| Compliance Copilot | Full compliance enforcement across all checks |
| PCP Alignment | Scans PCP vs rule pack, identifies gaps, drafts addendum |
| Billing Documentation | Verifies billable requirements, generates compliant templates |
| Monitoring / Reauthorization | Tracks caps, deadlines, creates monitoring forms |
| ISP Generator | Generates Individual Service Plans from assessments + guidelines |
| Ambient Meeting Copilot | Ambient session compliance overlay |

**Fixed Workflow (8 Steps — System-Defined, Not User-Configurable):**

| Step | Name | Data Source |
|---|---|---|
| 1 | Individual & Service | User selection |
| 2 | Eligibility Check | Waiver Enrollment + LOC + Demographics |
| 3 | PCP Alignment | PCP Module |
| 4 | Limits & Caps | Authorization + Utilization Records |
| 5 | Conflict Engine | Scheduled Services |
| 6 | Doc Builder | Engine Templates |
| 7 | Apply to Modules | Selective Apply → iCM Modules |
| 8 | Compliance Dashboard | Final status + next steps |

**Apply Modes (Runtime Agent Level):**

| Mode | Behavior | Requirements |
|---|---|---|
| **Manual Apply** | User must confirm every write in Review & Apply modal | Default for all agents |
| **Pre-Selected Apply** | All-pass items are pre-checked; user still sees Review & Apply and must click confirm | Org-level opt-in, audited |
| **Supervisor Bulk Apply** | Supervisor reviews and approves batch of pending compliance run outputs | Optional, gated to supervisor role, audited |

> **No fully automatic write mode exists.** All apply modes require a human confirmation click.

### 5.6 Compliance Run (Execution Record)

```typescript
interface ComplianceRun {
  id: string;
  individual: string;
  service: string;
  status: 'Complete' | 'In Progress';
  date: string;
  compliance: 'Pass' | 'Pending' | 'Flagged';
  engineName: string;
  engineVersion: string;
  agentName: string;
  agentVersion: string;
  user: string;
  overrides: OverrideRecord[];      // User overrides with justification
  modulesWritten: string[];          // Which iCM modules were updated
}
```

### 5.7 Override System

Any compliance result can be overridden with:

```typescript
interface OverrideRecord {
  user: string;
  timestamp: string;
  field: string;
  originalResult: string;
  newResult: string;
  justification: string;           // Required — free text
}
```

**Instruction Hierarchy (conflict resolution):**
1. **Level 1:** Compliance Engine Instructions (state-level logic)
2. **Level 2:** Agent Instructions (organization-level overrides)
3. **Level 3:** Runtime Overrides (case-specific, requires justification)

Higher level number overrides lower.

---

## 6. iCM Integration Layer

### 6.1 Integration Model

```
CaseManagement.AI  ←→  iCM API Gateway  ←→  iCM Database
```

- All reads and writes go through the **iCM API Gateway**
- Our system is a **read/write API client** of iCM
- We never access the iCM database directly
- Every API call includes authentication + audit metadata

### 6.2 Integration Requirements for Dev Team

Each UI component that displays or writes module data uses a **typed service layer** with:

1. **Module constants** — canonical module names and field maps
2. **Payload interfaces** — TypeScript types for read/write operations
3. **API endpoint patterns** — RESTful endpoint structure
4. **Error handling** — retry logic, conflict detection, auth refresh
5. **Idempotency** — every write includes an idempotency key (see §16)
6. **Optimistic locking** — read responses include `record_version`/`etag`; writes include `expected_version` (see §16)

**Example API call pattern (pseudocode):**

```typescript
// READ from iCM (includes version for optimistic locking)
const barriers = await icmApi.get('/individuals/{id}/barriers', {
  params: { since: '14d' }
});
// Response includes: { data: [...], record_version: "v42", etag: "abc123" }

// WRITE to iCM (after user confirmation)
const result = await icmApi.post('/individuals/{id}/contact-notes', {
  contact_type: 'Family Call',
  participants: ['Kathy (CM)', 'Individual', 'Mother'],
  reason: 'Routine check-in, service review',
  narrative_summary: '...',
  next_steps: '...',
  metadata: {
    source: 'ambient_listening',
    session_id: 'sess-xxxx',
    ai_confidence: 0.94,
    user_confirmed: true,
    timestamp: '2026-02-22T14:30:00Z',
    idempotency_key: 'idem-xxxx-yyyy',
    expected_version: 'v42'
  }
});
```

---

## 7. Data Flow Rules

### 7.1 Daily Assistant Data Flow

```
Ambient Session
    ↓
AI Extraction (entities, suggestions, draft note)
    ↓
User Reviews Outputs (Draft Store only — no writes yet)
    ↓
User Selects Checkboxes (Review & Apply modal)
    ↓
User Clicks "Apply Selected" (or saves Apply Plan for later)
    ↓
Selected items → iCM Modules (via API, with idempotency key)
    ↓
Audit Log Entry Created
```

### 7.2 Compliance Engine Data Flow

```
User selects Individual + Service
    ↓
System loads published Compliance Engine (Rule Pack)
    ↓
System reads structured data from iCM modules (with record_version)
    ↓
Rule engine runs checks (eligibility, PCP, limits, conflicts)
    ↓
System generates:
  • Gap report
  • Compliance alerts
  • Draft PCP / documentation
  • Required tasks
    ↓
User reviews and edits
    ↓
User selects items to apply (Selective Apply)
    ↓
Selected items → iCM Modules (via API, with idempotency key + expected_version)
    ↓
Compliance Run record created (audit trail)
```

### 7.3 Cross-Engine Connection

```
Engine 1 (Daily Assistant)  →  Writes to iCM Modules  →  Engine 2 (Compliance Engine) reads from iCM Modules
```

- They are **NOT directly connected**
- They share data through **iCM's stored module records**
- Daily Assistant builds up structured data incrementally over time
- Compliance Engine reads that accumulated structured data for plan generation

### 7.4 Absolute Rules

| Rule | Enforced By |
|---|---|
| No automatic PCP overwrites | Both engines |
| No automatic workflow triggers | Both engines |
| No automatic cap/authorization modifications | Both engines |
| All writes require explicit user confirmation | Review & Apply modal |
| All writes are audited | Audit log system |
| All writes include idempotency keys | API layer |

---

## 8. Data Source Priority Order

For each field in the system, the following priority order defines where data is pulled from:

| Priority | Source | Authority Level | Description |
|---|---|---|---|
| **1 (Highest)** | Existing iCM structured modules | Authoritative | Production data from iCM — always preferred |
| **2** | Prior applied AI outputs (stored in iCM) | Authoritative | AI-generated data that has been reviewed, confirmed, and applied to iCM by a user |
| **3** | Ambient drafts (Draft Store) | Not authoritative | AI-extracted data that has NOT been applied to iCM; shown as "Draft" with visual distinction |
| **4 (Lowest)** | Manual user entry | Always allowed | User can always override any field with manual input |

**Rules:**
- Data at priority 1 and 2 are **read from iCM** and treated as authoritative
- Data at priority 3 is **read from CaseManagement.ai Draft Store** and always labeled as draft/unconfirmed
- Manual user entry (priority 4) is always allowed and creates a new authoritative record when applied
- When displaying data, show the highest-priority source and indicate origin (e.g., "From PCP Module" vs "From Draft — not yet applied")

---

## 9. Module Mapping Reference

### 9.1 Daily Assistant → iCM Modules

#### A) Contact Notes (Primary)

| AI Output Field | iCM Target Field |
|---|---|
| Contact Type | `contact_type` |
| Participants | `participants[]` |
| Reason for Contact | `reason` |
| Summary | `narrative_summary` |
| Next Steps | `next_steps` |

#### B) Progress / Case Notes

| AI Output Field | iCM Target Field |
|---|---|
| What Happened | `narrative_body` |
| Updates Since Last Contact | `updates_since_last` |
| Plan Changes Discussed | `plan_changes` |

#### C) Barriers / SDoH

| AI Output Field | iCM Target Field |
|---|---|
| Barrier Type | `barrier_type` |
| Description | `description` |
| Severity | `severity_tag` |

#### D) Risk & Safety

| AI Output Field | iCM Target Field |
|---|---|
| Incident Type | `incident_type` |
| Description | `incident_description` |
| Severity Level | `severity_level` |

#### E) PCP / ISP Updates (Proposed)

| AI Output Field | iCM Target Field |
|---|---|
| Goal Update | `goals.update()` |
| New Service Interest | `services.propose()` |
| Schedule Changes | `schedule.update()` |

#### F) Workflow Tasks

| AI Output Field | iCM Target Field |
|---|---|
| Task | `tasks.create()` |
| Due Date | `due_date` |
| Assigned To | `assigned_to` |

#### G) Service Authorization (Draft Only)

| AI Output Field | iCM Target Field |
|---|---|
| Service Code | `service_code` |
| Rationale | `rationale` |
| Effective Date | `effective_date` |
| Units Estimate | `units_estimate` |

*Always labeled "DRAFT — pending review/submit"*

#### H) Utilization / Caps (Draft + Warning)

| AI Output Field | iCM Target Field |
|---|---|
| Note | `utilization_note` |
| Cap Status | `cap_warning` |
| Percentage Used | `utilization_pct` |

*Warning triggered if ≥ 85% or nearing cap. Never auto-modifies cap calculations.*

#### I) Assessments / LOC Renewal

| AI Output Field | iCM Target Field |
|---|---|
| Reminder Type | `assessment_type` |
| Due Date | `due_date` |
| Status | `reminder_status` |

### 9.2 Compliance Engine → iCM Modules

#### Data Sources (READ)

| Workflow Step | iCM Source Module |
|---|---|
| Eligibility Check | Waiver Enrollment + LOC + Demographics |
| PCP Alignment | PCP Module |
| Limits & Caps | Authorization + Utilization Records |
| Conflict Engine | Scheduled Services |

#### Outputs (WRITE — user-confirmed)

| Output | iCM Target Module |
|---|---|
| Services record | Services Module |
| PCP updates | PCP Module |
| Billable Activity Notes | Billable Activity Note Module |
| Progress Notes | Progress Notes Module |
| Monitoring Forms | Monitoring Form Module |
| Workflow Tasks | Workflow Manager |

---

## 10. User Roles & Permissions

| Role | Engine 1 (Daily Assistant) | Engine 2 (Compliance Engine) |
|---|---|---|
| **Admin** | Full access | Full access + Engine Builder + Publish |
| **Case Manager** | Full access | Runtime Agent execution only |
| **Supervisor** | Full access | Override approval + audit review + Bulk Apply |

### Admin-Only Actions
- Create / publish Compliance Engines
- Create Runtime Agents
- Configure apply modes
- Access engine version history
- Upgrade agents to new engine versions
- Configure transcript retention policies

### Case Manager Actions
- Use Daily Assistant (chat, ambient, scribe)
- Run Compliance Agents for individuals
- Review & Apply outputs to iCM
- Override compliance results (with justification)
- Save Apply Plans for later

### Supervisor Actions
- All Case Manager actions
- Review & approve Apply Plans from other users
- Supervisor Bulk Apply
- View transcripts of supervised case managers
- Review override history

---

## 11. UI/UX Specification

### 11.1 Application Routes

| Route | Page | Description |
|---|---|---|
| `/` | Daily Assistant | Chat + Ambient Listening home screen |
| `/dashboard` | iCM Dashboard | Stats, quick actions, module access |
| `/people` | People Supported | Individual list + search |
| `/lifeplan` | Compliance Engine Platform | Engine & Agent management |
| `/lifeplan/compliance-engines` | Compliance Engine Dashboard | View/manage engines |
| `/lifeplan/rule-library/new` | Create Compliance Engine | 4-step admin builder |
| `/lifeplan/agent/new` | Create Runtime Agent | Agent configuration |
| `/lifeplan/agent/new/layer2` | Layer 2 Agent Builder | 8-step execution workflow |
| `/lifeplan/agent/:id` | Agent Detail | Individual agent view |
| `/lifeplan/engine/:id/history` | Engine History | Version history + runs |

### 11.2 Key UI Components

| Component | Location | Purpose |
|---|---|---|
| `AmbientListening` | Engine 1 | Full ambient session flow |
| `ReviewApplyModal` | Engine 1 | 3-panel selective apply |
| `StepIndicator` | Both Engines | Step progress indicator |
| `Layer1Step1-4` | Engine 2 Admin | Compliance Engine builder steps |
| `Layer2Step1-8` | Engine 2 Runtime | Runtime agent execution steps |

### 11.3 Data Source Transparency

Every execution screen displays a banner:
> "All compliance checks pull real-time data from ICM modules."

Each step shows its specific data source (e.g., "Pulls from Waiver Enrollment + LOC + Demographics").

### 11.4 Draft Note UX Requirements

The Draft Note tab must support:

| Feature | Behavior |
|---|---|
| **Enter Edit Mode** | Explicit button to toggle edit |
| **Inline Edits** | Click-to-edit sections within the note |
| **Version History** | Save as v1, v2, v3… each edit creates new version |
| **View Previous Versions** | Side-by-side or dropdown to compare versions |
| **Section Status** | Mark individual sections as "Approved" or "Needs Review" |
| **Apply from Draft** | Open Review & Apply directly from draft |

### 11.5 Suggestions vs Draft Note (Definitions)

| Concept | Definition | Storage | Lifecycle |
|---|---|---|---|
| **Suggestions** | Recommended actions (tasks, reminders, flags) — NOT documentation | Draft Store as `DraftTask`, `DraftBarrier`, etc. | Accept → convert to apply target, or dismiss |
| **Draft Note** | Structured narrative documentation (what gets filed as a note in iCM) | Draft Store as `DraftContactNote` | Edit → version → apply → iCM record |

Suggestions can be "converted into draft content" (e.g., a suggestion to "follow up on transportation" becomes a task in the apply plan), but they remain separate objects with independent lifecycle and audit trail.

---

## 12. API Integration Contracts

### 12.1 Required API Endpoints (for Dev Team to Build)

#### Individual APIs
```
GET    /api/individuals                         → List all individuals
GET    /api/individuals/{id}                    → Individual detail + face sheet
GET    /api/individuals/{id}/echart             → Full eChart module list
```

#### Module Read APIs (all responses include `record_version` / `etag`)
```
GET    /api/individuals/{id}/contact-notes      → Contact notes history
GET    /api/individuals/{id}/progress-notes     → Progress notes
GET    /api/individuals/{id}/barriers           → Barriers / SDoH records
GET    /api/individuals/{id}/risk-safety        → Risk & safety incidents
GET    /api/individuals/{id}/pcp               → PCP / ISP data
GET    /api/individuals/{id}/services          → Active services
GET    /api/individuals/{id}/authorizations    → Service authorizations
GET    /api/individuals/{id}/utilization       → Utilization / cap data
GET    /api/individuals/{id}/assessments       → Assessment records
GET    /api/individuals/{id}/workflow-tasks    → Workflow tasks
GET    /api/individuals/{id}/care-tracker      → Care tracker entries
GET    /api/individuals/{id}/scheduled-services → Scheduled services (for conflicts)
GET    /api/individuals/{id}/waiver-enrollment  → Waiver enrollment status
GET    /api/individuals/{id}/loc               → Level of Care data
```

#### Module Write APIs (All require `source` metadata + `idempotency_key` + `expected_version`)
```
POST   /api/individuals/{id}/contact-notes      → Create contact note
POST   /api/individuals/{id}/progress-notes     → Create progress note
POST   /api/individuals/{id}/barriers           → Add barrier record
POST   /api/individuals/{id}/risk-safety        → Add risk/safety event
PATCH  /api/individuals/{id}/pcp               → Propose PCP update
POST   /api/individuals/{id}/workflow-tasks    → Create workflow task
POST   /api/individuals/{id}/authorizations    → Create auth draft
POST   /api/individuals/{id}/utilization       → Add utilization note
POST   /api/individuals/{id}/assessments       → Create assessment reminder
POST   /api/individuals/{id}/billable-notes    → Create billable activity note
```

#### Compliance Engine APIs
```
GET    /api/compliance-engines                  → List engines
GET    /api/compliance-engines/{id}             → Engine detail + rule packs
POST   /api/compliance-engines                  → Create engine (admin)
POST   /api/compliance-engines/{id}/publish     → Publish engine (admin)
GET    /api/compliance-engines/{id}/versions    → Version history
POST   /api/compliance-engines/{id}/test-run    → Preview run against sample data (admin)
```

#### Runtime Agent APIs
```
GET    /api/agents                              → List agents
POST   /api/agents                              → Create agent
GET    /api/agents/{id}                         → Agent detail
PATCH  /api/agents/{id}/upgrade                 → Upgrade agent to new engine version (admin)
POST   /api/agents/{id}/run                     → Execute compliance run
GET    /api/agents/{id}/runs                    → Run history
```

#### Draft Store APIs
```
GET    /api/drafts?individual_id={id}           → List drafts for individual
GET    /api/drafts?session_id={id}              → List drafts for session
GET    /api/drafts/{id}                         → Get draft detail
PATCH  /api/drafts/{id}                         → Update draft
DELETE /api/drafts/{id}                         → Discard draft
POST   /api/drafts/{id}/apply                   → Apply draft to iCM
```

#### Apply Plan APIs
```
POST   /api/apply-plans                         → Save apply plan for later
GET    /api/apply-plans?user_id={id}            → List pending plans
GET    /api/apply-plans/{id}                    → Get plan detail
POST   /api/apply-plans/{id}/execute            → Execute saved plan
DELETE /api/apply-plans/{id}                    → Cancel saved plan
```

#### Audit APIs
```
POST   /api/audit-log                           → Create audit entry
GET    /api/audit-log?session_id={id}           → Get audit trail for session
GET    /api/audit-log?individual_id={id}        → Get audit trail for individual
```

### 12.2 Write Payload Metadata (Required on ALL writes)

```typescript
interface WriteMetadata {
  source: 'ambient_listening' | 'compliance_engine' | 'manual';
  session_id: string;
  engine_id?: string;
  engine_version?: string;
  agent_id?: string;
  agent_version?: string;
  ai_confidence?: number;         // 0-1 scale
  user_confirmed: boolean;        // Always true for writes
  user_id: string;
  timestamp: string;              // ISO 8601
  idempotency_key: string;        // Unique per write attempt (see §16)
  expected_version?: string;      // For optimistic locking (see §16)
}
```

---

## 13. Security & Audit Requirements

### 13.1 Audit Log Entry

Every write to iCM must generate:

```typescript
interface AuditLogEntry {
  id: string;
  user_id: string;
  timestamp: string;
  session_id: string;
  action: 'apply' | 'override' | 'discard' | 'draft_save' | 'apply_plan_save' | 'apply_plan_execute';
  source: 'ambient_listening' | 'compliance_engine';
  modules_updated: string[];
  modules_skipped: string[];
  items_applied: { module: string; field: string; value: string }[];
  overrides: OverrideRecord[];
  consent_recorded: boolean;
  individual_id: string;
  idempotency_key: string;
}
```

### 13.2 Consent Requirements

- Ambient Listening requires explicit consent before recording
- Consent is logged with: individual ID, timestamp, session ID, method (verbal/written)
- Consent screen must be displayed and acknowledged before any recording begins

### 13.3 Data Retention

| Data Type | Retention Rule |
|---|---|
| Transcripts | Per-tenant retention policy (see §4.5) |
| Draft notes (applied) | Archived after apply; retained per org policy |
| Draft notes (discarded) | Governed by transcript retention policy |
| Draft Store items | Configurable expiration (default 30 days, then auto-archive) |
| Compliance runs | Permanent audit trail |
| Override records | Permanent, linked to compliance run |
| Audit log entries | Permanent, immutable |
| Apply plans (saved) | Expire after configurable period (default 7 days) |

### 13.4 Data Provenance (Per Extracted Item)

Each extracted entity (from ambient listening or compliance engine) must store:

```typescript
interface DataProvenance {
  entity_id: string;
  transcript_segment_refs: {       // Timecoded references to source transcript
    start_time: number;            // Seconds from session start
    end_time: number;
    text_snippet: string;          // Relevant portion of transcript
  }[];
  source_session_id: string;
  model_version: string;           // AI model version used for extraction
  confidence_score: number;        // 0-1
  approved_by: string | null;      // User who confirmed (null if still draft)
  approved_at: string | null;      // ISO 8601 timestamp
  applied_to_module: string | null; // e.g., "contact-notes"
  applied_to_field: string | null;  // e.g., "narrative_summary"
  applied_at: string | null;       // ISO 8601 timestamp
}
```

This is the **audit backbone** — every piece of AI-generated data can be traced back to:
- What was said (transcript segment)
- What model interpreted it (model version + confidence)
- Who approved it (user)
- Where it was written (iCM module + field)
- When it was written (timestamp)

---

## 14. Technical Architecture

### 14.1 Frontend Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| React Router v6 | Routing |
| TanStack React Query | Server state management |
| Recharts | Charts / data visualization |
| shadcn/ui | Component library |

### 14.2 Backend Requirements (For Dev Team)

| Requirement | Details |
|---|---|
| **API Gateway** | REST API connecting to iCM database |
| **Authentication** | SSO / OAuth integration with iCM |
| **AI Service** | LLM integration for entity extraction, note generation, compliance analysis |
| **WebSocket** | Real-time transcription during ambient sessions |
| **Audit Service** | Immutable audit log storage |
| **File Storage** | PDF upload for guideline parsing |
| **Draft Store** | CaseManagement.ai database for drafts, apply plans, transcripts |
| **Idempotency Service** | Deduplication layer for write operations (see §16) |

### 14.3 AI Model Integration Points

| Feature | AI Capability Needed |
|---|---|
| Ambient transcription | Speech-to-text (real-time, speaker diarization) |
| Entity extraction | NER + classification with confidence scores |
| Draft note generation | Structured text generation from transcript |
| Suggestion generation | Action recommendation from context |
| Guideline parsing | PDF → structured rule extraction |
| Compliance checking | Rule evaluation against structured data |
| PCP/ISP generation | Document generation from templates + data |

### 14.4 File Structure (Current Frontend)

```
src/
├── components/
│   ├── ambient/          # Ambient Listening + Review & Apply
│   ├── agentbuilder/     # Legacy agent builder steps
│   ├── dashboard/        # Dashboard cards (Stats, PCP, Incidents, QuickActions)
│   ├── layer1/           # Compliance Engine builder (Admin)
│   ├── layer2/           # Runtime Agent execution (8 steps)
│   ├── layout/           # App header, sidebar, layout
│   ├── lifeplan/         # Agent cards
│   └── ui/               # shadcn component library
├── contexts/
│   └── RoleContext.tsx    # Admin vs Case Manager role switching
├── pages/                # Route-level page components
├── types/
│   ├── agent.ts          # Engine, Agent, Run types + mock data
│   └── rulePack.ts       # Rule Pack, Workflow, Layer state types
└── hooks/                # Custom hooks
```

---

## 15. Versioning, Pinning, and Upgrade Rules

### 15.1 Compliance Engine Versioning

| Rule | Detail |
|---|---|
| **Immutability** | A published Compliance Engine version is frozen. No edits allowed. |
| **New version on edit** | Editing a published engine automatically creates a new draft version (version auto-increments) |
| **Version history** | Each engine maintains a version chain: v1.0 → v2.0 → v3.0… |
| **Version record** | Each version stores: version number, publish date, creator, changes summary, parent version ID |
| **Archival** | Old versions can be archived but never deleted |

### 15.2 Runtime Agent Pinning

| Rule | Detail |
|---|---|
| **Version pinning** | Each Runtime Agent is pinned to the Compliance Engine version it was created with |
| **No auto-upgrade** | Publishing a new engine version does NOT auto-upgrade existing agents |
| **Upgrade notification** | Admins receive a notification when a new engine version is available for agents using an older version |
| **Manual upgrade** | Admin explicitly upgrades an agent to a new engine version |
| **Agent versioning** | Upgrading an agent creates a new agent version (agent v1.0 on engine v1.0 → agent v2.0 on engine v2.0) |
| **Audit trail** | Every upgrade is logged: old engine version, new engine version, who upgraded, when |

### 15.3 Version History Display

The Engine History page shows:

| Column | Description |
|---|---|
| Version | e.g., "v2.0" |
| Published | Date published |
| Created By | Admin who published |
| Changes | Summary of what changed from previous version |
| Agents Using | Count of runtime agents pinned to this version |
| Status | Published / Archived |

---

## 16. Idempotency & Write Safety

### 16.1 Idempotency Keys

| Requirement | Detail |
|---|---|
| **Every write endpoint** must accept an `idempotency_key` header/field | Prevents duplicate writes on retry/double-click |
| **Key format** | UUID v4, generated client-side when user clicks "Apply" |
| **Server behavior** | If `idempotency_key` already exists, return the original response (200 OK) without creating a duplicate |
| **Key TTL** | Idempotency keys are retained for 24 hours, then expired |

### 16.2 Apply Plan Hashing

| Requirement | Detail |
|---|---|
| **Each ApplyPlan** generates a content hash | SHA-256 of (individual_id + module + field + value + session_id) |
| **Duplicate detection** | If an identical content hash already exists in applied state, warn user: "This item appears to have been applied already" |
| **User can override** | Duplicate warning is advisory, not blocking — user can confirm if intentional |

### 16.3 Deduplication Rules per Module Type

| Module | Dedup Rule |
|---|---|
| Tasks | Create-if-not-exists: match on (individual_id + title + due_date) within 14 days |
| Barriers | Create-if-not-exists: match on (individual_id + barrier_type + description hash) within 14 days |
| Risk items | Create-if-not-exists: match on (individual_id + incident_type + description hash) within 7 days |
| Contact notes | Always create new (notes are inherently unique per session) |
| PCP updates | Append, never overwrite — new proposal creates addendum |

### 16.4 Optimistic Locking (Conflict Handling)

| Requirement | Detail |
|---|---|
| **Read responses** include `record_version` / `etag` | Identifies the version of data the client read |
| **Write requests** include `expected_version` | The version the client expects to still be current |
| **Conflict detection** | If `expected_version` doesn't match current server version → 409 Conflict |
| **Conflict resolution UX** | Show user a diff: "This record was modified by [user] at [time]. Here's what changed: [diff]. Re-apply your changes?" |
| **Re-apply flow** | User reviews the diff, re-applies changes against the updated version, or cancels |

---

## 17. Rule Pack Quality & Testing

### 17.1 Admin Preview / Test Harness

| Requirement | Detail |
|---|---|
| **Preview run** | Admin can run a rule pack against sample individual data before publishing |
| **Sample data** | System provides pre-built sample profiles, or admin uploads/creates test individuals |
| **Preview output** | Shows: which rules fire, which pass, which fail, with citations |
| **No side effects** | Preview runs do NOT create compliance runs, do NOT write to iCM |

### 17.2 Rule Pack Unit Tests

| Requirement | Detail |
|---|---|
| **Per-rule tests** | Each rule in a rule pack can have test cases (input → expected result) |
| **Automated validation** | On publish, all rule tests must pass |
| **Regression testing** | When creating a new engine version, run all tests from previous version to detect regressions |

### 17.3 Citations

| Requirement | Detail |
|---|---|
| **Every rule must have a citation** | Page number + section + exact quoted text from guideline PDF |
| **Citation viewer** | Admin can click a citation to view the original PDF context |
| **Missing citation warning** | Rules without citations are flagged during Review & Publish |

### 17.4 Evaluation Feedback Loop

| Requirement | Detail |
|---|---|
| **Per-rule feedback** | Case managers can tag individual rule results as "false positive" or "false negative" during compliance runs |
| **Feedback dashboard** | Admin dashboard shows: rule accuracy rate, most-flagged rules, trending false positives |
| **Feedback → version** | High-feedback rules are surfaced when admin creates a new engine version |
| **No auto-correction** | Feedback is advisory — rules are only changed through the versioned engine update process |

---

## 18. Non-Functional Requirements

### 18.1 Performance Targets

| Metric | Target |
|---|---|
| Ambient transcription latency | Partial transcript visible within **2–3 seconds** of speech |
| Stop & Process completion | Full extraction + tab population within **60 seconds** for a 30-minute session |
| Compliance run execution | Complete 8-step workflow within **30 seconds** per individual/service |
| Review & Apply modal load | < 2 seconds |
| Page load (any route) | < 3 seconds |

### 18.2 Availability & SLA

| Metric | Target |
|---|---|
| Uptime | 99.9% (excluding scheduled maintenance) |
| Scheduled maintenance window | Sundays 2–4 AM ET (announced 48h in advance) |
| RPO (Recovery Point Objective) | < 1 hour |
| RTO (Recovery Time Objective) | < 4 hours |

### 18.3 Data Retention Defaults

| Data Type | Default Retention | Configurable? |
|---|---|---|
| Transcripts | 90 days | Yes (per tenant) |
| Drafts | 30 days (then auto-archive) | Yes (per tenant) |
| Compliance runs | Permanent | No |
| Audit logs | Permanent | No |
| Apply plans (saved) | 7 days | Yes (per tenant) |

### 18.4 Rate Limits

| Endpoint Category | Rate Limit |
|---|---|
| iCM API reads | 100 requests/second per user |
| iCM API writes | 20 requests/second per user |
| Ambient sessions (concurrent) | 1 per user |
| Compliance runs (concurrent) | 3 per user |
| Guideline PDF uploads | 5 per hour per org |

### 18.5 Security Logging & Alerting

| Event | Action |
|---|---|
| Failed authentication (3+ attempts) | Alert admin + lock account for 15 min |
| Unauthorized access attempt | Log + alert |
| Bulk data export (>100 records) | Log + require MFA confirmation |
| Override of hard-stop rule | Log + notify supervisor |
| Compliance engine publish | Log + notify all agents using previous version |
| Transcript access by non-creator | Log + audit trail entry |

---

## 19. Glossary

| Term | Definition |
|---|---|
| **iCM / iCareManager** | The existing case management platform (production system) |
| **Daily Assistant** | Engine 1 — AI chat + ambient listening for daily work |
| **Compliance Engine** | Engine 2 — a published, frozen set of state guidelines converted to rules; also the name for the structured plan engine |
| **Compliance Agent** | The runtime execution experience that applies a Compliance Engine to individuals |
| **Rule Pack** | Rules for a single service within a Compliance Engine |
| **Runtime Agent** | An execution wrapper that applies a Compliance Engine to workflows |
| **Compliance Run** | A single execution of a Runtime Agent for an individual |
| **Ambient Listening** | AI-powered session recording with entity extraction |
| **Review & Apply** | Checkbox-based selective write modal |
| **Selective Apply** | User explicitly chooses which items to write to iCM |
| **Apply Plan** | A saved set of Review & Apply selections (can be applied now or later) |
| **Draft Store** | CaseManagement.ai database for storing drafts, apply plans, and transcripts |
| **Apply Mode** | How agent outputs are presented for confirmation: Manual Apply, Pre-Selected Apply, or Supervisor Bulk Apply |
| **PCP** | Person-Centered Plan (the individual's care plan) |
| **ISP** | Individual Service Plan |
| **LOC** | Level of Care |
| **SDoH** | Social Determinants of Health |
| **Hard Stop** | A rule violation that blocks submission |
| **Override** | User overrides a compliance result (requires justification + audit) |
| **Idempotency Key** | A unique identifier per write attempt that prevents duplicate writes |
| **Optimistic Locking** | Conflict detection using record versions/ETags to prevent overwriting concurrent edits |
| **eChart** | Individual's electronic chart in iCM |
| **Face Sheet** | Individual's demographic/summary page in iCM |
| **Data Provenance** | Full audit chain for each extracted entity: source transcript, model, confidence, approver, destination |
| **Citation** | Page + section + text reference linking a rule back to the source guideline PDF |

---

## Appendix A: Mock Data Reference

The current frontend includes mock data for:
- **3 Compliance Engines** (Maryland DDA, Virginia DBHDS, Pennsylvania ODP)
- **5 Runtime Agents** (Compliance Copilot, PCP Alignment, Billing Documentation, Monitoring/Reauth, ISP Generator)
- **6 Compliance Runs** (with override examples)
- **Sample Ambient Transcript** (family call scenario with entity extraction)
- **9 Apply Targets** (full module mapping with field-level detail)

All mock data should be replaced with live iCM API calls during backend integration.

---

## Appendix B: Change Log (v1.0 → v2.0)

| Change | Section | Description |
|---|---|---|
| **Naming standardization** | All | "CaseAI Assistant" → "CaseManagement.ai Daily Assistant"; "Compliance Agent" → "CaseManagement.ai Compliance Engine"; "Compliance Agent" now only means runtime execution |
| **Push Modes → Apply Modes** | §4, §5 | Removed "Auto-Always"; renamed "Auto-Pass" to "Pre-Selected Apply"; added "Supervisor Bulk Apply"; all modes require human confirmation |
| **Transcript retention** | §4.5 | New section with per-tenant retention options, access control, and discard behavior |
| **Draft Store** | §4.4 | New section defining draft entity types, storage, access, searchability, expiration |
| **Draft Note edit mode** | §11.4 | New section defining versioned inline editing, section status |
| **Suggestions vs Draft Note** | §11.5 | New section with clear definitions and separate lifecycles |
| **Apply Later** | §4.2.2 | New feature: save apply plan without writing; reopen later; supervisor review option |
| **Data Source Priority Order** | §8 | New section defining 4-level priority for data sourcing |
| **Versioning & Pinning** | §15 | New section defining engine immutability, agent pinning, upgrade rules, audit |
| **Idempotency & Write Safety** | §16 | New section defining idempotency keys, apply plan hashing, dedup rules, optimistic locking |
| **Rule Pack Quality & Testing** | §17 | New section defining test harness, unit tests, citations, evaluation feedback loop |
| **Non-Functional Requirements** | §18 | New section defining latency targets, SLA, retention defaults, rate limits, security alerting |
| **Data Provenance** | §13.4 | New section defining per-entity audit chain with transcript references, model version, confidence, approver |
| **Glossary updates** | §19 | Added: Apply Plan, Draft Store, Apply Mode, Idempotency Key, Optimistic Locking, Data Provenance, Citation |

---

*Document prepared by CaseManagement.AI · Version 2.0 · February 22, 2026*
*For questions, contact the product team.*
