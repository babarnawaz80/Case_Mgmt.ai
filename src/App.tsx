import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SmartNoteAttacher from "@/components/SmartNoteAttacher";
import { CommandPalette } from "@/components/CommandPalette";
import { RiskScoreProvider, useRiskScore } from "@/contexts/RiskScoreContext";
import { RiskScoreDrawer } from "@/components/icm/RiskScoreDrawer";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OrgSettingsProvider } from "@/contexts/OrgSettingsContext";
import { BillingProvider } from "@/contexts/BillingContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlatformAdminGuard } from "@/components/superadmin/PlatformAdminGuard";

// ── Lazy page imports (each becomes its own chunk) ──────────────────────────
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const SignDocument = lazy(() => import("./pages/SignDocument"));
const CareAssistant = lazy(() => import("./pages/CareAssistant"));
const PersonCommunicationsLog = lazy(() => import("./pages/PersonCommunicationsLog"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PeopleSupported = lazy(() => import("./pages/PeopleSupported"));
const NewParticipantIntake = lazy(() => import("./pages/NewParticipantIntake"));
const LifePlanBoard = lazy(() => import("./pages/LifePlanBoard"));
const LifePlanAgentDetail = lazy(() => import("./pages/LifePlanAgentDetail"));
const RuleLibraryBuilder = lazy(() => import("./pages/RuleLibraryBuilder"));
const ComplianceEngineDashboard = lazy(() => import("./pages/ComplianceEngineDashboard"));
const RuntimeAgentBuilder = lazy(() => import("./pages/RuntimeAgentBuilder"));
const Layer2AgentBuilder = lazy(() => import("./pages/Layer2AgentBuilder"));
const EngineHistory = lazy(() => import("./pages/EngineHistory"));
const AgentDraftRuns = lazy(() => import("./pages/AgentDraftRuns"));
const AgentMonitoringSettings = lazy(() => import("./pages/AgentMonitoringSettings"));
const EChart = lazy(() => import("./pages/EChart"));
const PersonMonitorsBaselines = lazy(() => import("./pages/PersonMonitorsBaselines"));
const ContactNote = lazy(() => import("./pages/ContactNote"));
const ContactNoteDetail = lazy(() => import("./pages/ContactNoteDetail"));
const PersonModule = lazy(() => import("./pages/PersonModule"));
const PersonCaseManagement = lazy(() => import("./pages/PersonCaseManagement"));
const PersonCarePlan = lazy(() => import("./pages/PersonCarePlan"));
const PersonCarePlanDetail = lazy(() => import("./pages/PersonCarePlanDetail"));
const PersonCarePlanBuilder = lazy(() => import("./pages/PersonCarePlanBuilder"));
const PersonMonitoringForm = lazy(() => import("./pages/PersonMonitoringForm"));
const PersonMonitoringFormDetail = lazy(() => import("./pages/PersonMonitoringFormDetail"));
const PersonVisitSummary = lazy(() => import("./pages/PersonVisitSummary"));
const PersonVisitSummaryDetail = lazy(() => import("./pages/PersonVisitSummaryDetail"));
const PersonVisitScheduler = lazy(() => import("./pages/PersonVisitScheduler"));
const PersonVisitDocument = lazy(() => import("./pages/PersonVisitDocument"));
const ExceptionsQueue = lazy(() => import("./pages/ExceptionsQueue"));
const SupervisorDashboard = lazy(() => import("./pages/SupervisorDashboard"));
const SupervisorReviewNote = lazy(() => import("./pages/SupervisorReviewNote"));
const SupervisorCompliance = lazy(() => import("./pages/SupervisorCompliance"));
const PersonEligibilityVerification = lazy(() => import("./pages/PersonEligibilityVerification"));
const PersonEligibilityVerificationDetail = lazy(() => import("./pages/PersonEligibilityVerificationDetail"));
const PersonProgressNote = lazy(() => import("./pages/PersonProgressNote"));
const PersonProgressNoteDetail = lazy(() => import("./pages/PersonProgressNoteDetail"));
const ProgressNoteNew = lazy(() => import("./pages/ProgressNoteNew"));
const ProgressNoteLog = lazy(() => import("./pages/ProgressNoteLog"));
const VisitSummaryNew = lazy(() => import("./pages/VisitSummaryNew"));
const VisitSummaryLog = lazy(() => import("./pages/VisitSummaryLog"));
const OnCallLog = lazy(() => import("./pages/OnCallLog"));
const OnCallLogNew = lazy(() => import("./pages/OnCallLogNew"));
const PersonWorkflowManager = lazy(() => import("./pages/PersonWorkflowManager"));
const PersonWorkflowDetail = lazy(() => import("./pages/PersonWorkflowDetail"));
const WorkflowsGlobal = lazy(() => import("./pages/WorkflowsGlobal"));
const WorkflowTemplatesAdmin = lazy(() => import("./pages/WorkflowTemplatesAdmin"));
const PersonIncidentReporting = lazy(() => import("./pages/PersonIncidentReporting"));
const PersonIncidentReportingDetail = lazy(() => import("./pages/PersonIncidentReportingDetail"));
const PersonIncidentReportNew = lazy(() => import("./pages/PersonIncidentReportNew"));
const IncidentsGlobal = lazy(() => import("./pages/IncidentsGlobal"));
const MyWork = lazy(() => import("./pages/MyWork"));
const PersonProfile = lazy(() => import("./pages/PersonProfile"));
const PersonFaceSheet = lazy(() => import("./pages/PersonFaceSheet"));
const PlatformHub = lazy(() => import("./pages/platform/PlatformHub"));
const GuidelinesEnginesList = lazy(() => import("./pages/platform/GuidelinesEnginesList"));
const NewEngineWizard = lazy(() => import("./pages/platform/NewEngineWizard"));
const EngineDetail = lazy(() => import("./pages/platform/EngineDetail"));
const RuleLibrary = lazy(() => import("./pages/platform/RuleLibrary"));
const ComplianceAgentsList = lazy(() => import("./pages/platform/ComplianceAgentsList"));
const NewAgentWizard = lazy(() => import("./pages/platform/NewAgentWizard"));
const AgentDetail = lazy(() => import("./pages/platform/AgentDetail"));
const AssessmentBuilderList = lazy(() => import("./pages/admin/AssessmentBuilderList"));
const AssessmentBuilderEdit = lazy(() => import("./pages/admin/AssessmentBuilderEdit"));
const PersonAssessments = lazy(() => import("./pages/PersonAssessments"));
const PersonAssessmentForm = lazy(() => import("./pages/PersonAssessmentForm"));
const PersonReferrals = lazy(() => import("./pages/PersonReferrals"));
const AllReferrals = lazy(() => import("./pages/AllReferrals"));
const PersonReferralForm = lazy(() => import("./pages/PersonReferralForm"));
const PersonReferralDetail = lazy(() => import("./pages/PersonReferralDetail"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Settings = lazy(() => import("./pages/Settings"));
const SettingsUsers = lazy(() => import("./pages/settings/SettingsUsers"));
const SettingsUserDetail = lazy(() => import("./pages/settings/SettingsUserDetail"));
const SettingsOrganization = lazy(() => import("./pages/settings/SettingsOrganization"));
const SettingsPrograms = lazy(() => import("./pages/settings/SettingsPrograms"));
const SettingsAI = lazy(() => import("./pages/settings/SettingsAI"));
const SettingsIntegrations = lazy(() => import("./pages/settings/SettingsIntegrations"));
const SettingsSecurity = lazy(() => import("./pages/settings/SettingsSecurity"));
const SettingsNotifications = lazy(() => import("./pages/settings/SettingsNotifications"));
const SettingsBillingConfig = lazy(() => import("./pages/settings/SettingsBillingConfig"));
const SettingsAIUsage = lazy(() => import("./pages/settings/SettingsAIUsage"));
const SettingsRiskScore = lazy(() => import("./pages/settings/SettingsRiskScore"));
const BillingCheckoutSimulation = lazy(() => import("./pages/settings/BillingCheckoutSimulation"));
const BillingPortalSimulation = lazy(() => import("./pages/settings/BillingPortalSimulation"));
const SettingsImport = lazy(() => import("./pages/settings/SettingsImport"));
const SettingsTemplates = lazy(() => import("./pages/settings/SettingsTemplates"));
const SettingsBilling = lazy(() => import("./pages/settings/SettingsBilling"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const AIRoadmap = lazy(() => import("./pages/AIRoadmap"));
const ProviderDirectory = lazy(() => import("./pages/admin/ProviderDirectory"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportRunner = lazy(() => import("./pages/ReportRunner"));
const ReportBuilder = lazy(() => import("./pages/ReportBuilder"));
const AuditEvidence = lazy(() => import("./pages/AuditEvidence"));
const PersonDocuments = lazy(() => import("./pages/PersonDocuments"));
const Documents = lazy(() => import("./pages/Documents"));
const Leads = lazy(() => import("./pages/Leads"));
const LeadForm = lazy(() => import("./pages/LeadForm"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const VirtualVisit = lazy(() => import("./pages/VirtualVisit"));
const BillingHub = lazy(() => import("./pages/BillingHub"));
const PersonCareTeam = lazy(() => import("./pages/PersonCareTeam"));
const PersonMeetingNotesPage = lazy(() => import("./pages/PersonMeetingNotesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Companion = lazy(() => import("./pages/Companion"));
const MultiStateConfig = lazy(() => import("./pages/MultiStateConfig"));
const CommunicationsHub = lazy(() => import("./pages/CommunicationsHub"));
const AIGovernance = lazy(() => import("./pages/AIGovernance"));
const PersonAuthorizations = lazy(() => import("./pages/PersonAuthorizations"));
const PersonAuthorizationNew = lazy(() => import("./pages/PersonAuthorizationNew"));
const AuthorizationTracker = lazy(() => import("./pages/AuthorizationTracker"));
const CompanionTranscripts = lazy(() => import("./pages/CompanionTranscripts"));
const PersonCareTracker = lazy(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("care-tracker") })));
const PersonCommunications = lazy(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("communications") })));
const PersonServices = lazy(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("services") })));
const PersonEmployment = lazy(() => import("./pages/PersonEmployment"));
const PersonManagedDocuments = lazy(() => import("./pages/PersonManagedDocuments"));
const PersonOnCall = lazy(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("oncall") })));
const PersonTrainings = lazy(() => import("./pages/PersonTrainings"));
const PersonServicePlan = lazy(() => import("./pages/PersonServicePlan"));
const PersonBillingSummary = lazy(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("billing") })));
const PersonESignature = lazy(() => import("./pages/PersonESignature"));

// Billing module pages
const BillingLayout = lazy(() => import("@/components/billing/BillingLayout")) as any;
const BAgentsDashboard = lazy(() => import("@/pages/billing/AgentsDashboard"));
const BEngines = lazy(() => import("@/pages/billing/Engines"));
const BEngineBuilder = lazy(() => import("@/pages/billing/EngineBuilder"));
const BEngineDetail = lazy(() => import("@/pages/billing/EngineDetail"));
const BAgentCreate = lazy(() => import("@/pages/billing/AgentCreate"));
const BAgentDetail = lazy(() => import("@/pages/billing/AgentDetail"));
const BAgentRun = lazy(() => import("@/pages/billing/AgentRun"));
const BAgentEdit = lazy(() => import("@/pages/billing/AgentEdit"));
const BAgentSettings = lazy(() => import("@/pages/billing/AgentSettings"));
const BIndividualsBillingHealth = lazy(() => import("@/pages/billing/IndividualsBillingHealth"));
const BIndividualDetail = lazy(() => import("@/pages/billing/IndividualDetail"));
const BRunsHistory = lazy(() => import("@/pages/billing/RunsHistory"));
const BClaimsManagement = lazy(() => import("@/pages/billing/ClaimsManagement"));
const BAuditLog = lazy(() => import("@/pages/billing/AuditLog"));
const BRevenueCycle = lazy(() => import("@/pages/billing/RevenueCycle"));
const SuperAdminOrganizations = lazy(() => import("./pages/superadmin/SuperAdminOrganizations"));
const SuperAdminUsers = lazy(() => import("./pages/superadmin/SuperAdminUsers"));
const SuperAdminBilling = lazy(() => import("./pages/superadmin/SuperAdminBilling"));
const SuperAdminAIUsage = lazy(() => import("./pages/superadmin/SuperAdminAIUsage"));
const SuperAdminSupport = lazy(() => import("./pages/superadmin/SuperAdminSupport"));
const SuperAdminHealth = lazy(() => import("./pages/superadmin/SuperAdminHealth"));
const PlatformLogin = lazy(() => import("./pages/PlatformLogin"));

// Static non-page imports (must not be lazy-loaded)

const queryClient = new QueryClient();

// Global risk drawer — needs to be inside RiskScoreProvider and BrowserRouter
function GlobalRiskDrawer() {
  const { isOpen, personId, personName, closeDrawer } = useRiskScore();
  return <RiskScoreDrawer isOpen={isOpen} personId={personId} personName={personName} onClose={closeDrawer} />;
}

// Page-level loading skeleton for Suspense fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64" aria-label="Loading page">
      <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <RoleProvider>
      <RiskScoreProvider>
      <OrgSettingsProvider>
      <BillingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SmartNoteAttacher />
        <BrowserRouter>
          <CommandPalette />
          <GlobalRiskDrawer />
          <Suspense fallback={<PageLoader />}>
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
           <Route path="/people/:id/face-sheet" element={<ProtectedRoute><PersonFaceSheet /></ProtectedRoute>} />
            <Route path="/people/:id/companion-transcripts" element={<ProtectedRoute><CompanionTranscripts /></ProtectedRoute>} />
           <Route path="/people/:id/monitors-baselines" element={<ProtectedRoute><PersonMonitorsBaselines /></ProtectedRoute>} />
            <Route path="/people/:id/contact-note" element={<ProtectedRoute><ContactNote /></ProtectedRoute>} />
            <Route path="/people/:id/contact-note/:noteId" element={<ProtectedRoute><ContactNoteDetail /></ProtectedRoute>} />
            <Route path="/people/:id/case-management" element={<ProtectedRoute><PersonCaseManagement /></ProtectedRoute>} />
            <Route path="/people/:id/care-plan" element={<ProtectedRoute><PersonCarePlan /></ProtectedRoute>} />
            <Route path="/people/:id/care-plan/new" element={<ProtectedRoute><PersonCarePlanBuilder /></ProtectedRoute>} />
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
            <Route path="/settings/risk-score" element={<ProtectedRoute requireRole="admin"><SettingsRiskScore /></ProtectedRoute>} />
            <Route path="/settings/integrations" element={<ProtectedRoute requireRole="admin"><SettingsIntegrations /></ProtectedRoute>} />
            <Route path="/settings/security" element={<ProtectedRoute requireRole="admin"><SettingsSecurity /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute requireRole="admin"><SettingsNotifications /></ProtectedRoute>} />
            <Route path="/settings/billing-config" element={<ProtectedRoute requireRole="admin"><SettingsBillingConfig /></ProtectedRoute>} />
            <Route path="/settings/ai-usage" element={<ProtectedRoute requireRole="admin"><SettingsAIUsage /></ProtectedRoute>} />
            <Route path="/settings/billing/checkout-simulation" element={<ProtectedRoute requireRole="admin"><BillingCheckoutSimulation /></ProtectedRoute>} />
            <Route path="/settings/billing/portal-simulation" element={<ProtectedRoute requireRole="admin"><BillingPortalSimulation /></ProtectedRoute>} />
            <Route path="/settings/import" element={<ProtectedRoute requireRole="admin"><SettingsImport /></ProtectedRoute>} />
            <Route path="/settings/templates" element={<ProtectedRoute requireRole="admin"><SettingsTemplates /></ProtectedRoute>} />
            <Route path="/settings/billing" element={<ProtectedRoute requireRole="admin"><SettingsBilling /></ProtectedRoute>} />
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
            <Route path="/platform/agents" element={<ProtectedRoute><ComplianceAgentsList /></ProtectedRoute>} />
            <Route path="/platform/agents/new" element={<ProtectedRoute requireRole="admin"><NewAgentWizard /></ProtectedRoute>} />
            <Route path="/platform/agents/:agentId" element={<ProtectedRoute><AgentDetail /></ProtectedRoute>} />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </BillingProvider>
      </OrgSettingsProvider>
      </RiskScoreProvider>
    </RoleProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
