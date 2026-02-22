import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Sparkles, LayoutDashboard, User,
  ArrowLeft, Layers, BookOpen, Bot, Shield,
  FileCheck, TrendingUp, Users, AlertTriangle,
  Play, CheckCircle2, Clock, Library,
  MoreVertical, Eye, Pencil, Copy, Trash2,
  ShieldCheck, History,
} from "lucide-react";
import { mockRuleLibraries, mockRuntimeAgents, runtimeAgentTypeLabels, RuleLibrary, RuntimeAgent } from "@/types/agent";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

type TabId = "agents" | "engines";

export default function LifePlanBoard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("agents");
  const navigate = useNavigate();
  const { isAdmin, role, setRole } = useRole();

  const filteredAgents = mockRuntimeAgents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.ruleLibraryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLibraries = mockRuleLibraries.filter((lib) =>
    lib.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lib.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const overviewStats = activeTab === "agents"
    ? [
        { label: "Active Agents", value: mockRuntimeAgents.filter(a => a.status === 'active').length.toString(), icon: Bot, trend: "Running compliance" },
        { label: "Individuals Served", value: mockRuntimeAgents.reduce((s, a) => s + a.individualsServed, 0).toString(), icon: Users, trend: "Across all agents" },
        { label: "Avg Compliance", value: Math.round(mockRuntimeAgents.reduce((s, a) => s + a.complianceRate, 0) / mockRuntimeAgents.length) + "%", icon: TrendingUp, trend: "Denial prevention" },
        { label: "Engines Used", value: new Set(mockRuntimeAgents.map(a => a.ruleLibraryId)).size.toString(), icon: Library, trend: "Linked & active" },
      ]
    : [
        { label: "Total Engines", value: mockRuleLibraries.length.toString(), icon: Library, trend: `${mockRuleLibraries.filter(l => l.status === 'published').length} published` },
        { label: "Linked to Agents", value: new Set(mockRuntimeAgents.map(a => a.ruleLibraryId)).size.toString(), icon: Bot, trend: `${mockRuntimeAgents.length} agents using engines` },
        { label: "Draft Engines", value: mockRuleLibraries.filter(l => l.status === 'draft').length.toString(), icon: Shield, trend: "Not yet published" },
        { label: "Total Services", value: mockRuleLibraries.reduce((s, l) => s + l.serviceCount, 0).toString(), icon: FileCheck, trend: "Across all engines" },
      ];

  const tabs: { id: TabId; label: string; icon: typeof Bot; adminOnly: boolean }[] = [
    { id: "agents", label: "Agents", icon: Bot, adminOnly: false },
    { id: "engines", label: "Compliance Engines", icon: ShieldCheck, adminOnly: true },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display font-semibold text-foreground text-lg">Compliance Agent Platform</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Role switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted border border-border">
            <button
              onClick={() => setRole("admin")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                role === "admin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-3 w-3 inline mr-1" />Admin
            </button>
            <button
              onClick={() => setRole("case_manager")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                role === "case_manager" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-3 w-3 inline mr-1" />Case Manager
            </button>
          </div>

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
                  <h1 className="text-2xl font-display font-bold text-foreground">Compliance Agent Platform</h1>
                  <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                    {isAdmin ? (
                      <>
                        <p className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-primary" /> Build Compliance Engines from state guidelines</p>
                        <p className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-primary" /> Create and manage Runtime Agents</p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-primary" /> Run compliance agents to check authorizations and documentation</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {isAdmin && (
                  <button
                    onClick={() => navigate("/lifeplan/agent/new")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Agent
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-muted/50 border border-border/60 w-fit">
            {tabs.filter(t => !t.adminOnly || isAdmin).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

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

          {/* Search + CTA */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder={activeTab === "agents" ? "Search agents..." : "Search compliance engines..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {activeTab === "engines" && isAdmin && (
              <button
                onClick={() => navigate("/lifeplan/rule-library/new")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--destructive))] to-[hsl(30,70%,55%)] text-destructive-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Shield className="h-4 w-4" />
                Create Compliance Engine
              </button>
            )}
          </div>

          {/* Content */}
          {activeTab === "agents" && <RuntimeAgentsTab agents={filteredAgents} navigate={navigate} />}
          {activeTab === "engines" && <ComplianceEnginesTab libraries={filteredLibraries} navigate={navigate} />}
        </div>
      </main>
    </div>
  );
}

// ============= MENUS =============

function EngineMenu({ onView, onEdit, onClone, onHistory }: { onView: () => void; onEdit: () => void; onClone: () => void; onHistory: () => void }) {
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-popover border border-border shadow-xl z-50 py-1 overflow-hidden">
              <button onClick={(e) => { e.stopPropagation(); onView(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                <Eye className="h-3.5 w-3.5" /> View
              </button>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); onClone(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                <Copy className="h-3.5 w-3.5" /> Clone as New Version
              </button>
              <div className="h-px bg-border mx-1 my-1" />
              <button onClick={(e) => { e.stopPropagation(); onHistory(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                <History className="h-3.5 w-3.5" /> Version History
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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

// ============= COMPLIANCE ENGINES TAB =============

function ComplianceEnginesTab({ libraries, navigate }: { libraries: RuleLibrary[]; navigate: ReturnType<typeof useNavigate> }) {
  const agentUsageMap = mockRuntimeAgents.reduce((acc, agent) => {
    acc[agent.ruleLibraryId] = (acc[agent.ruleLibraryId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (libraries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4"><Search className="h-8 w-8 text-muted-foreground" /></div>
        <p className="text-lg font-medium mb-1">No compliance engines found</p>
        <p className="text-muted-foreground">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {libraries.map((lib, i) => (
        <motion.div key={lib.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
          <div className="group relative rounded-xl bg-card border border-border/40 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ease-out hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate(`/lifeplan/engine/${lib.id}/history`)}
          >
            <div className="relative bg-gradient-to-br from-[hsl(210,40%,38%)] to-[hsl(200,35%,48%)] px-4 pt-4 pb-4">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 blur-2xl -translate-y-6 translate-x-6" />
              <div className="relative flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-white/15 border border-white/10 shadow shrink-0">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[13px] text-white truncate leading-tight">{lib.name}</h3>
                  <p className="text-[10px] text-white/50 mt-0.5 truncate">{lib.state} · {lib.program}</p>
                </div>
                <EngineMenu
                  onView={() => navigate(`/lifeplan/engine/${lib.id}/history`)}
                  onEdit={() => navigate("/lifeplan/rule-library/new")}
                  onClone={() => {}}
                  onHistory={() => navigate(`/lifeplan/engine/${lib.id}/history`)}
                />
              </div>
            </div>

            <div className="px-4 pt-3 pb-4">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
                <span>Effective {lib.effectiveDate}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                  lib.status === "published" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                )}>
                  v{lib.version} · {lib.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-lg font-bold text-foreground leading-none">{lib.serviceCount}</div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Services</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-lg font-bold text-destructive leading-none">{lib.hardStopCount}</div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Hard Stops</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-lg font-bold text-warning leading-none">{lib.warningCount}</div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Warnings</p>
                </div>
              </div>

              {/* Linked agents count */}
              {agentUsageMap[lib.id] && (
                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-primary">
                  <Bot className="h-3 w-3" />
                  <span className="font-medium">{agentUsageMap[lib.id]} agent{agentUsageMap[lib.id] > 1 ? "s" : ""} linked</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>v{lib.version}</span>
                <span>Updated {lib.lastUpdated}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============= RUNTIME AGENTS TAB =============

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
              onClick={() => navigate("/lifeplan/agent/new/layer2")}
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
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                    agent.status === "active" ? "bg-white/25 text-white" : "bg-white/15 text-white/70"
                  )}>
                    {agent.status}
                  </span>
                  <AgentMenu
                    onEdit={() => navigate("/lifeplan/agent/new/layer2")}
                    onClone={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              </div>

              <div className="px-5 pt-4 pb-5">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem] leading-relaxed">
                  {agent.description}
                </p>

                <div className="flex items-center gap-1.5 mb-4 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40">
                  <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground truncate">
                    Powered by: <span className="font-medium text-foreground">{agent.ruleLibraryName}</span> v{agent.ruleLibraryVersion}
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
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-xs font-bold text-foreground leading-none mt-1">{agent.lastUsed || "Never"}</div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Last Used</p>
                  </div>
                </div>

                <button className={cn(
                  "w-full h-9 gap-2 rounded-xl text-xs font-medium flex items-center justify-center bg-gradient-to-r text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all",
                  gradient
                )}>
                  <Play className="h-3 w-3 fill-current" />
                  Run Agent
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
