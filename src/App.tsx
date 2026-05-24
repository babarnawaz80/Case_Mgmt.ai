import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignDocument from "./pages/SignDocument";
import CareAssistant from "./pages/CareAssistant";
import PersonCommunicationsLog from "./pages/PersonCommunicationsLog";
import SmartNoteAttacher from "./components/SmartNoteAttacher";
import { CommandPalette } from "@/components/CommandPalette";
import Dashboard from "./pages/Dashboard";
import PeopleSupported from "./pages/PeopleSupported";
import NewParticipantIntake from "./pages/NewParticipantIntake";
import LifePlanBoard from "./pages/LifePlanBoard";
import LifePlanAgentDetail from "./pages/LifePlanAgentDetail";
import RuleLibraryBuilder from "./pages/RuleLibraryBuilder";
import ComplianceEngineDashboard from "./pages/ComplianceEngineDashboard";
import RuntimeAgentBuilder from "./pages/RuntimeAgentBuilder";
import Layer2AgentBuilder from "./pages/Layer2AgentBuilder";
import EngineHistory from "./pages/EngineHistory";
import AgentDraftRuns from "./pages/AgentDraftRuns";
import AgentMonitoringSettings from "./pages/AgentMonitoringSettings";
import EChart from "./pages/EChart";
import PersonMonitorsBaselines from "./pages/PersonMonitorsBaselines";
import ContactNote from "./pages/ContactNote";
import ContactNoteDetail from "./pages/ContactNoteDetail";

import PersonModule from "./pages/PersonModule";
import PersonCaseManagement from "./pages/PersonCaseManagement";
import PersonCarePlan from "./pages/PersonCarePlan";
import PersonCarePlanDetail from "./pages/PersonCarePlanDetail";
import PersonMonitoringForm from "./pages/PersonMonitoringForm";
import PersonMonitoringFormDetail from "./pages/PersonMonitoringFormDetail";
import PersonVisitSummary from "./pages/PersonVisitSummary";
import PersonVisitSummaryDetail from "./pages/PersonVisitSummaryDetail";
import PersonVisitScheduler from "./pages/PersonVisitScheduler";
import PersonVisitDocument from "./pages/PersonVisitDocument";
import ExceptionsQueue from "./pages/ExceptionsQueue";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import SupervisorReviewNote from "./pages/SupervisorReviewNote";
import SupervisorCompliance from "./pages/SupervisorCompliance";
import PersonEligibilityVerification from "./pages/PersonEligibilityVerification";
import PersonEligibilityVerificationDetail from "./pages/PersonEligibilityVerificationDetail";
import PersonProgressNote from "./pages/PersonProgressNote";
import PersonProgressNoteDetail from "./pages/PersonProgressNoteDetail";
import ProgressNoteNew from "./pages/ProgressNoteNew";
import ProgressNoteLog from "./pages/ProgressNoteLog";
import VisitSummaryNew from "./pages/VisitSummaryNew";
import VisitSummaryLog from "./pages/VisitSummaryLog";
import OnCallLog from "./pages/OnCallLog";
import OnCallLogNew from "./pages/OnCallLogNew";
import PersonWorkflowManager from "./pages/PersonWorkflowManager";
import PersonWorkflowDetail from "./pages/PersonWorkflowDetail";
import WorkflowsGlobal from "./pages/WorkflowsGlobal";
import WorkflowTemplatesAdmin from "./pages/WorkflowTemplatesAdmin";
import PersonIncidentReporting from "./pages/PersonIncidentReporting";
import PersonIncidentReportingDetail from "./pages/PersonIncidentReportingDetail";
import PersonIncidentReportNew from "./pages/PersonIncidentReportNew";
import IncidentsGlobal from "./pages/IncidentsGlobal";
import MyWork from "./pages/MyWork";
import PersonProfile from "./pages/PersonProfile";
import PersonFaceSheet from "./pages/PersonFaceSheet";
import PlatformHub from "./pages/platform/PlatformHub";
import GuidelinesEnginesList from "./pages/platform/GuidelinesEnginesList";
import NewEngineWizard from "./pages/platform/NewEngineWizard";
import EngineDetail from "./pages/platform/EngineDetail";
import RuleLibrary from "./pages/platform/RuleLibrary";
import AssessmentBuilderList from "./pages/admin/AssessmentBuilderList";
import AssessmentBuilderEdit from "./pages/admin/AssessmentBuilderEdit";
import PersonAssessments from "./pages/PersonAssessments";
import PersonAssessmentForm from "./pages/PersonAssessmentForm";
import PersonReferrals from "./pages/PersonReferrals";
import AllReferrals from "./pages/AllReferrals";
import PersonReferralForm from "./pages/PersonReferralForm";
import PersonReferralDetail from "./pages/PersonReferralDetail";
import Documentation from "./pages/Documentation";
import Settings from "./pages/Settings";
import SettingsUsers from "./pages/settings/SettingsUsers";
import SettingsUserDetail from "./pages/settings/SettingsUserDetail";
import SettingsOrganization from "./pages/settings/SettingsOrganization";
import SettingsPrograms from "./pages/settings/SettingsPrograms";
import SettingsAI from "./pages/settings/SettingsAI";
import SettingsIntegrations from "./pages/settings/SettingsIntegrations";
import SettingsSecurity from "./pages/settings/SettingsSecurity";
import SettingsNotifications from "./pages/settings/SettingsNotifications";
import SettingsBillingConfig from "./pages/settings/SettingsBillingConfig";
import SettingsAIUsage from "./pages/settings/SettingsAIUsage";
import BillingCheckoutSimulation from "./pages/settings/BillingCheckoutSimulation";
import BillingPortalSimulation from "./pages/settings/BillingPortalSimulation";
import SettingsImport from "./pages/settings/SettingsImport";
import MyProfile from "./pages/MyProfile";
import AIRoadmap from "./pages/AIRoadmap";
import ProviderDirectory from "./pages/admin/ProviderDirectory";
import AuditLogPage from "./pages/AuditLogPage";
import Reports from "./pages/Reports";
import ReportRunner from "./pages/ReportRunner";
import ReportBuilder from "./pages/ReportBuilder";
import AuditEvidence from "./pages/AuditEvidence";
import PersonDocuments from "./pages/PersonDocuments";
import Documents from "./pages/Documents";
import Leads from "./pages/Leads";
import LeadForm from "./pages/LeadForm";
import LeadDetail from "./pages/LeadDetail";
import Messages from "./pages/Messages";
import VirtualVisit from "./pages/VirtualVisit";
import BillingHub from "./pages/BillingHub";
import {
  PersonCareTracker,
  PersonCommunications,
  PersonServices,
  PersonEmployment,
  PersonManagedDocuments,
  PersonOnCall,
  PersonTrainings,
  PersonServicePlan,
  PersonBillingSummary,
  PersonESignature,
} from "./pages/PersonPlaceholders";
import PersonCareTeam from "./pages/PersonCareTeam";
import PersonMeetingNotesPage from "./pages/PersonMeetingNotesPage";
import NotFound from "./pages/NotFound";
import Companion from "./pages/Companion";
import MultiStateConfig from "./pages/MultiStateConfig";
import CommunicationsHub from "./pages/CommunicationsHub";
import AIGovernance from "./pages/AIGovernance";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PersonAuthorizations from "./pages/PersonAuthorizations";
import PersonAuthorizationNew from "./pages/PersonAuthorizationNew";
import AuthorizationTracker from "./pages/AuthorizationTracker";

// Billing module (copied verbatim from IDDBilling.ai)
import { BillingProvider } from "@/contexts/BillingContext";
import BillingLayout from "@/components/billing/BillingLayout";
import BAgentsDashboard from "@/pages/billing/AgentsDashboard";
import BEngines from "@/pages/billing/Engines";
import BEngineBuilder from "@/pages/billing/EngineBuilder";
import BEngineDetail from "@/pages/billing/EngineDetail";
import BAgentCreate from "@/pages/billing/AgentCreate";
import BAgentDetail from "@/pages/billing/AgentDetail";
import BAgentRun from "@/pages/billing/AgentRun";
import BAgentEdit from "@/pages/billing/AgentEdit";
import BAgentSettings from "@/pages/billing/AgentSettings";
import BIndividualsBillingHealth from "@/pages/billing/IndividualsBillingHealth";
import BIndividualDetail from "@/pages/billing/IndividualDetail";
import BRunsHistory from "@/pages/billing/RunsHistory";
import BClaimsManagement from "@/pages/billing/ClaimsManagement";
import BAuditLog from "@/pages/billing/AuditLog";
import BRevenueCycle from "@/pages/billing/RevenueCycle";
import { Navigate } from "react-router-dom";
import { PlatformAdminGuard } from "@/components/superadmin/PlatformAdminGuard";
import SuperAdminOrganizations from "./pages/superadmin/SuperAdminOrganizations";
import SuperAdminUsers from "./pages/superadmin/SuperAdminUsers";
import SuperAdminBilling from "./pages/superadmin/SuperAdminBilling";
import SuperAdminAIUsage from "./pages/superadmin/SuperAdminAIUsage";
import SuperAdminSupport from "./pages/superadmin/SuperAdminSupport";
import SuperAdminHealth from "./pages/superadmin/SuperAdminHealth";
import PlatformLogin from "./pages/PlatformLogin";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <RoleProvider>
      <BillingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SmartNoteAttacher />
        <BrowserRouter>
          <CommandPalette />
          <Routes>
            {/* ── PUBLIC ROUTES — no auth required ─────────────────────── */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/platform-login" element={<PlatformLogin />} />
            <Route path="/sign/:token" element={<SignDocument />} />
            <Route path="/companion/:token" element={<Companion />} />
            <Route path="/care-assistant/:linkToken" element={<CareAssistant />} />

            {/* ── AUTHENTICATED ROUTES — require login ──────────────────── */}
            <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/people/:id/communications-log" element={<ProtectedRoute><PersonCommunicationsLog /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/people" element={<ProtectedRoute><PeopleSupported /></ProtectedRoute>} />
            <Route path="/people/new" element={<ProtectedRoute><NewParticipantIntake /></ProtectedRoute>} />
            <Route path="/people/:id/profile" element={<ProtectedRoute><PersonProfile /></ProtectedRoute>} />
            <Route path="/people/:id/facesheet" element={<ProtectedRoute><PersonFaceSheet /></ProtectedRoute>} />
           <Route path="/people/:id/echart" element={<ProtectedRoute><EChart /></ProtectedRoute>} />
           <Route path="/people/:id/monitors-baselines" element={<ProtectedRoute><PersonMonitorsBaselines /></ProtectedRoute>} />
            <Route path="/people/:id/contact-note" element={<ProtectedRoute><ContactNote /></ProtectedRoute>} />
            <Route path="/people/:id/contact-note/:noteId" element={<ProtectedRoute><ContactNoteDetail /></ProtectedRoute>} />
            <Route path="/people/:id/case-management" element={<ProtectedRoute><PersonCaseManagement /></ProtectedRoute>} />
            <Route path="/people/:id/care-plan" element={<ProtectedRoute><PersonCarePlan /></ProtectedRoute>} />
            <Route path="/people/:id/care-plan/:planId" element={<ProtectedRoute><PersonCarePlanDetail /></ProtectedRoute>} />
            <Route path="/people/:id/monitoring-form" element={<ProtectedRoute><PersonMonitoringForm /></ProtectedRoute>} />
            <Route path="/people/:id/monitoring-form/:formId" element={<ProtectedRoute><PersonMonitoringFormDetail /></ProtectedRoute>} />
            <Route path="/people/:id/visit-summary" element={<ProtectedRoute><PersonVisitSummary /></ProtectedRoute>} />
            <Route path="/people/:id/visit-summary/schedule" element={<ProtectedRoute><PersonVisitScheduler /></ProtectedRoute>} />
            <Route path="/people/:id/visit-summary/document" element={<ProtectedRoute><PersonVisitDocument /></ProtectedRoute>} />
            <Route path="/exceptions" element={<ProtectedRoute requireRole="supervisor"><ExceptionsQueue /></ProtectedRoute>} />
            <Route path="/supervisor" element={<ProtectedRoute requireRole="supervisor"><SupervisorDashboard /></ProtectedRoute>} />
            <Route path="/supervisor/review/:docId" element={<ProtectedRoute requireRole="supervisor"><SupervisorReviewNote /></ProtectedRoute>} />
            <Route path="/supervisor/compliance" element={<ProtectedRoute requireRole="supervisor"><SupervisorCompliance /></ProtectedRoute>} />
            <Route path="/people/:id/visit-summary/:visitId" element={<ProtectedRoute><PersonVisitSummaryDetail /></ProtectedRoute>} />
            <Route path="/people/:id/eligibility-verification" element={<ProtectedRoute><PersonEligibilityVerification /></ProtectedRoute>} />
            <Route path="/people/:id/eligibility-verification/:verificationId" element={<ProtectedRoute><PersonEligibilityVerificationDetail /></ProtectedRoute>} />
            <Route path="/people/:id/progress-note" element={<ProtectedRoute><PersonProgressNote /></ProtectedRoute>} />
            <Route path="/people/:id/progress-note/:noteId" element={<ProtectedRoute><PersonProgressNoteDetail /></ProtectedRoute>} />
            <Route path="/progress-note" element={<ProtectedRoute><ProgressNoteLog /></ProtectedRoute>} />
            <Route path="/progress-note/new" element={<ProtectedRoute><ProgressNoteNew /></ProtectedRoute>} />
            <Route path="/visit-summary" element={<ProtectedRoute><VisitSummaryLog /></ProtectedRoute>} />
            <Route path="/visit-summary/new" element={<ProtectedRoute><VisitSummaryNew /></ProtectedRoute>} />
            <Route path="/oncall-log" element={<ProtectedRoute><OnCallLog /></ProtectedRoute>} />
            <Route path="/oncall-log/new" element={<ProtectedRoute><OnCallLogNew /></ProtectedRoute>} />
            <Route path="/oncall-log/:id" element={<ProtectedRoute><OnCallLog /></ProtectedRoute>} />
            <Route path="/people/:id/workflow-manager" element={<ProtectedRoute><PersonWorkflowManager /></ProtectedRoute>} />
            <Route path="/people/:id/workflow-manager/:workflowId" element={<ProtectedRoute><PersonWorkflowDetail /></ProtectedRoute>} />
            <Route path="/workflows" element={<ProtectedRoute><WorkflowsGlobal /></ProtectedRoute>} />
            <Route path="/admin/workflow-templates" element={<ProtectedRoute requireRole="admin"><WorkflowTemplatesAdmin /></ProtectedRoute>} />
            <Route path="/people/:id/incident-reporting" element={<ProtectedRoute><PersonIncidentReporting /></ProtectedRoute>} />
            <Route path="/people/:id/incident-reporting/:incidentId" element={<ProtectedRoute><PersonIncidentReportingDetail /></ProtectedRoute>} />
            <Route path="/people/:id/incident-report/new" element={<ProtectedRoute><PersonIncidentReportNew /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><IncidentsGlobal /></ProtectedRoute>} />
            <Route path="/my-work" element={<ProtectedRoute><MyWork /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/people/:id/module/:slug" element={<ProtectedRoute><PersonModule /></ProtectedRoute>} />
            <Route path="/modules/contact-note" element={<ProtectedRoute><ContactNote /></ProtectedRoute>} />
            <Route path="/lifeplan" element={<ProtectedRoute><Navigate to="/platform" replace /></ProtectedRoute>} />
            <Route path="/lifeplan/guidelines-engines" element={<ProtectedRoute><ComplianceEngineDashboard /></ProtectedRoute>} />
            <Route path="/lifeplan/guidelines-library/new" element={<ProtectedRoute><RuleLibraryBuilder /></ProtectedRoute>} />
            <Route path="/lifeplan/agent/new" element={<ProtectedRoute><RuntimeAgentBuilder /></ProtectedRoute>} />
            <Route path="/lifeplan/agent/new/layer2" element={<ProtectedRoute><Layer2AgentBuilder /></ProtectedRoute>} />
            <Route path="/lifeplan/engine/:id/history" element={<ProtectedRoute><EngineHistory /></ProtectedRoute>} />
            <Route path="/lifeplan/agent/:agentId/drafts" element={<ProtectedRoute><AgentDraftRuns /></ProtectedRoute>} />
            <Route path="/lifeplan/agent/:agentId/monitoring" element={<ProtectedRoute><AgentMonitoringSettings /></ProtectedRoute>} />
            <Route path="/lifeplan/agent/:id" element={<ProtectedRoute><LifePlanAgentDetail /></ProtectedRoute>} />
            <Route path="/admin/assessment-builder" element={<ProtectedRoute requireRole="admin"><AssessmentBuilderList /></ProtectedRoute>} />
            <Route path="/admin/assessment-builder/new" element={<ProtectedRoute requireRole="admin"><AssessmentBuilderEdit /></ProtectedRoute>} />
            <Route path="/admin/assessment-builder/:templateId/edit" element={<ProtectedRoute requireRole="admin"><AssessmentBuilderEdit /></ProtectedRoute>} />
            <Route path="/people/:id/assessments" element={<ProtectedRoute><PersonAssessments /></ProtectedRoute>} />
            <Route path="/people/:id/assessments/new" element={<ProtectedRoute><PersonAssessmentForm /></ProtectedRoute>} />
            <Route path="/people/:id/assessments/:assessmentId" element={<ProtectedRoute><PersonAssessmentForm /></ProtectedRoute>} />
            <Route path="/people/:id/referrals" element={<ProtectedRoute><PersonReferrals /></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><AllReferrals /></ProtectedRoute>} />
            <Route path="/people/:id/referrals" element={<ProtectedRoute><PersonReferrals /></ProtectedRoute>} />
            <Route path="/people/:id/referrals/new" element={<ProtectedRoute><PersonReferralForm /></ProtectedRoute>} />
            <Route path="/people/:id/referrals/:referralId" element={<ProtectedRoute><PersonReferralDetail /></ProtectedRoute>} />
            <Route path="/people/:id/documents" element={<ProtectedRoute><PersonDocuments /></ProtectedRoute>} />
            {/* ── AUTHORIZATION ROUTES ────────────────────────────────── */}
            <Route path="/people/:id/authorizations" element={<ProtectedRoute><PersonAuthorizations /></ProtectedRoute>} />
            <Route path="/people/:id/authorizations/new" element={<ProtectedRoute><PersonAuthorizationNew /></ProtectedRoute>} />
            <Route path="/authorizations" element={<ProtectedRoute><AuthorizationTracker /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/leads/new" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
            <Route path="/leads/:id/edit" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
            <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/contact-notes" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/progress-notes" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/visit-summaries" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/monitoring-forms" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/assessments" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/care-plans" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/referrals" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/meeting-notes" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/communications" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />

            {/* ── ADMIN-ONLY ROUTES ─────────────────────────────────────── */}
            <Route path="/settings" element={<ProtectedRoute requireRole="admin"><Settings /></ProtectedRoute>} />
            <Route path="/settings/users" element={<ProtectedRoute requireRole="admin"><SettingsUsers /></ProtectedRoute>} />
            <Route path="/settings/users/:userId" element={<ProtectedRoute requireRole="admin"><SettingsUserDetail /></ProtectedRoute>} />
            <Route path="/settings/roles" element={<ProtectedRoute requireRole="admin"><SettingsUsers /></ProtectedRoute>} />
            <Route path="/settings/organization" element={<ProtectedRoute requireRole="admin"><SettingsOrganization /></ProtectedRoute>} />
            <Route path="/settings/programs" element={<ProtectedRoute requireRole="admin"><SettingsPrograms /></ProtectedRoute>} />
            <Route path="/settings/ai" element={<ProtectedRoute requireRole="admin"><SettingsAI /></ProtectedRoute>} />
            <Route path="/settings/integrations" element={<ProtectedRoute requireRole="admin"><SettingsIntegrations /></ProtectedRoute>} />
            <Route path="/settings/security" element={<ProtectedRoute requireRole="admin"><SettingsSecurity /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute requireRole="admin"><SettingsNotifications /></ProtectedRoute>} />
            <Route path="/settings/billing-config" element={<ProtectedRoute requireRole="admin"><SettingsBillingConfig /></ProtectedRoute>} />
            <Route path="/settings/ai-usage" element={<ProtectedRoute requireRole="admin"><SettingsAIUsage /></ProtectedRoute>} />
            <Route path="/settings/billing/checkout-simulation" element={<ProtectedRoute requireRole="admin"><BillingCheckoutSimulation /></ProtectedRoute>} />
            <Route path="/settings/billing/portal-simulation" element={<ProtectedRoute requireRole="admin"><BillingPortalSimulation /></ProtectedRoute>} />
            <Route path="/settings/import" element={<ProtectedRoute requireRole="admin"><SettingsImport /></ProtectedRoute>} />
            <Route path="/ai-roadmap" element={<ProtectedRoute><AIRoadmap /></ProtectedRoute>} />
            <Route path="/admin/provider-directory" element={<ProtectedRoute requireRole="admin"><ProviderDirectory /></ProtectedRoute>} />
            <Route path="/admin/audit-log" element={<ProtectedRoute requireRole="admin"><AuditLogPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/reports/builder" element={<ProtectedRoute><ReportBuilder /></ProtectedRoute>} />
            <Route path="/reports/audit-evidence" element={<ProtectedRoute requireRole="admin"><AuditEvidence /></ProtectedRoute>} />
            <Route path="/reports/:reportId" element={<ProtectedRoute><ReportRunner /></ProtectedRoute>} />
            <Route path="/platform" element={<ProtectedRoute><PlatformHub /></ProtectedRoute>} />
            <Route path="/platform/guidelines-engines" element={<ProtectedRoute><GuidelinesEnginesList /></ProtectedRoute>} />
            <Route path="/platform/guidelines-engines/new" element={<ProtectedRoute requireRole="admin"><NewEngineWizard /></ProtectedRoute>} />
            <Route path="/platform/guidelines-engines/:engineId" element={<ProtectedRoute><EngineDetail /></ProtectedRoute>} />
            <Route path="/platform/rule-library" element={<ProtectedRoute><RuleLibrary /></ProtectedRoute>} />
            <Route path="/platform/agents" element={<ProtectedRoute><LifePlanBoard /></ProtectedRoute>} />
            <Route path="/platform/agents/new" element={<ProtectedRoute requireRole="admin"><RuntimeAgentBuilder /></ProtectedRoute>} />
            <Route path="/platform/agents/:agentId/runs" element={<ProtectedRoute><Layer2AgentBuilder /></ProtectedRoute>} />
            <Route path="/platform/agents/:agentId/drafts" element={<ProtectedRoute><AgentDraftRuns /></ProtectedRoute>} />
            <Route path="/platform/agents/:agentId/monitoring" element={<ProtectedRoute requireRole="admin"><AgentMonitoringSettings /></ProtectedRoute>} />

            {/* Per-person placeholder routes */}
            <Route path="/people/:id/care-tracker" element={<ProtectedRoute><PersonCareTracker /></ProtectedRoute>} />
            <Route path="/people/:id/meeting-notes" element={<ProtectedRoute><PersonMeetingNotesPage /></ProtectedRoute>} />
            <Route path="/people/:id/communications" element={<ProtectedRoute><PersonCommunications /></ProtectedRoute>} />
            <Route path="/people/:id/services" element={<ProtectedRoute><PersonServices /></ProtectedRoute>} />
            <Route path="/people/:id/employment" element={<ProtectedRoute><PersonEmployment /></ProtectedRoute>} />
            <Route path="/people/:id/assigned-staff" element={<ProtectedRoute><PersonCareTeam /></ProtectedRoute>} />
            <Route path="/people/:id/care-team" element={<ProtectedRoute><PersonCareTeam /></ProtectedRoute>} />
            <Route path="/people/:id/managed-documents" element={<ProtectedRoute><PersonManagedDocuments /></ProtectedRoute>} />
            <Route path="/people/:id/oncall" element={<ProtectedRoute><PersonOnCall /></ProtectedRoute>} />
            <Route path="/people/:id/trainings" element={<ProtectedRoute><PersonTrainings /></ProtectedRoute>} />
            <Route path="/people/:id/service-plan" element={<ProtectedRoute><PersonServicePlan /></ProtectedRoute>} />
            <Route path="/people/:id/billing" element={<ProtectedRoute><PersonBillingSummary /></ProtectedRoute>} />
            <Route path="/people/:id/esignature" element={<ProtectedRoute><PersonESignature /></ProtectedRoute>} />

            {/* Billing hub */}
            <Route path="/billing" element={<ProtectedRoute><BillingHub /></ProtectedRoute>} />

            <Route path="/lifeplan/agent/new/layer2" element={<Navigate to="/platform/agents" replace />} />
            <Route path="/admin/multi-state" element={<ProtectedRoute requireRole="admin"><MultiStateConfig /></ProtectedRoute>} />
            <Route path="/communications" element={<ProtectedRoute><CommunicationsHub /></ProtectedRoute>} />
            <Route path="/admin/ai-governance" element={<ProtectedRoute requireRole="admin"><AIGovernance /></ProtectedRoute>} />
            <Route path="/visit/:sessionId" element={<ProtectedRoute><VirtualVisit /></ProtectedRoute>} />

            {/* ── SUPER ADMIN — platform_admin role only ─────────────── */}
            <Route path="/super-admin" element={<PlatformAdminGuard><Navigate to="/super-admin/organizations" replace /></PlatformAdminGuard>} />
            <Route path="/super-admin/organizations" element={<PlatformAdminGuard><SuperAdminOrganizations /></PlatformAdminGuard>} />
            <Route path="/super-admin/users" element={<PlatformAdminGuard><SuperAdminUsers /></PlatformAdminGuard>} />
            <Route path="/super-admin/billing" element={<PlatformAdminGuard><SuperAdminBilling /></PlatformAdminGuard>} />
            <Route path="/super-admin/ai-usage" element={<PlatformAdminGuard><SuperAdminAIUsage /></PlatformAdminGuard>} />
            <Route path="/super-admin/support" element={<PlatformAdminGuard><SuperAdminSupport /></PlatformAdminGuard>} />
            <Route path="/super-admin/health" element={<PlatformAdminGuard><SuperAdminHealth /></PlatformAdminGuard>} />

            <Route path="/superadmin" element={<PlatformAdminGuard><SuperAdminOrganizations /></PlatformAdminGuard>} />
            <Route path="/superadmin/users" element={<PlatformAdminGuard><SuperAdminUsers /></PlatformAdminGuard>} />
            <Route path="/superadmin/billing" element={<PlatformAdminGuard><SuperAdminBilling /></PlatformAdminGuard>} />
            <Route path="/superadmin/ai-usage" element={<PlatformAdminGuard><SuperAdminAIUsage /></PlatformAdminGuard>} />
            <Route path="/superadmin/support" element={<PlatformAdminGuard><SuperAdminSupport /></PlatformAdminGuard>} />
            <Route path="/superadmin/health" element={<PlatformAdminGuard><SuperAdminHealth /></PlatformAdminGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </BillingProvider>
    </RoleProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
