import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Sparkles, LayoutDashboard, User,
  ArrowLeft, Layers, BookOpen, Bot, Shield,
  TrendingUp, Users,
  Play, Clock, Eye, FileText,
  MoreVertical, Pencil, Copy, Trash2, AlertTriangle, Lock,
  UserCog,
} from "lucide-react";
import { mockRuntimeAgents, runtimeAgentTypeLabels, RuntimeAgent, mockComplianceEngines } from "@/types/agent";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "@/hooks/use-toast";

export default function LifePlanBoard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [agents, setAgents] = useState<RuntimeAgent[]>([...mockRuntimeAgents]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAdmin, role, setRole } = useRole();

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.engineName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDraftsPending = agents.reduce((s, a) => s + a.draftsPending, 0);

  const handleDelete = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setAgents(prev => prev.filter(a => a.id !== agentId));
    setDeleteConfirm(null);
    toast({
      title: "Agent Deleted",
      description: `"${agent?.name}" has been removed. This action cannot be undone.`,
    });
  };

  const handleClone = (agent: RuntimeAgent) => {
    const cloned: RuntimeAgent = {
      ...agent,
      id: `ra-clone-${Date.now()}`,
      name: `${agent.name} (Copy)`,
      version: "1.0",
      status: "draft",
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: null,
      individualsServed: 0,
      complianceRate: 0,
      draftsPending: 0,
      lastEvaluated: null,
    };
    setAgents(prev => [...prev, cloned]);
    toast({
      title: "Agent Cloned",
      description: `"${cloned.name}" created as a draft. Open it to configure and deploy.`,
    });
  };

  const overviewStats = [
    { label: "Active Agents", value: agents.filter(a => a.status === 'active').length.toString(), icon: Bot, trend: "Running compliance" },
    { label: "Individuals Served", value: agents.reduce((s, a) => s + a.individualsServed, 0).toString(), icon: Users, trend: "Across all agents" },
    { label: "Avg Compliance", value: Math.round(agents.reduce((s, a) => s + a.complianceRate, 0) / (agents.length || 1)) + "%", icon: TrendingUp, trend: "Denial prevention" },
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
          {/* Role Switcher */}
          <button
            onClick={() => {
              const newRole = role === "admin" ? "case_manager" : "admin";
              setRole(newRole);
              toast({ title: "Role Switched", description: `Now viewing as: ${newRole === "admin" ? "Admin" : "Case Manager"}` });
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground font-medium text-xs transition-all border border-border"
          >
            <UserCog className="w-3.5 h-3.5" />
            {role === "admin" ? "Admin" : "Case Manager"}
          </button>
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

          <RuntimeAgentsTab agents={filteredAgents} navigate={navigate} isAdmin={isAdmin} onDelete={(id) => setDeleteConfirm(id)} onClone={handleClone} />
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] rounded-2xl bg-card border border-border shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-foreground">Delete Agent</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <span className="font-semibold text-foreground">"{agents.find(a => a.id === deleteConfirm)?.name}"</span>? All associated data, monitoring settings, and draft runs will be permanently removed.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium border border-border">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium">Delete Agent</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentMenu({ onEdit, onClone, onDelete, isAdmin }: { onEdit: () => void; onClone: () => void; onDelete: () => void; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-popover border border-border shadow-xl z-50 py-1 overflow-hidden">
              {isAdmin ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit (New Version)
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onClone(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                    <Copy className="h-3.5 w-3.5" /> Clone
                  </button>
                  <div className="h-px bg-border mx-1 my-1" />
                  <button onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </button>
                  <div className="px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> Admin required to edit
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const agentTypeAccents: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  compliance_copilot: { border: "border-l-[hsl(200,65%,52%)]", bg: "bg-[hsl(200,65%,52%)]/10", text: "text-[hsl(200,65%,52%)]", icon: "bg-[hsl(200,65%,52%)]" },
  pcp_alignment: { border: "border-l-[hsl(160,45%,48%)]", bg: "bg-[hsl(160,45%,48%)]/10", text: "text-[hsl(160,45%,48%)]", icon: "bg-[hsl(160,45%,48%)]" },
  billing_documentation: { border: "border-l-[hsl(30,70%,55%)]", bg: "bg-[hsl(30,70%,55%)]/10", text: "text-[hsl(30,70%,55%)]", icon: "bg-[hsl(30,70%,55%)]" },
  monitoring_reauth: { border: "border-l-[hsl(270,50%,58%)]", bg: "bg-[hsl(270,50%,58%)]/10", text: "text-[hsl(270,50%,58%)]", icon: "bg-[hsl(270,50%,58%)]" },
  isp_generator: { border: "border-l-[hsl(350,55%,58%)]", bg: "bg-[hsl(350,55%,58%)]/10", text: "text-[hsl(350,55%,58%)]", icon: "bg-[hsl(350,55%,58%)]" },
  ambient_meeting: { border: "border-l-[hsl(190,55%,48%)]", bg: "bg-[hsl(190,55%,48%)]/10", text: "text-[hsl(190,55%,48%)]", icon: "bg-[hsl(190,55%,48%)]" },
};

function RuntimeAgentsTab({ agents, navigate, isAdmin, onDelete, onClone }: { agents: RuntimeAgent[]; navigate: ReturnType<typeof useNavigate>; isAdmin: boolean; onDelete: (id: string) => void; onClone: (agent: RuntimeAgent) => void }) {
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
        const accent = agentTypeAccents[agent.type] || agentTypeAccents.compliance_copilot;
        return (
          <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <div className={cn("group relative rounded-xl bg-card border border-border/50 border-l-4 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer", accent.border)}
              onClick={() => navigate("/lifeplan/agent/new/layer2", { state: { agentName: agent.name } })}
            >
              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", accent.icon)}>
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{agent.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{runtimeAgentTypeLabels[agent.type]} · v{agent.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                      agent.status === "active" ? "bg-[hsl(152,55%,42%)]/10 text-[hsl(152,55%,42%)]" : "bg-muted text-muted-foreground"
                    )}>
                      {agent.status}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                      agent.autoMonitorEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {agent.autoMonitorEnabled ? "● Auto-Monitor" : "Monitor: Off"}
                    </span>
                    <AgentMenu
                      isAdmin={isAdmin}
                      onEdit={() => navigate("/lifeplan/agent/new", { state: { editAgent: agent } })}
                      onClone={() => onClone(agent)}
                      onDelete={() => onDelete(agent.id)}
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{agent.description}</p>

                {/* Powered by */}
                <div className="flex items-center gap-1.5 mb-4 text-[11px] text-muted-foreground">
                  <BookOpen className="h-3 w-3 shrink-0" />
                  Powered by: <span className="font-medium text-foreground">{agent.engineName}</span> v{agent.engineVersion}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2.5 rounded-lg bg-muted/30">
                    <div className={cn("text-lg font-bold leading-none", accent.text)}>{agent.complianceRate}%</div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Compliance</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold text-foreground leading-none">{agent.individualsServed}</div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Individuals</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-muted/30">
                    <div className={cn("text-lg font-bold leading-none", agent.draftsPending > 0 ? "text-warning" : "text-foreground")}>{agent.draftsPending}</div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Drafts</p>
                  </div>
                </div>

                {agent.lastEvaluated && (
                  <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Last evaluated: {new Date(agent.lastEvaluated).toLocaleString()}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button className={cn("flex-1 h-9 gap-2 rounded-lg text-xs font-medium flex items-center justify-center text-white shadow-sm hover:shadow-md transition-all", accent.icon)}>
                    <Play className="h-3 w-3 fill-current" /> Run Agent
                  </button>
                  {agent.draftsPending > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/lifeplan/agent/${agent.id}/drafts`); }}
                      className="h-9 px-3 gap-1.5 rounded-lg text-xs font-medium flex items-center justify-center bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-all"
                    >
                      <AlertTriangle className="h-3 w-3" /> {agent.draftsPending}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/lifeplan/agent/${agent.id}/monitoring`); }}
                    className="h-9 px-3 gap-1.5 rounded-lg text-xs font-medium flex items-center justify-center bg-muted/50 text-muted-foreground border border-border/40 hover:bg-muted hover:text-foreground transition-all"
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
