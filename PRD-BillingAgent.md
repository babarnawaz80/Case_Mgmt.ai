# Product Requirements Document (PRD)
# Billing.AI — IDD Billing Agent
### Version 1.0 · February 22, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [System Architecture](#3-system-architecture)
4. [Engine 1: Billing Guidelines Engine (Admin Layer)](#4-engine-1-billing-guidelines-engine-admin-layer)
5. [Engine 2: Billing Runtime Agents](#5-engine-2-billing-runtime-agents)
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
17. [Billing Rule Pack Quality & Testing](#17-billing-rule-pack-quality--testing)
18. [Non-Functional Requirements](#18-non-functional-requirements)
19. [Glossary](#19-glossary)

---

## 1. Executive Summary

**Billing.AI** is an AI-powered billing compliance and claims management layer that sits on top of iCareManager (iCM), an existing case management platform used by IDD (Intellectual and Developmental Disabilities) service providers. The system does NOT replace iCM — it enhances it by providing:

- **Billing guideline ingestion** from state Medicaid/Waiver program manuals
- **Automated billing validation** against state-specific billing rules
- **Claims pre-submission checks** for clean claim rates
- **Documentation sufficiency verification** before billing
- **Revenue cycle optimization** with proactive alerts and dashboards
- **Selective, user-confirmed writes** to existing iCM billing modules via API

### Core Design Principles

| Principle | Description |
|---|---|
| **Financially Defensible** | All billing decisions are reviewed by humans before submission |
| **Audit-Safe** | Every billing action is logged with user, timestamp, session ID, and origin |
| **No Silent Automation** | Nothing writes to iCM or submits claims without explicit user confirmation |
| **Billing Origin Transparency** | Every billing data point shows where it came from (service record, authorization, rate table) |
| **Retroactive Rule Protection** | Published billing engines are frozen/versioned — past claims are never retroactively invalidated |
| **Clean Claim Priority** | System prioritizes preventing claim denials over speed of submission |

---

## 2. Product Overview

### 2.1 What We're Building

An AI layer with two distinct engines:

| Engine | Name | Purpose | Users |
|---|---|---|---|
| **Engine 1** | Billing Guidelines Engine | Admin-built billing rule packs from state Medicaid/Waiver billing manuals | Admins |
| **Engine 2** | Billing Runtime Agents | Execute billing validation, claims checks, and documentation verification for individuals | Billing Staff, Case Managers, Admins |

### 2.2 What Already Exists (iCM)

All iCM modules are **pre-existing production systems**. Our AI layer connects via API. The billing-relevant modules include:

**iCM Billing & Service Modules:**
Billable Activity Note, Services, Service Plan, Attendance, Authorization, Utilization, Rate Tables, Claims, Remittance, General Ledger, Progress Notes, Visit Summary, Workflow Manager

**iCM Individual Modules (Data Sources):**
Face Sheet, MA Status Verification, PCP, Comprehensive Assessment, Demographics, Waiver Enrollment, Level of Care, Assigned Staff, Care Tracker, Incident Reporting Center, Employment & Education

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Billing.AI (Our Build)                     │
│                                                                 │
│  ┌───────────────────────────┐  ┌────────────────────────────┐  │
│  │  ENGINE 1                  │  │  ENGINE 2                  │  │
│  │  Billing Guidelines Engine │  │  Billing Runtime Agents    │  │
│  │                            │  │                            │  │
│  │  • Billing Manual Upload   │  │  • Pre-Bill Validation     │  │
│  │  • Rate Table Parsing      │  │  • Claims Scrubbing        │  │
│  │  • Modifier Rules          │  │  • Documentation Check     │  │
│  │  • Billing Code Mapping    │  │  • Authorization Match     │  │
│  │  • Exclusion/Conflict      │  │  • Conflict Detection      │  │
│  │    Rules                   │  │  • Claims Packaging        │  │
│  │  • Doc Requirements        │  │  • Denial Prevention       │  │
│  │                            │  │  • Revenue Dashboard       │  │
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
│   Billable Activity Notes │ Services │ Authorization             │
│   Attendance │ Rate Tables │ Claims │ Remittance                 │
│   Progress Notes │ Visit Summary │ General Ledger                │
│   Service Plan │ PCP │ Face Sheet │ All Other Modules...         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Connection Model

- **Billing Guidelines Engine** → Reads state billing manuals, generates billing rule packs (admin layer)
- **Billing Runtime Agents** → Reads from iCM modules, validates billing, generates clean claims, writes via selective apply
- **Both engines** → Connected via stored iCM module data (not directly to each other)

---

## 4. Engine 1: Billing Guidelines Engine (Admin Layer)

### 4.1 Purpose
Enable admins to ingest state Medicaid/Waiver billing manuals and build structured Billing Rule Packs that define how services are billed, validated, and documented.

### 4.2 Admin Builder Flow

```
Upload Billing Manual (PDF) → Extract Billing Rules → Build Rate & Code Mapping → Normalize & Validate → Review & Publish
```

**Step 1: Upload Billing Manual**
- Parse state Medicaid/Waiver billing manual PDF
- Configure engine name, state, program, effective date
- AI extracts billing rules, rate tables, modifier requirements, documentation standards

**Step 2: Extract Billing Rules**
- AI-parsed billing rules presented for admin review
- Categories: Rate Rules, Modifier Rules, Unit Calculations, Exclusions, Documentation Requirements, Prior Authorization Rules
- Each rule linked to source citation (page + section + quoted text)
- Admin can edit, add, or remove rules

**Step 3: Build Rate & Code Mapping**
- Map service names to billing codes (HCPCS, CPT, state-specific codes)
- Define rate tables per service (unit rate, daily rate, monthly rate)
- Map modifier codes (GT, HQ, U1-U9, etc.)
- Define billing unit conversions (15-min → units, hourly → units)
- Organization-level rate overrides (contracted rates vs. state fee schedule)

**Step 4: Normalize & Validate**
- Cross-reference rules for conflicts
- Validate rate table completeness
- Flag missing documentation requirements
- Ensure all services have billing codes mapped

**Step 5: Review & Publish**
- Admin approval required
- Published engines are **frozen** (immutable)
- New versions require creating a new version (preserves history)
- See §15 for full versioning rules

### 4.3 Billing Guidelines Engine Structure

```typescript
interface BillingGuidelinesEngine {
  id: string;
  name: string;                    // e.g., "Maryland DDA Billing"
  state: string;                   // e.g., "Maryland"
  program: string;                 // e.g., "DDA Waiver"
  effectiveDate: string;
  version: string;                 // Auto-incrementing (e.g., "1.0", "2.0")
  status: 'draft' | 'published' | 'archived';
  serviceCount: number;
  billingCodeCount: number;
  rateTableCount: number;
  hardStopCount: number;           // Rules that block billing
  warningCount: number;            // Rules that warn but allow
  createdBy: string;
  publishedAt: string | null;
  parentVersionId: string | null;
  lastUpdated: string;
}
```

### 4.4 Billing Rule Pack Structure

Each billing engine contains Billing Rule Packs per service:

```typescript
interface BillingRulePack {
  id: string;
  state: string;
  program_waiver_type: string;
  service_name: string;
  service_category: 'Meaningful Day' | 'Support' | 'Residential' | 'Behavioral' | 'Employment' | 'Other';

  // Billing Code & Rate Info
  billing_code: string;            // HCPCS/CPT code
  billing_code_description: string;
  modifier_codes: ModifierRule[];
  rate_table: RateEntry[];
  billing_unit: '15 min' | 'hourly' | 'daily' | 'monthly' | 'event' | 'other';
  unit_conversion_rule: string;    // e.g., "1 unit = 15 minutes, minimum 8 minutes to bill"

  // Validation Rules
  eligibility_rules: BillingRuleItem[];
  authorization_requirements: BillingRuleItem[];
  documentation_requirements: BillingRuleItem[];
  prerequisite_requirements: BillingRuleItem[];
  
  // Limits & Conflicts
  billing_limits: BillingLimitRule[];
  billing_conflicts: BillingConflictRule[];
  same_day_rules: SameDayRule[];
  
  // Hard Stops & Warnings
  hard_stops: BillingRuleItem[];   // Block claim submission
  warnings: BillingRuleItem[];     // Warn but allow with justification
  
  // Source Citations
  citations: Citation[];
  published: boolean;
}

interface ModifierRule {
  code: string;                    // e.g., "GT", "HQ", "U1"
  description: string;
  when_required: string;           // Condition that triggers this modifier
  auto_apply: boolean;             // Can system auto-suggest this modifier?
}

interface RateEntry {
  effective_date: string;
  end_date: string | null;
  unit_rate: number;
  rate_type: 'state_fee_schedule' | 'contracted' | 'negotiated';
  modifier_adjustments: { modifier: string; rate_multiplier: number }[];
}

interface BillingRuleItem {
  id: string;
  rule_text: string;
  severity: 'hard_stop' | 'warning' | 'info';
  description: string;
  field_check: string;             // Which data field to validate
  expected_value: string;          // What passes
  citation: Citation;
}

interface BillingLimitRule {
  id: string;
  limit_type: 'daily_units' | 'weekly_units' | 'monthly_units' | 'annual_units' | 'daily_hours' | 'weekly_hours' | 'auth_period_units';
  max_value: number;
  unit: string;
  description: string;
  overage_behavior: 'hard_stop' | 'warning' | 'requires_override';
  citation: Citation;
}

interface BillingConflictRule {
  id: string;
  conflict_type: 'same_time' | 'same_day' | 'same_auth_period' | 'overlapping';
  conflicting_service_codes: string[];
  description: string;
  severity: 'hard_stop' | 'warning';
  citation: Citation;
}

interface SameDayRule {
  id: string;
  service_code_a: string;
  service_code_b: string;
  allowed: boolean;
  conditions: string;              // e.g., "Only if non-overlapping times"
  modifier_required: string | null; // e.g., "Add modifier 59 if same day"
  citation: Citation;
}

interface Citation {
  page: string;
  section: string;
  text: string;                    // Exact quoted text from billing manual
}
```

---

## 5. Engine 2: Billing Runtime Agents

### 5.1 Purpose
Execute billing validation, claims pre-submission checks, and documentation verification for individuals using published Billing Guidelines Engines.

### 5.2 Runtime Agent Types

| Type | Purpose |
|---|---|
| **Pre-Bill Validation Agent** | Full billing compliance check before claim creation — eligibility, authorization, documentation, limits, conflicts |
| **Claims Scrubbing Agent** | Scrubs prepared claims against billing rules, catches errors before submission |
| **Documentation Sufficiency Agent** | Verifies all required documentation exists and is complete before billing |
| **Authorization Matching Agent** | Matches services to authorizations, tracks utilization, flags expiring auths |
| **Revenue Cycle Dashboard Agent** | Aggregates billing health metrics, denial trends, aging reports, clean claim rates |
| **Billing Ambient Copilot** | Ambient session overlay that flags billing-relevant items during case manager meetings |

### 5.3 Fixed Billing Workflow (8 Steps — System-Defined, Not User-Configurable)

| Step | Name | Data Source | Purpose |
|---|---|---|---|
| 1 | Individual & Service Selection | User selection | Select person + service + date range |
| 2 | Eligibility & Enrollment Check | Waiver Enrollment + MA Status + LOC + Demographics | Is this person eligible for this service on these dates? |
| 3 | Authorization Matching | Authorization + Service Plan | Is there a valid authorization? Units remaining? |
| 4 | Attendance & Service Verification | Attendance + Visit Summary + Billable Activity Notes | Was the service actually delivered? Documented? |
| 5 | Billing Code & Rate Validation | Rate Tables + Modifier Rules | Correct billing code, modifiers, rate, units? |
| 6 | Limits & Conflict Check | Utilization Records + Scheduled Services | Within caps? Any same-day/overlapping conflicts? |
| 7 | Documentation Sufficiency | Progress Notes + BAN + PCP | All required docs present and complete? |
| 8 | Claims Package & Dashboard | Claims Module + Revenue Metrics | Generate clean claim, show billing dashboard |

### 5.4 Apply Modes (Runtime Agent Level)

| Mode | Behavior | Requirements |
|---|---|---|
| **Manual Apply** | User must confirm every billing write in Review & Apply modal | Default for all agents |
| **Pre-Selected Apply** | All-pass billing items are pre-checked; user still sees Review & Apply and must click confirm | Org-level opt-in, audited |
| **Supervisor Bulk Apply** | Billing supervisor reviews and approves batch of pending billing outputs | Optional, gated to billing supervisor role, audited |

> **No fully automatic billing write mode exists.** Every billing action requires a human confirmation click.

### 5.5 Billing Run (Execution Record)

```typescript
interface BillingRun {
  id: string;
  individual: string;
  individualId: string;
  service: string;
  serviceCode: string;
  dateOfService: string;
  dateRange: { start: string; end: string };
  status: 'Complete' | 'In Progress' | 'Failed';
  billingResult: 'Clean' | 'Pending' | 'Flagged' | 'Denied';
  engineName: string;
  engineVersion: string;
  agentName: string;
  agentVersion: string;
  user: string;
  
  // Billing-specific fields
  billingCode: string;
  modifiers: string[];
  units: number;
  rate: number;
  totalAmount: number;
  authorizationId: string;
  authorizationUnitsRemaining: number;
  
  // Validation results per step
  eligibilityResult: StepResult;
  authorizationResult: StepResult;
  attendanceResult: StepResult;
  codeValidationResult: StepResult;
  limitsResult: StepResult;
  documentationResult: StepResult;
  
  overrides: BillingOverrideRecord[];
  modulesWritten: string[];
  claimId: string | null;          // If claim was generated
}

interface StepResult {
  status: 'pass' | 'warning' | 'hard_stop' | 'skipped';
  findings: string[];
  hardStopReasons: string[];
}

interface BillingOverrideRecord {
  id: string;
  user: string;
  timestamp: string;
  step: string;                    // Which workflow step
  field: string;
  originalResult: string;
  newResult: string;
  justification: string;          // Required — free text
  supervisorApproval: boolean;
  supervisorId: string | null;
}
```

### 5.6 Override System

Any billing validation result can be overridden with:
- Required justification text
- Optional supervisor approval (configurable per org)
- Full audit trail

**Instruction Hierarchy (conflict resolution):**
1. **Level 1:** Billing Guidelines Engine Instructions (state-level billing logic)
2. **Level 2:** Agent Instructions (organization-level billing overrides)
3. **Level 3:** Runtime Overrides (case-specific, requires justification + optional supervisor approval)

Higher level number overrides lower.

---

## 6. iCM Integration Layer

### 6.1 Integration Model

```
Billing.AI  ←→  iCM API Gateway  ←→  iCM Database
```

- All reads and writes go through the **iCM API Gateway**
- Our system is a **read/write API client** of iCM
- We never access the iCM database directly
- Every API call includes authentication + audit metadata

### 6.2 Integration Requirements for Dev Team

Each UI component that displays or writes billing data uses a **typed service layer** with:

1. **Module constants** — canonical module names and field maps
2. **Payload interfaces** — TypeScript types for read/write operations
3. **API endpoint patterns** — RESTful endpoint structure
4. **Error handling** — retry logic, conflict detection, auth refresh
5. **Idempotency** — every write includes an idempotency key (see §16)
6. **Optimistic locking** — read responses include `record_version`/`etag`; writes include `expected_version` (see §16)

---

## 7. Data Flow Rules

### 7.1 Billing Validation Data Flow

```
User selects Individual + Service + Date Range
    ↓
System loads published Billing Guidelines Engine (Billing Rule Pack)
    ↓
System reads billing data from iCM modules (with record_version)
    ↓
Billing engine runs checks:
  • Eligibility & Enrollment
  • Authorization Matching
  • Attendance & Service Verification
  • Billing Code & Rate Validation
  • Limits & Conflict Check
  • Documentation Sufficiency
    ↓
System generates:
  • Billing validation report
  • Billing alerts (hard stops + warnings)
  • Clean claim draft (or flagged items)
  • Required documentation checklist
    ↓
User reviews and resolves issues
    ↓
User selects items to apply / submit (Selective Apply)
    ↓
Selected items → iCM Billing Modules (via API, with idempotency key + expected_version)
    ↓
Billing Run record created (audit trail)
```

### 7.2 Cross-System Connection (with CaseManagement.AI)

```
CaseManagement.AI (Compliance Engine)  →  Writes to iCM Modules  →  Billing.AI reads from iCM Modules
```

- They are **NOT directly connected**
- They share data through **iCM's stored module records**
- CaseManagement.AI ensures compliance; Billing.AI ensures billability
- A service can be compliant but not yet billable (e.g., missing documentation)
- A service can be billable but flagged for compliance (unusual but possible)

### 7.3 Absolute Rules

| Rule | Enforced By |
|---|---|
| No automatic claim submission | Both engines |
| No automatic billing code changes | Both engines |
| No automatic rate modifications | Both engines |
| All billing writes require explicit user confirmation | Review & Apply modal |
| All billing actions are audited | Audit log system |
| All billing writes include idempotency keys | API layer |

---

## 8. Data Source Priority Order

| Priority | Source | Authority Level | Description |
|---|---|---|---|
| **1 (Highest)** | Existing iCM billing records | Authoritative | Production data from iCM — always preferred |
| **2** | Prior applied billing outputs (stored in iCM) | Authoritative | AI-validated billing data that has been reviewed and applied |
| **3** | Draft billing items (Draft Store) | Not authoritative | AI-generated billing suggestions not yet applied; shown as "Draft" |
| **4 (Lowest)** | Manual user entry | Always allowed | User can always override any billing field with manual input |

---

## 9. Module Mapping Reference

### 9.1 Billing Engine → iCM Modules

#### Data Sources (READ)

| Workflow Step | iCM Source Module |
|---|---|
| Eligibility & Enrollment | Waiver Enrollment + MA Status + LOC + Demographics |
| Authorization Matching | Authorization + Service Plan |
| Attendance & Service | Attendance + Visit Summary + Billable Activity Notes |
| Code & Rate Validation | Rate Tables + Services + Modifier Configuration |
| Limits & Conflicts | Utilization Records + Scheduled Services + Claims History |
| Documentation Sufficiency | Progress Notes + BAN + PCP + Monitoring Forms |

#### Outputs (WRITE — user-confirmed)

| Output | iCM Target Module |
|---|---|
| Validated billing record | Billable Activity Note Module |
| Claim draft | Claims Module |
| Billing alerts/tasks | Workflow Manager |
| Documentation deficiency flags | Workflow Manager |
| Authorization utilization updates | Utilization Module |
| Revenue metrics | General Ledger / Reporting |

---

## 10. User Roles & Permissions

| Role | Engine 1 (Billing Guidelines) | Engine 2 (Billing Runtime Agents) |
|---|---|---|
| **Admin** | Full access + Engine Builder + Publish | Full access + Agent CRUD |
| **Billing Staff** | View only | Runtime Agent execution + Apply |
| **Case Manager** | No access | View billing status for their individuals (read-only) |
| **Billing Supervisor** | View only | Override approval + Bulk Apply + audit review |

### Admin-Only Actions
- Create / publish Billing Guidelines Engines
- Create / edit / delete Runtime Agents (versioned)
- Configure apply modes
- Access engine version history
- Upgrade agents to new engine versions
- Configure billing rules and rate tables

### Billing Staff Actions
- Run Billing Agents for individuals
- Review & Apply billing outputs to iCM
- Override billing validation results (with justification)
- Save Apply Plans for later
- View billing dashboards

### Billing Supervisor Actions
- All Billing Staff actions
- Review & approve Apply Plans from other users
- Supervisor Bulk Apply
- Review override history
- Access denial trend reports

---

## 11. UI/UX Specification

### 11.1 Application Routes

| Route | Page | Description |
|---|---|---|
| `/` | Billing Dashboard | Revenue metrics, clean claim rate, pending items |
| `/dashboard` | Operational Dashboard | Stats, quick actions, alerts |
| `/billing` | Billing Agent Platform | Engine & Agent management |
| `/billing/engines` | Billing Engine Dashboard | View/manage billing engines |
| `/billing/engines/new` | Create Billing Engine | 5-step admin builder |
| `/billing/agent/new` | Create Billing Runtime Agent | Agent configuration |
| `/billing/agent/:id` | Agent Detail | Individual agent view |
| `/billing/agent/:id/run` | Billing Run Workflow | 8-step billing execution |
| `/billing/engine/:id/history` | Engine History | Version history + runs |
| `/billing/claims` | Claims Queue | Pending/submitted/denied claims |
| `/billing/denials` | Denial Management | Denial tracking + appeals |
| `/billing/reports` | Revenue Reports | Financial reporting dashboard |

### 11.2 Key UI Components

| Component | Location | Purpose |
|---|---|---|
| `BillingDashboard` | Home | Revenue metrics, clean claim rate, aging |
| `BillingEngineBuilder` | Admin | 5-step billing rule pack builder |
| `BillingRunWorkflow` | Runtime | 8-step billing validation workflow |
| `ClaimsQueue` | Billing | Claim status management |
| `DenialManager` | Billing | Denial tracking and appeals |
| `RevenueReports` | Reports | Financial dashboards and trends |
| `ReviewApplyModal` | Both | 3-panel selective apply (same pattern as CaseManagement.AI) |

### 11.3 Data Source Transparency

Every billing execution screen displays a banner:
> "All billing checks pull real-time data from iCM modules."

Each step shows its specific data source (e.g., "Pulls from Authorization + Service Plan").

---

## 12. API Integration Contracts

### 12.1 Required API Endpoints

#### Individual APIs
```
GET    /api/individuals                              → List all individuals
GET    /api/individuals/{id}                         → Individual detail
GET    /api/individuals/{id}/billing-summary         → Billing summary for individual
```

#### Billing Data Read APIs (all responses include `record_version` / `etag`)
```
GET    /api/individuals/{id}/services                → Active services
GET    /api/individuals/{id}/authorizations          → Service authorizations
GET    /api/individuals/{id}/attendance              → Attendance records
GET    /api/individuals/{id}/billable-notes          → Billable Activity Notes
GET    /api/individuals/{id}/visit-summaries         → Visit summaries
GET    /api/individuals/{id}/progress-notes          → Progress notes
GET    /api/individuals/{id}/utilization             → Utilization / cap data
GET    /api/individuals/{id}/claims                  → Claims history
GET    /api/individuals/{id}/scheduled-services      → Scheduled services (for conflicts)
GET    /api/individuals/{id}/waiver-enrollment       → Waiver enrollment status
GET    /api/individuals/{id}/ma-status               → MA status verification
GET    /api/individuals/{id}/loc                     → Level of Care
GET    /api/individuals/{id}/pcp                     → PCP data
GET    /api/individuals/{id}/monitoring-forms        → Monitoring forms
GET    /api/rate-tables                              → Rate tables
GET    /api/rate-tables/{service_code}               → Rate for specific service
GET    /api/modifier-rules                           → Modifier configuration
```

#### Billing Write APIs (All require `source` metadata + `idempotency_key` + `expected_version`)
```
POST   /api/individuals/{id}/billable-notes          → Create validated BAN
POST   /api/individuals/{id}/claims                  → Create claim draft
PATCH  /api/individuals/{id}/claims/{claim_id}       → Update claim
POST   /api/individuals/{id}/claims/{claim_id}/submit → Submit claim
POST   /api/individuals/{id}/workflow-tasks          → Create billing task
PATCH  /api/individuals/{id}/utilization             → Update utilization tracking
POST   /api/individuals/{id}/billing-alerts          → Create billing alert
```

#### Billing Engine APIs
```
GET    /api/billing-engines                          → List engines
GET    /api/billing-engines/{id}                     → Engine detail + billing rule packs
POST   /api/billing-engines                          → Create engine (admin)
POST   /api/billing-engines/{id}/publish             → Publish engine (admin)
GET    /api/billing-engines/{id}/versions            → Version history
POST   /api/billing-engines/{id}/test-run            → Preview run (admin)
```

#### Billing Runtime Agent APIs
```
GET    /api/billing-agents                           → List agents
POST   /api/billing-agents                           → Create agent
GET    /api/billing-agents/{id}                      → Agent detail
PATCH  /api/billing-agents/{id}/upgrade              → Upgrade to new engine version (admin)
POST   /api/billing-agents/{id}/run                  → Execute billing run
GET    /api/billing-agents/{id}/runs                 → Run history
```

#### Claims & Revenue APIs
```
GET    /api/claims                                   → Claims queue (filterable)
GET    /api/claims/{id}                              → Claim detail
POST   /api/claims/{id}/appeal                       → File appeal for denied claim
GET    /api/denials                                  → Denial tracking
GET    /api/revenue/summary                          → Revenue summary metrics
GET    /api/revenue/clean-claim-rate                 → Clean claim rate trends
GET    /api/revenue/aging                            → Aging report
```

### 12.2 Write Payload Metadata (Required on ALL billing writes)

```typescript
interface BillingWriteMetadata {
  source: 'billing_engine' | 'manual';
  session_id: string;
  engine_id?: string;
  engine_version?: string;
  agent_id?: string;
  agent_version?: string;
  billing_confidence?: number;     // 0-1 scale
  user_confirmed: boolean;        // Always true for writes
  user_id: string;
  timestamp: string;              // ISO 8601
  idempotency_key: string;        // Unique per write attempt (see §16)
  expected_version?: string;      // For optimistic locking (see §16)
}
```

---

## 13. Security & Audit Requirements

### 13.1 Billing Audit Log Entry

Every billing write must generate:

```typescript
interface BillingAuditLogEntry {
  id: string;
  user_id: string;
  timestamp: string;
  session_id: string;
  action: 'billing_apply' | 'billing_override' | 'claim_submit' | 'claim_appeal' | 'billing_draft_save';
  source: 'billing_engine';
  modules_updated: string[];
  modules_skipped: string[];
  items_applied: { module: string; field: string; value: string }[];
  overrides: BillingOverrideRecord[];
  individual_id: string;
  service_code: string;
  claim_amount: number;
  idempotency_key: string;
}
```

### 13.2 Financial Controls

| Control | Requirement |
|---|---|
| **Dual approval** | Claims over configurable threshold require supervisor approval |
| **Rate validation** | System validates rates against published rate tables; manual rate entry requires justification |
| **Billing code lock** | Published billing codes cannot be modified; new codes require new engine version |
| **Retroactive billing** | Configurable lookback window (default: 365 days); beyond requires admin override |

### 13.3 Data Retention

| Data Type | Retention Rule |
|---|---|
| Billing runs | Permanent audit trail |
| Claims records | Permanent (regulatory requirement) |
| Override records | Permanent, linked to billing run |
| Billing audit log | Permanent, immutable |
| Denial records | Permanent |
| Rate table history | Permanent (versioned) |

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
| **AI Service** | LLM integration for billing manual parsing, rule extraction, documentation analysis |
| **Claims Engine** | Claim generation, validation, submission pipeline |
| **Audit Service** | Immutable billing audit log storage |
| **File Storage** | PDF upload for billing manual parsing |
| **Rate Table Service** | Rate lookup, modifier application, unit conversion |
| **Idempotency Service** | Deduplication layer for billing write operations (see §16) |

### 14.3 File Structure (Frontend)

```
src/
├── components/
│   ├── billing/              # Billing-specific components
│   │   ├── engine-builder/   # Billing Guidelines Engine builder steps (Admin)
│   │   ├── runtime/          # Billing Runtime Agent execution (8 steps)
│   │   ├── claims/           # Claims queue, detail, appeals
│   │   ├── denials/          # Denial management
│   │   └── reports/          # Revenue reporting dashboards
│   ├── dashboard/            # Dashboard cards (Revenue, Claims, Aging)
│   ├── layout/               # App header, sidebar, layout
│   └── ui/                   # shadcn component library
├── contexts/
│   └── RoleContext.tsx        # Admin vs Billing Staff vs Case Manager
├── pages/                    # Route-level page components
├── types/
│   ├── billing.ts            # Billing engine, agent, run types + mock data
│   └── billingRulePack.ts    # Billing rule pack types
└── hooks/                    # Custom hooks
```

---

## 15. Versioning, Pinning, and Upgrade Rules

### 15.1 Billing Engine Versioning

| Rule | Detail |
|---|---|
| **Immutability** | A published Billing Engine version is frozen. No edits allowed. |
| **New version on edit** | Editing a published engine automatically creates a new draft version |
| **Version history** | Each engine maintains a version chain: v1.0 → v2.0 → v3.0… |
| **Rate table versioning** | Rate changes create new engine versions; old rates preserved for historical billing |
| **Archival** | Old versions can be archived but never deleted |

### 15.2 Runtime Agent Pinning

| Rule | Detail |
|---|---|
| **Version pinning** | Each Billing Agent is pinned to the engine version it was created with |
| **No auto-upgrade** | Publishing a new engine version does NOT auto-upgrade existing agents |
| **Upgrade notification** | Admins receive notification when new engine version available |
| **Manual upgrade** | Admin explicitly upgrades an agent to new engine version |
| **Agent versioning** | Upgrading creates a new agent version |
| **Audit trail** | Every upgrade is logged |

---

## 16. Idempotency & Write Safety

### 16.1 Idempotency Keys

| Requirement | Detail |
|---|---|
| **Every billing write endpoint** must accept an `idempotency_key` | Prevents duplicate billing/claim entries on retry/double-click |
| **Key format** | UUID v4, generated client-side when user clicks "Apply" |
| **Server behavior** | If key exists, return original response without creating duplicate |
| **Key TTL** | 24 hours |

### 16.2 Billing-Specific Deduplication

| Module | Dedup Rule |
|---|---|
| Billable Activity Notes | Match on (individual_id + service_code + date_of_service + start_time + end_time) |
| Claims | Match on (individual_id + service_code + date_of_service + billing_code + units) |
| Utilization updates | Upsert — update existing record for same auth period |
| Billing tasks | Create-if-not-exists within 14 days |

### 16.3 Optimistic Locking

Same pattern as CaseManagement.AI (see §16.4 of CaseManagement.AI PRD).

---

## 17. Billing Rule Pack Quality & Testing

### 17.1 Admin Preview / Test Harness

| Requirement | Detail |
|---|---|
| **Preview run** | Admin can run a billing rule pack against sample billing data before publishing |
| **Sample data** | System provides pre-built sample billing scenarios |
| **Preview output** | Shows: which rules fire, which pass, which fail, with citations |
| **No side effects** | Preview runs do NOT create billing runs or claims |

### 17.2 Rate Table Validation

| Requirement | Detail |
|---|---|
| **Rate completeness** | Every mapped service must have a rate entry |
| **Date coverage** | Rate table must cover the engine's effective date range |
| **Modifier validation** | All referenced modifiers must have defined rules |
| **Cross-state validation** | Flag if rates differ significantly from state fee schedule |

### 17.3 Citations

Same requirements as CaseManagement.AI — every billing rule must have a citation to the source billing manual.

---

## 18. Non-Functional Requirements

### 18.1 Performance Targets

| Metric | Target |
|---|---|
| Billing validation run | Complete 8-step workflow within **15 seconds** per individual/service |
| Claims batch processing | Process 100 claims within **5 minutes** |
| Rate table lookup | < 500ms |
| Review & Apply modal load | < 2 seconds |
| Dashboard load | < 3 seconds |
| Revenue report generation | < 10 seconds |

### 18.2 Availability & SLA

| Metric | Target |
|---|---|
| Uptime | 99.9% |
| Planned downtime | Weekends only, with 48-hour notice |
| Data backup | Daily, with 30-day retention |
| Disaster recovery | RTO: 4 hours, RPO: 1 hour |

---

## 19. Glossary

| Term | Definition |
|---|---|
| **BAN** | Billable Activity Note — the primary billing documentation record in iCM |
| **Billing Code** | HCPCS/CPT procedure code used for Medicaid billing |
| **Billing Engine** | A published set of billing rule packs for a specific state/program |
| **Billing Rule Pack** | All billing rules, rates, codes, and validation logic for a single service |
| **Billing Run** | A single execution of billing validation for one individual + service + date range |
| **Clean Claim** | A claim that passes all validation checks and is ready for submission |
| **Claims Scrubbing** | Process of validating claims against billing rules before submission |
| **Denial** | A claim rejected by the payer; tracked for appeal and trend analysis |
| **Hard Stop** | A billing rule violation that blocks claim submission |
| **IDD** | Intellectual and Developmental Disabilities |
| **iCM** | iCareManager — the pre-existing case management platform |
| **LOC** | Level of Care |
| **MA** | Medical Assistance (Medicaid) |
| **Modifier** | A code appended to billing codes to provide additional information (e.g., GT for telehealth) |
| **Rate Table** | Published rates per service code, per state/program |
| **Runtime Agent** | An execution wrapper that applies a published Billing Engine to individuals |
| **Selective Apply** | User picks which validated billing items to write to iCM |
| **Warning** | A billing rule issue that alerts but does not block submission |

---

## Appendix A: Relationship to CaseManagement.AI

Billing.AI and CaseManagement.AI are **separate but complementary** systems:

| Aspect | CaseManagement.AI | Billing.AI |
|---|---|---|
| **Focus** | Service compliance & documentation | Billing compliance & revenue cycle |
| **Primary users** | Case Managers | Billing Staff |
| **Engine 1 purpose** | Parse compliance guidelines | Parse billing manuals |
| **Engine 2 purpose** | Validate service delivery compliance | Validate billing & claims |
| **Shared infrastructure** | iCM API Gateway, audit system, role framework | Same |
| **Data flow** | CM validates service → writes to iCM → Billing reads from iCM to validate billing | One-directional dependency |

> A service must be **compliant** (CaseManagement.AI) before it can be **billed** (Billing.AI). The billing engine can optionally check compliance status as a prerequisite.
