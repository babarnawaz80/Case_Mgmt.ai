# Feature Inventory — CaseManagement.AI
> Generated: 2026-05-24 · Commit `89442e4` · Live at https://casemanagement-ai.web.app

---

## 1. ROUTES

All routes are defined in `src/App.tsx`. Role requirements shown where applicable.

### Public Routes
| Route | Component | Notes |
|-------|-----------|-------|
| `/login` | `Login.tsx` | Email/password login with demo user tiles |
| `/platform-login` | `PlatformLogin.tsx` | SuperAdmin-only login portal |
| `/care-assistant/:token` | Cloud Function (HTML) | Standalone Care Companion chat (no auth) |

### Core App Routes (any authenticated user)
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index.tsx` | Root — redirects to `/dashboard` |
| `/dashboard` | `Dashboard.tsx` | Main case manager dashboard |
| `/my-work` | `MyWork.tsx` | Task queue + AI brief for logged-in user |
| `/my-profile` | `MyProfile.tsx` | Profile photo upload + personal info |
| `/messages` | `Messages.tsx` | Internal messaging / team chat |
| `/people` | `PeopleSupported.tsx` | People list with search & filters |
| `/people/new` | `NewParticipantIntake.tsx` | New participant intake form |
| `/people/:id/echart` | `EChart.tsx` | Individual eChart hub with tiles |
| `/people/:id/profile` | `PersonProfile.tsx` | Individual profile with AI companion link |
| `/people/:id/case-management` | `PersonCaseManagement.tsx` | Case management details |
| `/people/:id/care-plan` | `PersonCarePlan.tsx` | Care plan list |
| `/people/:id/care-plan/:planId` | `PersonCarePlanDetail.tsx` | Care plan detail + AI draft |
| `/people/:id/contact-note` | `ContactNote.tsx` | Contact notes list + new note |
| `/people/:id/progress-note` | `PersonProgressNote.tsx` | Progress notes list |
| `/people/:id/progress-note/:noteId` | `PersonProgressNoteDetail.tsx` | Progress note detail / edit |
| `/people/:id/monitoring-form` | `PersonMonitoringForm.tsx` | Monitoring forms list |
| `/people/:id/monitoring-form/:formId` | `PersonMonitoringFormDetail.tsx` | Monitoring form detail |
| `/people/:id/visit-summary` | `PersonVisitSummary.tsx` | Visit summaries list |
| `/people/:id/visit-summary/schedule` | `PersonVisitScheduler.tsx` | Schedule a visit |
| `/people/:id/visit-summary/document` | `PersonVisitDocument.tsx` | Document a visit |
| `/people/:id/visit-summary/:visitId` | `PersonVisitSummaryDetail.tsx` | Visit summary detail |
| `/people/:id/eligibility-verification` | `PersonEligibilityVerification.tsx` | Eligibility checks list |
| `/people/:id/eligibility-verification/:id` | `PersonEligibilityVerificationDetail.tsx` | Eligibility detail |
| `/people/:id/assessments` | `PersonAssessments.tsx` | Assessments list |
| `/people/:id/assessments/new` | `PersonAssessmentForm.tsx` | New assessment |
| `/people/:id/assessments/:id` | `PersonAssessmentForm.tsx` | Assessment detail |
| `/people/:id/referrals` | `PersonReferrals.tsx` | Referrals list for individual |
| `/people/:id/referrals/new` | `PersonReferralForm.tsx` | New referral form |
| `/people/:id/referrals/:referralId` | `PersonReferralDetail.tsx` | Referral detail |
| `/people/:id/documents` | `PersonDocuments.tsx` | Documents for individual |
| `/people/:id/incident-reporting` | `PersonIncidentReporting.tsx` | Incidents list |
| `/people/:id/incident-reporting/:id` | `PersonIncidentReportingDetail.tsx` | Incident detail |
| `/people/:id/incident-report/new` | `PersonIncidentReportNew.tsx` | New incident report |
| `/people/:id/monitors-baselines` | `PersonMonitorsBaselines.tsx` | Health monitors & baselines |
| `/people/:id/care-tracker` | `PersonCareTracker.tsx` | Care tracker module |
| `/people/:id/employment` | `PersonEmployment.tsx` | Employment info |
| `/people/:id/trainings` | `PersonTrainings.tsx` | Training records |
| `/people/:id/service-plan` | `PersonServicePlan.tsx` | Service plan (ISP) |
| `/people/:id/esignature` | `PersonESignature.tsx` | E-signature capture |
| `/people/:id/care-team` | `PersonCareTeam.tsx` | Care team members |
| `/people/:id/workflow-manager` | `PersonWorkflowManager.tsx` | Workflows for individual |
| `/people/:id/workflow-manager/:id` | `PersonWorkflowDetail.tsx` | Workflow detail |
| `/people/:id/module/:slug` | `PersonModule.tsx` | Generic module placeholder |
| `/people/:id/managed-documents` | `PersonManagedDocuments.tsx` | Managed documents |
| `/people/:id/meeting-notes` | `PersonMeetingNotesPage.tsx` | Meeting notes |
| `/incidents` | `IncidentsGlobal.tsx` | All incidents (cross-org) |
| `/referrals` | `AllReferrals.tsx` | All referrals (cross-org) |
| `/documents` | `Documents.tsx` | Document vault |
| `/documentation` | `Documentation.tsx` | Documentation hub |
| `/documentation/contact-notes` | `Documentation.tsx` | Contact notes tab |
| `/documentation/progress-notes` | `Documentation.tsx` | Progress notes tab |
| `/documentation/visit-summaries` | `Documentation.tsx` | Visit summaries tab |
| `/documentation/monitoring-forms` | `Documentation.tsx` | Monitoring forms tab |
| `/documentation/assessments` | `Documentation.tsx` | Assessments tab |
| `/documentation/care-plans` | `Documentation.tsx` | Care plans tab |
| `/documentation/referrals` | `Documentation.tsx` | Referrals tab |
| `/progress-note` | `ProgressNoteLog.tsx` | Global progress note log |
| `/progress-note/new` | `ProgressNoteNew.tsx` | New progress note |
| `/visit-summary` | `VisitSummaryLog.tsx` | Global visit summary log |
| `/visit-summary/new` | `VisitSummaryNew.tsx` | New visit summary |
| `/oncall-log` | `OnCallLog.tsx` | On-call log |
| `/oncall-log/new` | `OnCallLogNew.tsx` | New on-call entry |
| `/workflows` | `WorkflowsGlobal.tsx` | All workflows |
| `/leads` | `Leads.tsx` | Leads / prospect list |
| `/leads/new` | `LeadForm.tsx` | New lead form |
| `/leads/:id` | `LeadDetail.tsx` | Lead detail |
| `/reports` | `Reports.tsx` | Reports hub |
| `/billing` | `BillingHub.tsx` | Billing hub |
| `/virtual-visit` | `VirtualVisit.tsx` | Virtual visit interface |
| `/messages` | `Messages.tsx` | Messaging center |
| `/audit-log` | `AuditLogPage.tsx` | Audit trail log |

### Supervisor Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/supervisor` | `SupervisorDashboard.tsx` | Supervisor dashboard |
| `/supervisor/review/:docId` | `SupervisorReviewNote.tsx` | Note review & approval |
| `/supervisor/compliance` | `SupervisorCompliance.tsx` | Compliance overview |
| `/exceptions` | `ExceptionsQueue.tsx` | Exceptions queue |

### Admin-Only Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/settings` | `Settings.tsx` | Settings hub |
| `/settings/users` | `SettingsUsers.tsx` | User management |
| `/settings/users/:userId` | `SettingsUserDetail.tsx` | User detail & permissions |
| `/settings/roles` | `SettingsUsers.tsx` | Roles & permissions tab |
| `/settings/organization` | `SettingsOrganization.tsx` | Org settings |
| `/settings/programs` | `SettingsPrograms.tsx` | Program management |
| `/settings/ai` | `SettingsAI.tsx` | AI configuration |
| `/settings/integrations` | `SettingsIntegrations.tsx` | Integrations |
| `/settings/security` | `SettingsSecurity.tsx` | Security & MFA |
| `/settings/notifications` | `SettingsNotifications.tsx` | Notification settings |
| `/settings/billing-config` | `SettingsBillingConfig.tsx` | Billing configuration |
| `/settings/ai-usage` | `SettingsAIUsage.tsx` | AI usage & credits |
| `/settings/import` | `SettingsImport.tsx` | Data import wizard |
| `/admin/assessment-builder` | `AssessmentBuilderList.tsx` | Assessment template builder |
| `/admin/assessment-builder/new` | `AssessmentBuilderEdit.tsx` | New assessment template |
| `/admin/workflow-templates` | `WorkflowTemplatesAdmin.tsx` | Workflow template admin |
| `/admin/provider-directory` | `ProviderDirectory.tsx` | Provider directory |

### AI / Compliance Engine Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/platform` | `LifePlanBoard.tsx` | Compliance engine dashboard |
| `/lifeplan/guidelines-engines` | `ComplianceEngineDashboard.tsx` | Guidelines engines list |
| `/lifeplan/guidelines-library/new` | `RuleLibraryBuilder.tsx` | Build rule library |
| `/lifeplan/agent/new` | `RuntimeAgentBuilder.tsx` | Build runtime agent |
| `/lifeplan/agent/new/layer2` | `Layer2AgentBuilder.tsx` | Layer 2 agent builder |
| `/lifeplan/agent/:id` | `LifePlanAgentDetail.tsx` | Agent detail |
| `/lifeplan/agent/:id/drafts` | `AgentDraftRuns.tsx` | Agent draft runs |
| `/lifeplan/agent/:id/monitoring` | `AgentMonitoringSettings.tsx` | Agent monitoring |
| `/lifeplan/engine/:id/history` | `EngineHistory.tsx` | Engine run history |

### SuperAdmin Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/superadmin` | `SuperAdminOrganizations.tsx` | Organizations list |
| `/superadmin/users` | `SuperAdminUsers.tsx` | All platform users |
| `/superadmin/billing` | `SuperAdminBilling.tsx` | Billing overview |
| `/superadmin/ai-usage` | `SuperAdminAIUsage.tsx` | AI usage across all orgs |
| `/superadmin/support` | `SuperAdminSupport.tsx` | Support tickets |
| `/superadmin/health` | `SuperAdminHealth.tsx` | System health |

---

## 2. CLOUD FUNCTIONS

Single exported Gen 2 function `api` running Express. Base URL: `https://us-central1-casemanagement-ai.cloudfunctions.net/api`

| Method | Endpoint | What it does |
|--------|----------|--------------|
| GET | `/health` | Health check — returns `{status:"ok"}` |
| POST | `/api/chat` | AI chat — sends message to Gemini, returns streamed reply. Used by dashboard, My Work, person profile, ambient scribe, report builder |
| POST | `/api/ai-forms/progress-note-prefill` | Reads individual's recent notes/visits from Firestore and returns AI-prefilled progress note fields |
| POST | `/api/billing/create-checkout-session` | Creates Stripe Checkout session for credit pack purchase (falls back to sandbox simulation if Stripe key missing) |
| POST | `/api/billing/create-portal-session` | Creates Stripe billing portal session for subscription management |
| POST | `/api/billing/webhook` | Receives Stripe webhook events, updates org credit balance in Firestore |
| POST | `/api/billing/simulate-webhook` | Dev/sandbox: simulates a Stripe payment_intent.succeeded event |
| GET | `/care-assistant/:token` | Serves standalone HTML chat page for Care Companion (public, no auth) |
| POST | `/care-assistant/:token/message` | Handles companion chat message — validates token, calls Gemini, detects [URGENT] flag |
| POST | `/care-assistant/:token/end-session` | Marks companion session ended in Firestore |
| POST | `/api/agents/pcp-renewal/run` | Runs PCP/ISP renewal compliance agent — reads 12 months of data, generates draft renewal document via Gemini |

### Firestore Triggers (exported)
| Trigger | Function | What it does |
|---------|----------|--------------|
| `onNewBillingClaim` | `billing-claims.ts` | Fires on new billing claim write — validates and processes claim |
| `onWorkflowTaskDailyCheck` | `billing-claims.ts` | Scheduled daily — checks overdue workflow tasks |

---

## 3. FIRESTORE COLLECTIONS

| Collection | Key Fields | Used By |
|------------|------------|---------|
| `users` | uid, email, firstName, lastName, role, organizationId, isActive, status, photoURL, lastLogin | Auth, Settings Users, My Profile |
| `organizations` | name, credit_balance, ai_features_enabled, daily_credit_limit, plan, stripe_customer_id, stripe_subscription_id | AI Usage, Billing, SuperAdmin |
| `individuals` | first_name, last_name, dob, medicaid_id, enrollment_status, program, risk_score, assigned_case_manager_uid, companion_token, companion_link_active, organizationId | People list, eChart, Companion |
| `contact_notes` | individualId, organizationId, author_uid, author_name, activityType, date, purpose, status, createdAt | Contact Notes tab |
| `progress_notes` | individualId, organizationId, author_uid, progressDate, activityType, billable, detailsOfActivity, status, ai_generated | Progress Notes tab |
| `visit_summaries` | individualId, organizationId, visitDate, visitType, author_uid, summary, status | Visit Summaries tab |
| `monitoring_forms` | individualId, organizationId, reviewType, reviewDate, sections, createdAt | Monitoring Forms tab |
| `care_plans` | individualId, organizationId, goals, startDate, reviewDate, status, ai_drafted | Care Plan tab |
| `incidents` | individualId, organizationId, incidentDate, type, severity, description, reportedBy, status | Incidents |
| `incident_reports` | individualId, organizationId, reportDate, type, narrative, witnesses, status | Incident reporting detail |
| `referrals` | individualId, organizationId, referralDate, referralType, agency, status, submittedBy | Referrals |
| `workflow_tasks` | individualId, organizationId, assigned_to, title, due_date, priority, status, type | My Work |
| `workflows` | name, steps, status, organizationId, created_by | Workflow manager |
| `eligibility_verifications` | individualId, organizationId, verifiedDate, payorName, coverageStatus, expirationDate | Eligibility |
| `billing_claims` | individualId, organizationId, serviceDate, procedureCode, units, amount, status, submitted_by | Billing Hub |
| `audit_log` | action, userId, userEmail, targetId, targetType, organizationId, timestamp, details | Audit Log page |
| `notifications` | userId, organizationId, type, title, body, read, createdAt | Notification bell |
| `conversations/{id}/messages` | senderId, senderName, body, createdAt, read | Messages center |
| `ai_usage_log` | organizationId, userId, feature, inputTokens, outputTokens, creditsUsed, timestamp | AI Usage page |
| `credit_history` | organizationId, amount, type, description, timestamp | AI Usage credits history |
| `managed_documents` | individualId, organizationId, name, category, uploadedBy, storageUrl, createdAt | Documents |
| `oncall_log` | organizationId, userId, startTime, endTime, notes, status | On-call log |
| `trainings` | userId, organizationId, title, completedDate, expirationDate, status | Trainings |
| `config/{doc}` | Global config flags | System config |
| `user_invitations` | email, role, organizationId, status, invitedBy, createdAt | (legacy — replaced by direct creation) |

---

## 4. AI FEATURES

All AI calls go through `functions/src/services/ai.ts` which uses **Gemini via Google GenAI SDK** (primary) with Vertex AI fallback.

| Feature | Model | File(s) |
|---------|-------|---------|
| Dashboard AI chat assistant | `gemini-flash-latest` | `src/pages/Index.tsx` → `/api/chat` |
| Person profile AI panel | `gemini-flash-latest` | `src/components/icm/PersonAIPanel.tsx` → `/api/chat` |
| Global AI panel (sidebar) | `gemini-flash-latest` | `src/components/icm/AIPanel.tsx` → `/api/chat` |
| Ambient listening / scribe | `gemini-flash-latest` | `src/components/ambient/AmbientFlowV2.tsx` → `/api/chat` |
| Scribe flow modal | `gemini-flash-latest` | `src/components/ambient/ScribeFlowModal.tsx` → `/api/chat` |
| My Work AI brief | `gemini-flash-latest` | `src/pages/MyWork.tsx` → `/api/chat` |
| Report builder AI | `gemini-flash-latest` | `src/pages/ReportBuilder.tsx` → `/api/chat` |
| Billing AI chat panel | `gemini-flash-latest` | `src/components/billing/AiChatPanel.tsx` → `/api/chat` |
| Progress note AI prefill | `gemini-flash-latest` | `functions/src/api/ai-forms.ts` |
| Care Companion bot | `gemini-flash-latest` | `functions/src/api/companion.ts` |
| PCP/ISP renewal agent | `gemini-flash-latest` | `functions/src/api/agents.ts` |
| Care plan AI draft | `gemini-flash-latest` | Called via `/api/chat` from `PersonCarePlanDetail.tsx` |

> **No Anthropic/Claude calls exist anywhere in the codebase.** All AI is Gemini.

---

## 5. SCREENS BUILT

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Email/password auth with demo user quick-select tiles |
| Dashboard | `/dashboard` | Summary cards, AI chat, recent activity, task overview, caseload analytics |
| My Work | `/my-work` | Live Firestore task queue, AI daily brief, overdue badge, task detail modal |
| My Profile | `/my-profile` | Profile photo upload (Firebase Storage), personal info edit |
| People Supported | `/people` | Filterable list of individuals from Firestore `individuals` collection |
| New Participant Intake | `/people/new` | Multi-step intake form for new participant enrollment |
| eChart | `/people/:id/echart` | eChart hub with module tiles (Contact Notes, Progress Notes, etc.) |
| Person Profile | `/people/:id/profile` | Full profile with companion link, risk score, AI panel |
| Contact Note | `/people/:id/contact-note` | List + create contact notes; saves to Firestore |
| Progress Note | `/people/:id/progress-note` | Progress note list with AI prefill banner |
| Progress Note Detail | `/people/:id/progress-note/:id` | Edit/sign progress note |
| Monitoring Form | `/people/:id/monitoring-form` | Monitoring form list + add review |
| Monitoring Form Detail | `/people/:id/monitoring-form/:id` | Form detail with sections |
| Visit Summary | `/people/:id/visit-summary` | Visit summaries list |
| Visit Document | `/people/:id/visit-summary/document` | Document a visit |
| Eligibility Verification | `/people/:id/eligibility-verification` | Eligibility checks list |
| Care Plan | `/people/:id/care-plan` | Care plans list |
| Care Plan Detail | `/people/:id/care-plan/:id` | Goals, AI draft generation |
| Assessments | `/people/:id/assessments` | Assessments list |
| Assessment Form | `/people/:id/assessments/new` | Fill out assessment |
| Referrals | `/people/:id/referrals` | Referrals for individual |
| Referral Form | `/people/:id/referrals/new` | Submit new referral |
| All Referrals | `/referrals` | Cross-individual referral queue |
| Incidents | `/people/:id/incident-reporting` | Incident list per individual |
| Incident Report New | `/people/:id/incident-report/new` | New incident report form |
| All Incidents | `/incidents` | Global incident queue |
| Documents | `/people/:id/documents` | Document vault per individual |
| Workflow Manager | `/people/:id/workflow-manager` | Workflows for individual |
| Messages | `/messages` | Team messaging with Firestore real-time |
| Documentation Hub | `/documentation` | Tabbed documentation center |
| Reports | `/reports` | Reports hub with AI builder |
| Billing Hub | `/billing` | Billing module hub |
| Supervisor Dashboard | `/supervisor` | Supervisor review queue |
| Supervisor Compliance | `/supervisor/compliance` | Compliance overview |
| Settings: Users | `/settings/users` | Live Firestore user list, suspend/deactivate actions |
| Settings: User Detail | `/settings/users/:id` | User profile, permissions, state enrollments |
| Settings: Organization | `/settings/organization` | Org info and configuration |
| Settings: AI | `/settings/ai` | AI model settings, enable/disable |
| Settings: AI Usage | `/settings/ai-usage` | Credit balance, usage chart, pricing packs |
| Settings: Security | `/settings/security` | Password change, MFA enrollment |
| Settings: Integrations | `/settings/integrations` | Third-party integration toggles |
| Settings: Billing Config | `/settings/billing-config` | Billing settings |
| Settings: Import | `/settings/import` | CSV/Excel import wizard |
| Platform (Compliance Engine) | `/platform` | LifePlan compliance engine board |
| Compliance Engine Dashboard | `/lifeplan/guidelines-engines` | Engine list and status |
| Runtime Agent Builder | `/lifeplan/agent/new` | Build and configure compliance agents |
| Care Companion | `/care-assistant/:token` | Public standalone chat for individuals |
| SuperAdmin: Organizations | `/superadmin` | All org accounts |
| SuperAdmin: Billing | `/superadmin/billing` | Revenue overview |
| SuperAdmin: AI Usage | `/superadmin/ai-usage` | AI consumption across orgs |
| SuperAdmin: Health | `/superadmin/health` | System health checks |
| Audit Log | `/audit-log` | Full audit trail |

---

## 6. SCREENS NOT CONNECTED (Mock/Hardcoded Data)

These screens render UI but pull from static data files or `demoToast()` instead of live Firestore:

| Screen | What's mocked | What's needed |
|--------|---------------|---------------|
| `SettingsUserDetail.tsx` | Uses `getUser(userId)` from static `src/data/settings.ts` — not Firestore | Replace with Firestore `users/{userId}` read |
| `PersonAssessments.tsx` / `PersonAssessmentForm.tsx` | Assessment data from local state / mock | Wire to `assessments` Firestore collection |
| `PersonEligibilityVerificationDetail.tsx` | Static eligibility data | Wire to `eligibility_verifications` collection |
| `PersonCarePlan.tsx` / `PersonCarePlanDetail.tsx` | Partial — AI draft calls real function but save is `demoSuccess()` | Wire save to `care_plans` Firestore |
| `PersonCareTracker.tsx` | Hardcoded tracker entries | Wire to `care_tracker` collection or embed in `individuals` doc |
| `PersonServicePlan.tsx` | Static ISP fields | Wire to `individuals` doc or separate `service_plans` collection |
| `PersonTrainings.tsx` | Mock training records | Wire to `trainings` Firestore collection |
| `PersonEmployment.tsx` | Hardcoded employment data | Wire to `individuals.employment` or separate collection |
| `PersonVisitDocument.tsx` | `demoSuccess()` on save | Wire to `visit_summaries` Firestore |
| `VirtualVisit.tsx` | Simulated video call UI | Requires WebRTC or Daily.co / Zoom SDK integration |
| `Reports.tsx` / `ReportBuilder.tsx` | AI-generated text but no Firestore-backed saved reports | Wire save to `reports` collection |
| `WorkflowsGlobal.tsx` | Mixed — reads some Firestore but workflow templates are static | Wire to `workflows` + `workflow_tasks` collections fully |
| `ComplianceEngineDashboard.tsx` | UI builder only — no engine runs stored in Firestore | Wire to `compliance_engines` + `compliance_runs` collections |
| `SettingsIntegrations.tsx` | Toggle states are local only | Wire to `organizations` doc `integrations` field |
| `SettingsPrograms.tsx` | Program list is static | Wire to `programs` Firestore collection |
| `SettingsOrganization.tsx` | Org fields — `demoSuccess()` on save | Wire save to `organizations/{orgId}` |
| `SuperAdminOrganizations.tsx` | Mock org list | Wire to `organizations` collection query |
| `NewParticipantIntake.tsx` | `demoSuccess()` on submit | Wire to `individuals` collection create |
| `PersonMeetingNotesPage.tsx` | Hardcoded meeting notes | Wire to `meeting_notes` collection |
| `PersonManagedDocuments.tsx` | Mock document list | Wire to `managed_documents` collection |
| `OnCallLog.tsx` / `OnCallLogNew.tsx` | `demoSuccess()` on save | Wire to `oncall_log` Firestore collection |

---

## 7. FEATURES PARTIALLY BUILT (UI exists, Cloud Function missing or incomplete)

| Feature | UI Status | Backend Status | Gap |
|---------|-----------|----------------|-----|
| **Monitoring Form AI prefill** | UI has "AI Suggested" badges | No `/api/ai-forms/monitoring-form-prefill` endpoint | Need to add endpoint in `ai-forms.ts` |
| **Care Plan AI draft** | Button exists, calls `/api/chat` | Works but no dedicated prefill endpoint | `/api/ai-forms/care-plan-draft` not implemented separately |
| **Visit Summary AI autofill** | No AI banner on visit summary | No prefill function | Need `/api/ai-forms/visit-summary-prefill` |
| **Assessment AI assist** | No AI on assessment form | No function | Need `/api/ai-forms/assessment-prefill` |
| **Stripe billing** | Checkout + portal UI fully built | Function deployed but `STRIPE_SECRET_KEY` env var not set in Firebase | Set env var: `firebase functions:config:set stripe.secret_key="sk_..."` |
| **Compliance engine runs** | Builder UI complete | Agent only implements PCP renewal — no general engine runner | Need generic compliance run execution endpoint |
| **Supervisor note review** | Review page exists | No Firestore write for approval/rejection | Wire `approved`/`rejected` status update |
| **E-signature** | `PersonESignature.tsx` exists | No signing backend — no crypto/audit trail | Need DocuSign/HelloSign or custom signing function |
| **Virtual visit** | UI frame exists | No WebRTC or video SDK wired | Integrate Daily.co or Twilio Video |
| **Daily brief generation** | My Work AI chat calls `/api/chat` | Works but no scheduled auto-generation | Add scheduled Cloud Function for daily brief push |
| **Audit log writes** | `auditService.ts` exists | Reads work; writes may not fire on all actions | Audit triggers not wired to all CRUD operations |
| **MFA / SMS 2FA** | `SettingsSecurity.tsx` has enrollment UI | `src/lib/mfa.ts` exists but SMS provider (Twilio) not configured | Configure Firebase Phone Auth or Twilio |

---

## 8. STRIPE INTEGRATION

### What's Built ✅
- `functions/src/api/billing.ts` — full Stripe SDK integration
- `createCheckoutSession` — creates real Stripe Checkout session for 4 credit packs (Starter $50, Standard $100, Professional $250, Agency $500)
- `createPortalSession` — creates Stripe billing portal for subscription management
- `stripeWebhook` — handles `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.*` events; updates `organizations.credit_balance` in Firestore
- `simulateWebhookPayment` — sandbox simulation for testing without real Stripe
- `BillingCheckoutSimulation.tsx` — sandbox checkout UI (redirects when no Stripe key)
- `BillingPortalSimulation.tsx` — sandbox portal UI
- `SettingsAIUsage.tsx` — calls checkout session endpoint, renders 4 pricing cards

### What's Missing ❌
- **`STRIPE_SECRET_KEY` environment variable not set** in Firebase Functions config — all live purchases fall through to sandbox simulation
- **`STRIPE_WEBHOOK_SECRET` not set** — webhook signature verification will fail on live events
- **No Stripe product/price IDs configured** — checkout uses `price_data` inline (works, but not linked to Stripe Dashboard products)
- **No subscription billing** — credits are one-time purchase only; no recurring subscription logic
- **No failed payment handling** — no UI for failed card, retry, or dunning
- **No invoice / receipt display** — no `/billing/invoices` screen

### To activate live Stripe:
```bash
firebase functions:config:set stripe.secret_key="sk_live_..." stripe.webhook_secret="whsec_..."
firebase deploy --only functions
```

---

## 9. MISSING FEATURES (Planned in PRD but not yet built)

Based on `PRD-CaseManagementAI.md` and `PRD-BillingAgent.md`:

### CaseManagement.AI PRD — Not Built
| PRD Feature | Section | Status |
|-------------|---------|--------|
| **Draft Store** — persist AI drafts to Firestore before user confirms | §4.4 | ❌ Not built — drafts live in React state only |
| **Transcript Retention** — 30-day rolling window of ambient session transcripts | §4.5 | ❌ No transcript storage in Firestore |
| **SDoH / Barriers module** — structured Social Determinants of Health capture | §9.1C | ❌ No dedicated SDoH screen or collection |
| **Risk & Safety module** — AI-flagged risk events with severity ladder | §9.1D | ❌ Risk score exists on individual doc but no dedicated module |
| **Service Authorization drafts** — AI drafts auth requests from chat | §9.1G | ❌ Not built |
| **Utilization / Caps warning** — AI warns when approaching service cap | §9.1H | ❌ Not built |
| **ISP/PCP Update module** — structured ISP update flow | §9.1E | ❌ No ISP update screen (service plan is partial stub) |
| **Compliance engine general runner** — run any compliance engine (not just PCP) | §5.5 | ❌ Only PCP renewal agent built |
| **Override system** — user can override any compliance finding | §5.7 | ❌ UI exists partially, no Firestore write |
| **Data source transparency badges** — show exactly which Firestore doc each AI field came from | §11.3 | ❌ AI prefill banner exists but no field-level provenance |
| **Suggestions vs Draft Note distinction** | §11.5 | ❌ All AI output treated as draft; suggestion mode not differentiated |
| **Push notifications** — mobile push for task alerts | §10 | ❌ Web notifications only via bell icon; no push |
| **Offline mode** — Firestore persistence allows offline read | §3 | ⚠️ Partial — Firestore offline persistence enabled but no offline-first UX |

### Billing.AI PRD — Not Built
| PRD Feature | Section | Status |
|-------------|---------|--------|
| **Billing Guidelines Engine Builder** — admin UI to define billing rules | §4.2 | ❌ Not built |
| **Billing Runtime Agents** — claim scrubbing, authorization checks, ERA posting | §5.2 | ❌ Not built |
| **8-Step Billing Workflow** — fixed sequence (eligibility → auth → service → claim → scrub → submit → ERA → close) | §5.3 | ❌ Not built |
| **EDI 837 claim generation** | §5.3 step 5 | ❌ Not built |
| **ERA / 835 parsing** | §5.3 step 7 | ❌ Not built |
| **Clearinghouse integration** (Change Healthcare / Availity) | §6.2 | ❌ Not built |
| **Prior authorization agent** | §5.2 | ❌ Not built |
| **Remittance reconciliation** | §5.2 | ❌ Not built |
| **Claim denial management workflow** | §5.5 | ❌ Not built |
| **Billing compliance override system** | §5.6 | ❌ Not built |

### General Infrastructure — Missing
| Feature | Status |
|---------|--------|
| Email delivery (SendGrid / Postmark) for notifications | ❌ Not configured |
| SMS / Twilio for MFA and alerts | ❌ Not configured |
| HIPAA BAA-compliant logging pipeline | ⚠️ Audit log writes to Firestore but no external SIEM |
| Automated nightly backup / export | ❌ Not built |
| Rate limiting on Cloud Functions | ❌ No middleware rate limiting |
| Unit / integration tests | ❌ No test files found |
| CI/CD pipeline (GitHub Actions) | ❌ No `.github/workflows` |

---

*Inventory complete as of commit `89442e4` · 2026-05-24*
