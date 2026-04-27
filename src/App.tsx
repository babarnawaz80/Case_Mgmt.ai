import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import PeopleSupported from "./pages/PeopleSupported";
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
import ContactNote from "./pages/ContactNote";
import PersonModule from "./pages/PersonModule";
import PersonCaseManagement from "./pages/PersonCaseManagement";
import PersonCarePlan from "./pages/PersonCarePlan";
import PersonCarePlanDetail from "./pages/PersonCarePlanDetail";
import PersonMonitoringForm from "./pages/PersonMonitoringForm";
import PersonMonitoringFormDetail from "./pages/PersonMonitoringFormDetail";
import PersonVisitSummary from "./pages/PersonVisitSummary";
import PersonVisitSummaryDetail from "./pages/PersonVisitSummaryDetail";
import PersonEligibilityVerification from "./pages/PersonEligibilityVerification";
import PersonEligibilityVerificationDetail from "./pages/PersonEligibilityVerificationDetail";
import PersonProgressNote from "./pages/PersonProgressNote";
import PersonProgressNoteDetail from "./pages/PersonProgressNoteDetail";
import PersonWorkflowManager from "./pages/PersonWorkflowManager";
import PersonWorkflowDetail from "./pages/PersonWorkflowDetail";
import WorkflowsGlobal from "./pages/WorkflowsGlobal";
import WorkflowTemplatesAdmin from "./pages/WorkflowTemplatesAdmin";
import PersonIncidentReporting from "./pages/PersonIncidentReporting";
import PersonIncidentReportingDetail from "./pages/PersonIncidentReportingDetail";
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
import PersonReferralForm from "./pages/PersonReferralForm";
import PersonReferralDetail from "./pages/PersonReferralDetail";
import Documentation from "./pages/Documentation";
import Settings from "./pages/Settings";
import ProviderDirectory from "./pages/admin/ProviderDirectory";
import Reports from "./pages/Reports";
import ReportRunner from "./pages/ReportRunner";
import NotFound from "./pages/NotFound";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RoleProvider>
      <BillingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/people" element={<PeopleSupported />} />
            <Route path="/people/:id/profile" element={<PersonProfile />} />
            <Route path="/people/:id/facesheet" element={<PersonFaceSheet />} />
            <Route path="/people/:id/echart" element={<EChart />} />
            <Route path="/people/:id/contact-note" element={<ContactNote />} />
            <Route path="/people/:id/case-management" element={<PersonCaseManagement />} />
            <Route path="/people/:id/care-plan" element={<PersonCarePlan />} />
            <Route path="/people/:id/care-plan/:planId" element={<PersonCarePlanDetail />} />
            <Route path="/people/:id/monitoring-form" element={<PersonMonitoringForm />} />
            <Route path="/people/:id/monitoring-form/:formId" element={<PersonMonitoringFormDetail />} />
            <Route path="/people/:id/visit-summary" element={<PersonVisitSummary />} />
            <Route path="/people/:id/visit-summary/:visitId" element={<PersonVisitSummaryDetail />} />
            <Route path="/people/:id/eligibility-verification" element={<PersonEligibilityVerification />} />
            <Route path="/people/:id/eligibility-verification/:verificationId" element={<PersonEligibilityVerificationDetail />} />
            <Route path="/people/:id/progress-note" element={<PersonProgressNote />} />
            <Route path="/people/:id/progress-note/:noteId" element={<PersonProgressNoteDetail />} />
            <Route path="/people/:id/workflow-manager" element={<PersonWorkflowManager />} />
            <Route path="/people/:id/workflow-manager/:workflowId" element={<PersonWorkflowDetail />} />
            <Route path="/workflows" element={<WorkflowsGlobal />} />
            <Route path="/admin/workflow-templates" element={<WorkflowTemplatesAdmin />} />
            <Route path="/people/:id/incident-reporting" element={<PersonIncidentReporting />} />
            <Route path="/people/:id/incident-reporting/:incidentId" element={<PersonIncidentReportingDetail />} />
            <Route path="/incidents" element={<IncidentsGlobal />} />
            <Route path="/my-work" element={<MyWork />} />
            <Route path="/people/:id/module/:slug" element={<PersonModule />} />
            <Route path="/modules/contact-note" element={<ContactNote />} />
            <Route path="/lifeplan" element={<LifePlanBoard />} />
            <Route path="/lifeplan/guidelines-engines" element={<ComplianceEngineDashboard />} />
            <Route path="/lifeplan/guidelines-library/new" element={<RuleLibraryBuilder />} />
            <Route path="/lifeplan/agent/new" element={<RuntimeAgentBuilder />} />
            <Route path="/lifeplan/agent/new/layer2" element={<Layer2AgentBuilder />} />
            <Route path="/lifeplan/engine/:id/history" element={<EngineHistory />} />
            <Route path="/lifeplan/agent/:agentId/drafts" element={<AgentDraftRuns />} />
            <Route path="/lifeplan/agent/:agentId/monitoring" element={<AgentMonitoringSettings />} />
            <Route path="/lifeplan/agent/:id" element={<LifePlanAgentDetail />} />
            <Route path="/admin/assessment-builder" element={<AssessmentBuilderList />} />
            <Route path="/admin/assessment-builder/new" element={<AssessmentBuilderEdit />} />
            <Route path="/admin/assessment-builder/:templateId/edit" element={<AssessmentBuilderEdit />} />
            <Route path="/people/:id/assessments" element={<PersonAssessments />} />
            <Route path="/people/:id/assessments/new" element={<PersonAssessmentForm />} />
            <Route path="/people/:id/assessments/:assessmentId" element={<PersonAssessmentForm />} />
            <Route path="/people/:id/referrals" element={<PersonReferrals />} />
            <Route path="/people/:id/referrals/new" element={<PersonReferralForm />} />
            <Route path="/people/:id/referrals/:referralId" element={<PersonReferralDetail />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/documentation/contact-notes" element={<Documentation />} />
            <Route path="/documentation/progress-notes" element={<Documentation />} />
            <Route path="/documentation/visit-summaries" element={<Documentation />} />
            <Route path="/documentation/monitoring-forms" element={<Documentation />} />
            <Route path="/documentation/assessments" element={<Documentation />} />
            <Route path="/documentation/care-plans" element={<Documentation />} />
            <Route path="/documentation/referrals" element={<Documentation />} />
            <Route path="/documentation/meeting-notes" element={<Documentation />} />
            <Route path="/documentation/communications" element={<Documentation />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin/provider-directory" element={<ProviderDirectory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:reportId" element={<ReportRunner />} />
            <Route path="/platform" element={<PlatformHub />} />
            <Route path="/platform/guidelines-engines" element={<GuidelinesEnginesList />} />
            <Route path="/platform/guidelines-engines/new" element={<NewEngineWizard />} />
            <Route path="/platform/guidelines-engines/:engineId" element={<EngineDetail />} />
            <Route path="/platform/rule-library" element={<RuleLibrary />} />
            <Route path="/platform/agents" element={<LifePlanBoard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </BillingProvider>
    </RoleProvider>
  </QueryClientProvider>
);

export default App;
