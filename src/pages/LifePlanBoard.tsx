import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Sparkles, LayoutDashboard, User,
  ArrowLeft, Layers, BookOpen, Bot, Shield,
  TrendingUp, Users,
  Play, CheckCircle2, Clock, Eye, FileText,
  MoreVertical, Pencil, Copy, Trash2, AlertTriangle,
} from "lucide-react";
import { mockRuntimeAgents, runtimeAgentTypeLabels, RuntimeAgent, mockComplianceEngines } from "@/types/agent";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { Switch } from "@/components/ui/switch";

export default function LifePlanBoard() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { isAdmin, role, setRole } = useRole();

  const filteredAgents = mockRuntimeAgents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.engineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDraftsPending = mockRuntimeAgents.reduce((s, a) => s + a.draftsPending, 0);

  const overviewStats = [
    { label: "Active Agents", value: mockRuntimeAgents.filter(a => a.status === 'active').length.toString(), icon: Bot, trend: "Running compliance" },
    { label: "Individuals Served", value: mockRuntimeAgents.reduce((s, a) => s + a.individualsServed, 0).toString(), icon: Users, trend: "Across all agents" },
    { label: "Avg Compliance", value: Math.round(mockRuntimeAgents.reduce((s, a) => s + a.complianceRate, 0) / mockRuntimeAgents.length) + "%", icon: TrendingUp, trend: "Denial prevention" },
    { label: "Drafts Pending", value: totalDraftsPending.toString(), icon: FileText, trend: "Auto-monitor drafts" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display font-semibold text-foreground text-lg">Agents Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/")} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium text-sm transition-all">
            <Sparkles className="w-4 h-4" /> AI Companion
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all border border-border">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border border-primary/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg">
                  <Layers className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold text-foreground">Agents Dashboard</h1>
                  <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                    {isAdmin ? (
                      <>
                        <p className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-primary" /> Build Guidelines Engines from state guidelines</p>
                        <p className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-primary" /> Create and manage Runtime Agents</p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-primary" /> Run compliance agents to check authorizations and documentation</p>
                    )}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate("/lifeplan/agent/new")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
                    <Plus className="h-4 w-4" /> Create Agent
                  </button>
                  <button onClick={() => navigate("/lifeplan/guidelines-engines")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-foreground font-medium text-sm hover:bg-secondary transition-all">
                    <Shield className="h-4 w-4" /> Guidelines Engines
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {overviewStats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
                    <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10"><stat.icon className="h-5 w-5 text-primary" /></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search agents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <RuntimeAgentsTab agents={filteredAgents} navigate={navigate} />
        </div>
      </main>
    </div>
  );
}

function AgentMenu({ onEdit, onClone, onDelete }: { onEdit: () => void; onClone: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors">
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-popover border border-border shadow-xl z-50 py-1 overflow-hidden">
              <button onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); onClone(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                <Copy className="h-3.5 w-3.5" /> Clone
              </button>
              <div className="h-px bg-border mx-1 my-1" />
              <button onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const agentTypeColors: Record<string, string> = {
  compliance_copilot: "from-[hsl(200,65%,52%)] to-[hsl(210,55%,62%)]",
  pcp_alignment: "from-[hsl(160,45%,48%)] to-[hsl(160,40%,58%)]",
  billing_documentation: "from-[hsl(30,70%,55%)] to-[hsl(30,60%,65%)]",
  monitoring_reauth: "from-[hsl(270,50%,58%)] to-[hsl(270,45%,68%)]",
  isp_generator: "from-[hsl(350,55%,58%)] to-[hsl(350,50%,68%)]",
  ambient_meeting: "from-[hsl(190,55%,48%)] to-[hsl(190,50%,58%)]",
};

function RuntimeAgentsTab({ agents, navigate }: { agents: RuntimeAgent[]; navigate: ReturnType<typeof useNavigate> }) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4"><Search className="h-8 w-8 text-muted-foreground" /></div>
        <p className="text-lg font-medium mb-1">No agents found</p>
        <p className="text-muted-foreground">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {agents.map((agent, i) => {
        const gradient = agentTypeColors[agent.type] || agentTypeColors.compliance_copilot;
        return (
          <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <div className="group relative rounded-2xl bg-card border border-border/40 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1 cursor-pointer"
              onClick={() => navigate("/lifeplan/agent/new/layer2", { state: { agentName: agent.name } })}
            >
              <div className={cn("relative bg-gradient-to-br px-5 pt-5 pb-6", gradient)}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -translate-y-8 translate-x-8" />
                <div className="relative flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-white/20 border border-white/15 shadow-lg shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[15px] text-white truncate leading-tight">{agent.name}</h3>
                    <p className="text-[11px] text-white/60 mt-0.5">{runtimeAgentTypeLabels[agent.type]}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", agent.status === "active" ? "bg-white/25 text-white" : "bg-white/15 text-white/70")}>
                      {agent.status}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", agent.autoMonitorEnabled ? "bg-success/25 text-white" : "bg-white/10 text-white/50")}>
                      {agent.autoMonitorEnabled ? "Auto-Monitor: On" : "Monitor: Off"}
                    </span>
                  </div>
                  <AgentMenu onEdit={() => navigate("/lifeplan/agent/new/layer2", { state: { agentName: agent.name } })} onClone={() => {}} onDelete={() => {}} />
                </div>
              </div>

              <div className="px-5 pt-4 pb-5">
                {/* Auto-Monitor Toggle Row */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/40"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-medium text-foreground">Auto-Monitor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-semibold", agent.autoMonitorEnabled ? "text-success" : "text-muted-foreground")}>
                      {agent.autoMonitorEnabled ? "ON" : "OFF"}
                    </span>
                    <Switch checked={agent.autoMonitorEnabled} onCheckedChange={() => {}} className="scale-75" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-4 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40">
                  <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground truncate">
                    Powered by: <span className="font-medium text-foreground">{agent.engineName}</span> v{agent.engineVersion}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold text-primary leading-none">{agent.complianceRate}%</div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Compliance</p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xl font-bold text-foreground leading-none">{agent.individualsServed}</div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Individuals</p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <FileText className="h-4 w-4 mx-auto mb-1 text-warning" />
                    <div className="text-xl font-bold text-warning leading-none">{agent.draftsPending}</div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Drafts</p>
                  </div>
                </div>

                {agent.lastEvaluated && (
                  <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Last evaluated: {new Date(agent.lastEvaluated).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <button className={cn("flex-1 h-9 gap-2 rounded-xl text-xs font-medium flex items-center justify-center bg-gradient-to-r text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all", gradient)}>
                    <Play className="h-3 w-3 fill-current" /> Run Agent
                  </button>
                  {agent.draftsPending > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/lifeplan/agent/${agent.id}/drafts`); }}
                      className="h-9 px-3 gap-1.5 rounded-xl text-xs font-medium flex items-center justify-center bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-all"
                    >
                      <AlertTriangle className="h-3 w-3" /> {agent.draftsPending} Drafts
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/lifeplan/agent/${agent.id}/monitoring`); }}
                    className="h-9 px-3 gap-1.5 rounded-xl text-xs font-medium flex items-center justify-center bg-muted/50 text-muted-foreground border border-border/40 hover:bg-muted hover:text-foreground transition-all"
                  >
                    <Shield className="h-3 w-3" /> Settings
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
