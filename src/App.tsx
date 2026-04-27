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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RoleProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/people" element={<PeopleSupported />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </RoleProvider>
  </QueryClientProvider>
);

export default App;
