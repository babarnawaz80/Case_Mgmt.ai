import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import PeopleSupported from "./pages/PeopleSupported";
import LifePlanBoard from "./pages/LifePlanBoard";
import LifePlanAgentDetail from "./pages/LifePlanAgentDetail";
import Layer1AgentBuilder from "./pages/Layer1AgentBuilder";
import Layer2AgentBuilder from "./pages/Layer2AgentBuilder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/people" element={<PeopleSupported />} />
          <Route path="/lifeplan" element={<LifePlanBoard />} />
          <Route path="/lifeplan/agent/new/layer1" element={<Layer1AgentBuilder />} />
          <Route path="/lifeplan/agent/new/layer2" element={<Layer2AgentBuilder />} />
          <Route path="/lifeplan/agent/:id" element={<LifePlanAgentDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
