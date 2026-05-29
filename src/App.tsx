import React, { lazy, Suspense } from "react";

/**
 * lazyWithRetry — wraps React.lazy so that when a dynamic import fails
 * (e.g. "Failed to fetch dynamically imported module" after a fresh deploy),
 * the page reloads once to pick up the new chunk filenames.
 * A sessionStorage flag prevents an infinite reload loop.
 */
function lazyWithRetry<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err) => {
      const key = `chunk-reload:${factory.toString().slice(0, 80)}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        // Return a never-resolving promise — reload will happen
        return new Promise(() => {}) as never;
      }
      throw err;
    })
  );
}
import { ICMSpinner } from "@/components/icm/ICMSpinner";
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
import { SessionTimeoutProvider } from "@/providers/SessionTimeoutProvider";
import { PasswordExpiryProvider } from "@/providers/PasswordExpiryProvider";
import { PlatformAdminGuard } from "@/components/superadmin/PlatformAdminGuard";

// ── Lazy page imports (each becomes its own chunk) ──────────────────────────
const Index = lazyWithRetry(() => import("./pages/Index"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const SignDocument = lazyWithRetry(() => import("./pages/SignDocument"));
const CareAssistant = lazyWithRetry(() => import("./pages/CareAssistant"));
const PersonCommunicationsLog = lazyWithRetry(() => import("./pages/PersonCommunicationsLog"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const PeopleSupported = lazyWithRetry(() => import("./pages/PeopleSupported"));
const NewParticipantIntake = lazyWithRetry(() => import("./pages/NewParticipantIntake"));
const LifePlanBoard = lazyWithRetry(() => import("./pages/LifePlanBoard"));
const LifePlanAgentDetail = lazyWithRetry(() => import("./pages/LifePlanAgentDetail"));
const RuleLibraryBuilder = lazyWithRetry(() => import("./pages/RuleLibraryBuilder"));
const ComplianceEngineDashboard = lazyWithRetry(() => import("./pages/ComplianceEngineDashboard"));
const RuntimeAgentBuilder = lazyWithRetry(() => import("./pages/RuntimeAgentBuilder"));
const Layer2AgentBuilder = lazyWithRetry(() => import("./pages/Layer2AgentBuilder"));
const EngineHistory = lazyWithRetry(() => import("./pages/EngineHistory"));
const AgentDraftRuns = lazyWithRetry(() => import("./pages/AgentDraftRuns"));
const AgentMonitoringSettings = lazyWithRetry(() => import("./pages/AgentMonitoringSettings"));
const EChart = lazyWithRetry(() => import("./pages/EChart"));
const PersonMonitorsBaselines = lazyWithRetry(() => import("./pages/PersonMonitorsBaselines"));
const ContactNote = lazyWithRetry(() => import("./pages/ContactNote"));
const ContactNoteDetail = lazyWithRetry(() => import("./pages/ContactNoteDetail"));
const PersonModule = lazyWithRetry(() => import("./pages/PersonModule"));
const PersonCaseManagement = lazyWithRetry(() => import("./pages/PersonCaseManagement"));
const PersonCarePlan = lazyWithRetry(() => import("./pages/PersonCarePlan"));
const PersonCarePlanDetail = lazyWithRetry(() => import("./pages/PersonCarePlanDetail"));
const PersonCarePlanBuilder = lazyWithRetry(() => import("./pages/PersonCarePlanBuilder"));
const PersonMonitoringForm = lazyWithRetry(() => import("./pages/PersonMonitoringForm"));
const PersonMonitoringFormDetail = lazyWithRetry(() => import("./pages/PersonMonitoringFormDetail"));
const PersonVisitSummary = lazyWithRetry(() => import("./pages/PersonVisitSummary"));
const PersonVisitSummaryDetail = lazyWithRetry(() => import("./pages/PersonVisitSummaryDetail"));
const PersonVisitScheduler = lazyWithRetry(() => import("./pages/PersonVisitScheduler"));
const PersonVisitDocument = lazyWithRetry(() => import("./pages/PersonVisitDocument"));
const ExceptionsQueue = lazyWithRetry(() => import("./pages/ExceptionsQueue"));
const SupervisorDashboard = lazyWithRetry(() => import("./pages/SupervisorDashboard"));
const SupervisorReviewNote = lazyWithRetry(() => import("./pages/SupervisorReviewNote"));
const SupervisorCompliance = lazyWithRetry(() => import("./pages/SupervisorCompliance"));
const PersonEligibilityVerification = lazyWithRetry(() => import("./pages/PersonEligibilityVerification"));
const PersonEligibilityVerificationDetail = lazyWithRetry(() => import("./pages/PersonEligibilityVerificationDetail"));
const PersonProgressNote = lazyWithRetry(() => import("./pages/PersonProgressNote"));
const PersonProgressNoteDetail = lazyWithRetry(() => import("./pages/PersonProgressNoteDetail"));
const ProgressNoteNew = lazyWithRetry(() => import("./pages/ProgressNoteNew"));
const ProgressNoteLog = lazyWithRetry(() => import("./pages/ProgressNoteLog"));
const VisitSummaryNew = lazyWithRetry(() => import("./pages/VisitSummaryNew"));
const VisitSummaryLog = lazyWithRetry(() => import("./pages/VisitSummaryLog"));
const MonitoringFormLog = lazyWithRetry(() => import("./pages/MonitoringFormLog"));
const OnCallLog = lazyWithRetry(() => import("./pages/OnCallLog"));
const OnCallLogNew = lazyWithRetry(() => import("./pages/OnCallLogNew"));
const PersonWorkflowManager = lazyWithRetry(() => import("./pages/PersonWorkflowManager"));
const PersonWorkflowDetail = lazyWithRetry(() => import("./pages/PersonWorkflowDetail"));
const WorkflowsGlobal = lazyWithRetry(() => import("./pages/WorkflowsGlobal"));
const WorkflowTemplatesAdmin = lazyWithRetry(() => import("./pages/WorkflowTemplatesAdmin"));
const PersonIncidentReporting = lazyWithRetry(() => import("./pages/PersonIncidentReporting"));
const PersonIncidentReportingDetail = lazyWithRetry(() => import("./pages/PersonIncidentReportingDetail"));
const PersonIncidentReportNew = lazyWithRetry(() => import("./pages/PersonIncidentReportNew"));
const IncidentsGlobal = lazyWithRetry(() => import("./pages/IncidentsGlobal"));
const MyWork = lazyWithRetry(() => import("./pages/MyWork"));
const PersonProfile = lazyWithRetry(() => import("./pages/PersonProfile"));
const PersonFaceSheet = lazyWithRetry(() => import("./pages/PersonFaceSheet"));
const PlatformHub = lazyWithRetry(() => import("./pages/platform/PlatformHub"));
const GuidelinesEnginesList = lazyWithRetry(() => import("./pages/platform/GuidelinesEnginesList"));
const NewEngineWizard = lazyWithRetry(() => import("./pages/platform/NewEngineWizard"));
const EngineDetail = lazyWithRetry(() => import("./pages/platform/EngineDetail"));
const RuleLibrary = lazyWithRetry(() => import("./pages/platform/RuleLibrary"));
const ComplianceAgentsList = lazyWithRetry(() => import("./pages/platform/ComplianceAgentsList"));
const NewAgentWizard = lazyWithRetry(() => import("./pages/platform/NewAgentWizard"));
const AgentDetail = lazyWithRetry(() => import("./pages/platform/AgentDetail"));
const BrainOrchestrator = lazyWithRetry(() => import("./pages/platform/BrainOrchestrator"));
const AssessmentBuilderList = lazyWithRetry(() => import("./pages/admin/AssessmentBuilderList"));
const AssessmentBuilderEdit = lazyWithRetry(() => import("./pages/admin/AssessmentBuilderEdit"));
const PersonAssessments = lazyWithRetry(() => import("./pages/PersonAssessments"));
const PersonAssessmentForm = lazyWithRetry(() => import("./pages/PersonAssessmentForm"));
const PersonReferrals = lazyWithRetry(() => import("./pages/PersonReferrals"));
const AllReferrals = lazyWithRetry(() => import("./pages/AllReferrals"));
const PersonReferralForm = lazyWithRetry(() => import("./pages/PersonReferralForm"));
const PersonReferralDetail = lazyWithRetry(() => import("./pages/PersonReferralDetail"));
const Documentation = lazyWithRetry(() => import("./pages/Documentation"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const SettingsUsers = lazyWithRetry(() => import("./pages/settings/SettingsUsers"));
const SettingsUserDetail = lazyWithRetry(() => import("./pages/settings/SettingsUserDetail"));
const SettingsOrganization = lazyWithRetry(() => import("./pages/settings/SettingsOrganization"));
const SettingsPrograms = lazyWithRetry(() => import("./pages/settings/SettingsPrograms"));
const SettingsAI = lazyWithRetry(() => import("./pages/settings/SettingsAI"));
const SettingsIntegrations = lazyWithRetry(() => import("./pages/settings/SettingsIntegrations"));
const SettingsSecurity = lazyWithRetry(() => import("./pages/settings/SettingsSecurity"));
const SettingsNotifications = lazyWithRetry(() => import("./pages/settings/SettingsNotifications"));
const SettingsBillingConfig = lazyWithRetry(() => import("./pages/settings/SettingsBillingConfig"));
const SettingsAIUsage = lazyWithRetry(() => import("./pages/settings/SettingsAIUsage"));
const SettingsRiskScore = lazyWithRetry(() => import("./pages/settings/SettingsRiskScore"));
const BillingCheckoutSimulation = lazyWithRetry(() => import("./pages/settings/BillingCheckoutSimulation"));
const BillingPortalSimulation = lazyWithRetry(() => import("./pages/settings/BillingPortalSimulation"));
const SettingsImport = lazyWithRetry(() => import("./pages/settings/SettingsImport"));
const SettingsTemplates = lazyWithRetry(() => import("./pages/settings/SettingsTemplates"));
const SettingsBilling = lazyWithRetry(() => import("./pages/settings/SettingsBilling"));
const MyProfile = lazyWithRetry(() => import("./pages/MyProfile"));
const AIRoadmap = lazyWithRetry(() => import("./pages/AIRoadmap"));
const ProviderDirectory = lazyWithRetry(() => import("./pages/admin/ProviderDirectory"));
const AuditLogPage = lazyWithRetry(() => import("./pages/AuditLogPage"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const ReportRunner = lazyWithRetry(() => import("./pages/ReportRunner"));
const ReportBuilder = lazyWithRetry(() => import("./pages/ReportBuilder"));
const AuditEvidence = lazyWithRetry(() => import("./pages/AuditEvidence"));
const PersonDocuments = lazyWithRetry(() => import("./pages/PersonDocuments"));
const Documents = lazyWithRetry(() => import("./pages/Documents"));
const Leads = lazyWithRetry(() => import("./pages/Leads"));
const LeadForm = lazyWithRetry(() => import("./pages/LeadForm"));
const LeadDetail = lazyWithRetry(() => import("./pages/LeadDetail"));
const Messages = lazyWithRetry(() => import("./pages/Messages"));
const VirtualVisit = lazyWithRetry(() => import("./pages/VirtualVisit"));
const BillingHub = lazyWithRetry(() => import("./pages/BillingHub"));
const PersonCareTeam = lazyWithRetry(() => import("./pages/PersonCareTeam"));
const PersonMeetingNotesPage = lazyWithRetry(() => import("./pages/PersonMeetingNotesPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Companion = lazyWithRetry(() => import("./pages/Companion"));
const MultiStateConfig = lazyWithRetry(() => import("./pages/MultiStateConfig"));
const CommunicationsHub = lazyWithRetry(() => import("./pages/CommunicationsHub"));
const AIGovernance = lazyWithRetry(() => import("./pages/AIGovernance"));
const PersonAuthorizations = lazyWithRetry(() => import("./pages/PersonAuthorizations"));
const PersonAuthorizationNew = lazyWithRetry(() => import("./pages/PersonAuthorizationNew"));
const AuthorizationTracker = lazyWithRetry(() => import("./pages/AuthorizationTracker"));
const CompanionTranscripts = lazyWithRetry(() => import("./pages/CompanionTranscripts"));
const PersonCareTracker = lazyWithRetry(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("care-tracker") })));
const PersonCommunications = lazyWithRetry(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("communications") })));
const PersonServices = lazyWithRetry(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("services") })));
const PersonEmployment = lazyWithRetry(() => import("./pages/PersonEmployment"));
const PersonMedications = lazyWithRetry(() => import("./pages/PersonMedications"));
const PersonManagedDocuments = lazyWithRetry(() => import("./pages/PersonManagedDocuments"));
const PersonOnCall = lazyWithRetry(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("oncall") })));
const PersonTrainings = lazyWithRetry(() => import("./pages/PersonTrainings"));
const PersonServicePlan = lazyWithRetry(() => import("./pages/PersonServicePlan"));
const PersonBillingSummary = lazyWithRetry(() => import("./pages/PersonPlaceholders").then(m => ({ default: m.makePersonPlaceholder("billing") })));
const PersonESignature = lazyWithRetry(() => import("./pages/PersonESignature"));

// Billing module pages
const BillingLayout = lazyWithRetry(() => import("@/components/billing/BillingLayout")) as any;
const BAgentsDashboard = lazyWithRetry(() => import("@/pages/billing/AgentsDashboard"));
const BEngines = lazyWithRetry(() => import("@/pages/billing/Engines"));
const BEngineBuilder = lazyWithRetry(() => import("@/pages/billing/EngineBuilder"));
const BEngineDetail = lazyWithRetry(() => import("@/pages/billing/EngineDetail"));
const BAgentCreate = lazyWithRetry(() => import("@/pages/billing/AgentCreate"));
const BAgentDetail = lazyWithRetry(() => import("@/pages/billing/AgentDetail"));
const BAgentRun = lazyWithRetry(() => import("@/pages/billing/AgentRun"));
const BAgentEdit = lazyWithRetry(() => import("@/pages/billing/AgentEdit"));
const BAgentSettings = lazyWithRetry(() => import("@/pages/billing/AgentSettings"));
const BIndividualsBillingHealth = lazyWithRetry(() => import("@/pages/billing/IndividualsBillingHealth"));
const BIndividualDetail = lazyWithRetry(() => import("@/pages/billing/IndividualDetail"));
const BRunsHistory = lazyWithRetry(() => import("@/pages/billing/RunsHistory"));
const BClaimsManagement = lazyWithRetry(() => import("@/pages/billing/ClaimsManagement"));
const BAuditLog = lazyWithRetry(() => import("@/pages/billing/AuditLog"));
const BRevenueCycle = lazyWithRetry(() => import("@/pages/billing/RevenueCycle"));
const SuperAdminOrganizations = lazyWithRetry(() => import("./pages/superadmin/SuperAdminOrganizations"));
const SuperAdminUsers = lazyWithRetry(() => import("./pages/superadmin/SuperAdminUsers"));
const SuperAdminBilling = lazyWithRetry(() => import("./pages/superadmin/SuperAdminBilling"));
const SuperAdminAIUsage = lazyWithRetry(() => import("./pages/superadmin/SuperAdminAIUsage"));
const SuperAdminSupport = lazyWithRetry(() => import("./pages/superadmin/SuperAdminSupport"));
const SuperAdminHealth = lazyWithRetry(() => import("./pages/superadmin/SuperAdminHealth"));
const PlatformLogin = lazyWithRetry(() => import("./pages/PlatformLogin"));

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
      <ICMSpinner size={40} />
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
      <SessionTimeoutProvider>
      <PasswordExpiryProvider>
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
            <Route path="/people/:id/progress-note/new" element={<ProtectedRoute><ProgressNoteNew /></ProtectedRoute>} />
            <Route path="/people/:id/progress-note/:noteId" element={<ProtectedRoute><PersonProgressNoteDetail /></ProtectedRoute>} />
            <Route path="/progress-note" element={<ProtectedRoute><ProgressNoteLog /></ProtectedRoute>} />
            <Route path="/progress-note/new" element={<ProtectedRoute><ProgressNoteNew /></ProtectedRoute>} />
            <Route path="/visit-summary" element={<ProtectedRoute><VisitSummaryLog /></ProtectedRoute>} />
            <Route path="/visit-summary/new" element={<ProtectedRoute><VisitSummaryNew /></ProtectedRoute>} />
            <Route path="/monitoring-form" element={<ProtectedRoute><MonitoringFormLog /></ProtectedRoute>} />
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
            <Route path="/platform/orchestrator" element={<ProtectedRoute requireRole="supervisor"><BrainOrchestrator /></ProtectedRoute>} />

            {/* Per-person placeholder routes */}
            <Route path="/people/:id/care-tracker" element={<ProtectedRoute><PersonCareTracker /></ProtectedRoute>} />
            <Route path="/people/:id/meeting-notes" element={<ProtectedRoute><PersonMeetingNotesPage /></ProtectedRoute>} />
            <Route path="/people/:id/communications" element={<ProtectedRoute><PersonCommunications /></ProtectedRoute>} />
            <Route path="/people/:id/services" element={<ProtectedRoute><PersonServices /></ProtectedRoute>} />
            <Route path="/people/:id/employment" element={<ProtectedRoute><PersonEmployment /></ProtectedRoute>} />
            <Route path="/people/:id/medications" element={<ProtectedRoute><PersonMedications /></ProtectedRoute>} />
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
      </PasswordExpiryProvider>
      </SessionTimeoutProvider>
      </BillingProvider>
      </OrgSettingsProvider>
      </RiskScoreProvider>
    </RoleProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
