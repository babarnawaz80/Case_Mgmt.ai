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
