# Product Requirements Document (PRD)
# CaseManagement.AI
### Version 1.0 · February 22, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [System Architecture](#3-system-architecture)
4. [Engine 1: CaseAI Assistant (Daily Work Engine)](#4-engine-1-caseai-assistant)
5. [Engine 2: Compliance Agent (Structured Plan Engine)](#5-engine-2-compliance-agent)
6. [iCM Integration Layer](#6-icm-integration-layer)
7. [Data Flow Rules](#7-data-flow-rules)
8. [Module Mapping Reference](#8-module-mapping-reference)
9. [User Roles & Permissions](#9-user-roles--permissions)
10. [UI/UX Specification](#10-uiux-specification)
11. [API Integration Contracts](#11-api-integration-contracts)
12. [Security & Audit Requirements](#12-security--audit-requirements)
13. [Technical Architecture](#13-technical-architecture)
14. [Glossary](#14-glossary)

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
| **Engine 1** | CaseAI Assistant | Day-to-day case manager support (chat, ambient listening, documentation) | Case Managers |
| **Engine 2** | Compliance Agent | Structured plan generation & validation (PCP/ISP, compliance reports) | Case Managers, Admins |

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
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │  ENGINE 1             │     │  ENGINE 2                    │  │
│  │  CaseAI Assistant     │     │  Compliance Agent            │  │
│  │                       │     │                              │  │
│  │  • Chat Interface     │     │  • Rule Pack Engine          │  │
│  │  • Ambient Listening  │     │  • Eligibility Check         │  │
│  │  • Entity Extraction  │     │  • PCP Alignment             │  │
│  │  • Suggestions        │     │  • Limits & Caps             │  │
│  │  • Draft Notes        │     │  • Conflict Engine           │  │
│  │  • Selective Apply    │     │  • Doc Builder               │  │
│  │                       │     │  • Selective Apply           │  │
│  └──────────┬───────────┘     └──────────────┬───────────────┘  │
│             │                                │                  │
│             │   User-Confirmed Writes (API)  │                  │
│             ▼                                ▼                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              iCM API Gateway (Integration Layer)         │   │
│  └──────────────────────────────┬───────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────┐
│              iCareManager (Pre-existing · Production)           │
│                                                                 │
│   Contact Notes │ PCP/ISP │ Services │ Workflow Manager         │
│   Care Tracker │ Billable Activity Notes │ Progress Notes       │
│   Assessments │ Incident Reporting │ Service Plan               │
│   Face Sheet │ Employment & Education │ All Other Modules...    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Connection Model

- **CaseAI Assistant** → Writes incrementally to iCM modules (user-confirmed)
- **Compliance Agent** → Reads structured data from iCM modules, generates plans, writes via selective apply
- **Both engines** → Connected via stored iCM module data (not directly to each other)

---

## 4. Engine 1: CaseAI Assistant

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
- Action cards with title, reason, destination module tag
- "Create Draft" button per card (does NOT apply to iCM)
- Cards are toggleable before review

**Draft Note Tab:**
- Editable inline (click-to-edit sections)
- Controls: Save Draft | Review & Apply | Discard
- Save Draft = local session only, no iCM write
- Discard = deletes draft + extracted items, keeps transcript

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

**Apply Action:**
1. Validate selections (block if nothing selected)
2. Write ONLY selected items to iCM
3. Show confirmation summary
4. Create audit log entry
5. Display success banner

**Safety Rules:**
- Items < 85% confidence require user confirmation checkbox: "I confirm this item is correct"
- Duplicate detection: warn if same barrier/task exists within 14 days
- Draft-only items stored as DRAFT records only

### 4.3 Critical Behavior Rules

| Rule | Description |
|---|---|
| No auto-write | Nothing writes to iCM without Review & Apply |
| No auto-tasks | Tasks are never created automatically |
| No auto-alerts | Alerts are never triggered automatically |
| No PCP overwrites | CaseAI does NOT generate full PCP — incremental updates only |
| No cap modifications | Caps/authorizations never modified without explicit confirmation |

---

## 5. Engine 2: Compliance Agent

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
- Configure agent name and instructions
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

### 5.3 Compliance Engine Structure

```typescript
interface ComplianceEngine {
  id: string;
  name: string;                    // e.g., "Maryland DDA"
  state: string;                   // e.g., "Maryland"
  program: string;                 // e.g., "DDA Waiver"
  effectiveDate: string;
  version: string;                 // Semantic versioning
  status: 'draft' | 'published' | 'archived';
  serviceCount: number;
  hardStopCount: number;
  warningCount: number;
  createdBy: string;
  publishedAt: string | null;
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
  citations: Citation[];
  published: boolean;
}
```

### 5.5 Runtime Agent Layer

**Access:** Case Managers

Runtime Agents are execution wrappers that apply a published Compliance Engine to individuals.

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
| 7 | Push to Modules | Selective Apply → iCM Modules |
| 8 | Compliance Dashboard | Final status + next steps |

**Push Modes:**

| Mode | Behavior |
|---|---|
| Manual | User must confirm every write |
| Auto-Pass | Auto-push only when all checks pass |
| Auto-Always | Auto-push always (requires supervisor approval setting) |

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

**Example API call pattern (pseudocode):**

```typescript
// READ from iCM
const barriers = await icmApi.get('/individuals/{id}/barriers', {
  params: { since: '14d' }
});

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
    timestamp: '2026-02-22T14:30:00Z'
  }
});
```

---

## 7. Data Flow Rules

### 7.1 CaseAI Assistant Data Flow

```
Ambient Session
    ↓
AI Extraction (entities, suggestions, draft note)
    ↓
User Reviews Outputs (Draft only — no writes yet)
    ↓
User Selects Checkboxes (Review & Apply modal)
    ↓
User Clicks "Apply Selected"
    ↓
Selected items → iCM Modules (via API)
    ↓
Audit Log Entry Created
```

### 7.2 Compliance Agent Data Flow

```
User selects Individual + Service
    ↓
System loads published Compliance Engine (Rule Pack)
    ↓
System reads structured data from iCM modules
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
Selected items → iCM Modules (via API)
    ↓
Compliance Run record created (audit trail)
```

### 7.3 Cross-Engine Connection

```
Engine 1 (CaseAI)  →  Writes to iCM Modules  →  Engine 2 (Compliance) reads from iCM Modules
```

- They are **NOT directly connected**
- They share data through **iCM's stored module records**
- CaseAI builds up structured data incrementally over time
- Compliance Agent reads that accumulated structured data for plan generation

### 7.4 Absolute Rules

| Rule | Enforced By |
|---|---|
| No automatic PCP overwrites | Both engines |
| No automatic workflow triggers | Both engines |
| No automatic cap/authorization modifications | Both engines |
| All writes require explicit user confirmation | Review & Apply modal |
| All writes are audited | Audit log system |

---

## 8. Module Mapping Reference

### 8.1 CaseAI Assistant → iCM Modules

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

### 8.2 Compliance Agent → iCM Modules

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

## 9. User Roles & Permissions

| Role | Engine 1 (CaseAI) | Engine 2 (Compliance) |
|---|---|---|
| **Admin** | Full access | Full access + Engine Builder + Publish |
| **Case Manager** | Full access | Runtime Agent execution only |
| **Supervisor** | Full access | Override approval + audit review |

### Admin-Only Actions
- Create / publish Compliance Engines
- Create Runtime Agents
- Configure push modes
- Access engine version history

### Case Manager Actions
- Use CaseAI Assistant (chat, ambient, scribe)
- Run Compliance Agents for individuals
- Review & Apply outputs to iCM
- Override compliance results (with justification)

---

## 10. UI/UX Specification

### 10.1 Application Routes

| Route | Page | Description |
|---|---|---|
| `/` | CaseAI Assistant | Chat + Ambient Listening home screen |
| `/dashboard` | iCM Dashboard | Stats, quick actions, module access |
| `/people` | People Supported | Individual list + search |
| `/lifeplan` | Compliance Agent Platform | Engine & Agent management |
| `/lifeplan/compliance-engines` | Compliance Engine Dashboard | View/manage engines |
| `/lifeplan/rule-library/new` | Create Compliance Engine | 4-step admin builder |
| `/lifeplan/agent/new` | Create Runtime Agent | Agent configuration |
| `/lifeplan/agent/new/layer2` | Layer 2 Agent Builder | 8-step execution workflow |
| `/lifeplan/agent/:id` | Agent Detail | Individual agent view |
| `/lifeplan/engine/:id/history` | Engine History | Version history + runs |

### 10.2 Key UI Components

| Component | Location | Purpose |
|---|---|---|
| `AmbientListening` | Engine 1 | Full ambient session flow |
| `ReviewApplyModal` | Engine 1 | 3-panel selective apply |
| `StepIndicator` | Both Engines | Step progress indicator |
| `Layer1Step1-4` | Engine 2 Admin | Compliance Engine builder steps |
| `Layer2Step1-8` | Engine 2 Runtime | Runtime agent execution steps |

### 10.3 Data Source Transparency

Every execution screen displays a banner:
> "All compliance checks pull real-time data from ICM modules."

Each step shows its specific data source (e.g., "Pulls from Waiver Enrollment + LOC + Demographics").

---

## 11. API Integration Contracts

### 11.1 Required API Endpoints (for Dev Team to Build)

#### Individual APIs
```
GET    /api/individuals                         → List all individuals
GET    /api/individuals/{id}                    → Individual detail + face sheet
GET    /api/individuals/{id}/echart             → Full eChart module list
```

#### Module Read APIs
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

#### Module Write APIs (All require `source` metadata)
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
```

#### Runtime Agent APIs
```
GET    /api/agents                              → List agents
POST   /api/agents                              → Create agent
GET    /api/agents/{id}                         → Agent detail
POST   /api/agents/{id}/run                     → Execute compliance run
GET    /api/agents/{id}/runs                    → Run history
```

#### Audit APIs
```
POST   /api/audit-log                           → Create audit entry
GET    /api/audit-log?session_id={id}           → Get audit trail for session
```

### 11.2 Write Payload Metadata (Required on ALL writes)

```typescript
interface WriteMetadata {
  source: 'ambient_listening' | 'compliance_agent' | 'manual';
  session_id: string;
  engine_id?: string;
  engine_version?: string;
  agent_id?: string;
  agent_version?: string;
  ai_confidence?: number;         // 0-1 scale
  user_confirmed: boolean;        // Always true for writes
  user_id: string;
  timestamp: string;              // ISO 8601
}
```

---

## 12. Security & Audit Requirements

### 12.1 Audit Log Entry

Every write to iCM must generate:

```typescript
interface AuditLogEntry {
  id: string;
  user_id: string;
  timestamp: string;
  session_id: string;
  action: 'apply' | 'override' | 'discard' | 'draft_save';
  source: 'ambient_listening' | 'compliance_agent';
  modules_updated: string[];
  modules_skipped: string[];
  items_applied: { module: string; field: string; value: string }[];
  overrides: OverrideRecord[];
  consent_recorded: boolean;
  individual_id: string;
}
```

### 12.2 Consent Requirements

- Ambient Listening requires explicit consent before recording
- Consent is logged with: individual ID, timestamp, session ID, method (verbal/written)
- Consent screen must be displayed and acknowledged before any recording begins

### 12.3 Data Retention

- Transcripts: retained per organization policy
- Draft notes: session-only (not persisted if discarded)
- Compliance runs: permanent audit trail
- Override records: permanent, linked to compliance run

---

## 13. Technical Architecture

### 13.1 Frontend Stack

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

### 13.2 Backend Requirements (For Dev Team)

| Requirement | Details |
|---|---|
| **API Gateway** | REST API connecting to iCM database |
| **Authentication** | SSO / OAuth integration with iCM |
| **AI Service** | LLM integration for entity extraction, note generation, compliance analysis |
| **WebSocket** | Real-time transcription during ambient sessions |
| **Audit Service** | Immutable audit log storage |
| **File Storage** | PDF upload for guideline parsing |

### 13.3 AI Model Integration Points

| Feature | AI Capability Needed |
|---|---|
| Ambient transcription | Speech-to-text (real-time, speaker diarization) |
| Entity extraction | NER + classification with confidence scores |
| Draft note generation | Structured text generation from transcript |
| Suggestion generation | Action recommendation from context |
| Guideline parsing | PDF → structured rule extraction |
| Compliance checking | Rule evaluation against structured data |
| PCP/ISP generation | Document generation from templates + data |

### 13.4 File Structure (Current Frontend)

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

## 14. Glossary

| Term | Definition |
|---|---|
| **iCM / iCareManager** | The existing case management platform (production system) |
| **CaseAI Assistant** | Engine 1 — AI chat + ambient listening for daily work |
| **Compliance Agent** | Engine 2 — structured plan generation + validation |
| **Compliance Engine** | A published, frozen set of state guidelines converted to rules |
| **Rule Pack** | Rules for a single service within a Compliance Engine |
| **Runtime Agent** | An execution wrapper that applies a Compliance Engine to workflows |
| **Compliance Run** | A single execution of a Runtime Agent for an individual |
| **Ambient Listening** | AI-powered session recording with entity extraction |
| **Review & Apply** | Checkbox-based selective write modal |
| **Selective Apply** | User explicitly chooses which items to write to iCM |
| **PCP** | Person-Centered Plan (the individual's care plan) |
| **ISP** | Individual Service Plan |
| **LOC** | Level of Care |
| **SDoH** | Social Determinants of Health |
| **Hard Stop** | A rule violation that blocks submission |
| **Override** | User overrides a compliance result (requires justification + audit) |
| **Push Mode** | How agent outputs are written (manual, auto-pass, auto-always) |
| **eChart** | Individual's electronic chart in iCM |
| **Face Sheet** | Individual's demographic/summary page in iCM |

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

*Document prepared by CaseManagement.AI · February 22, 2026*
*For questions, contact the product team.*
