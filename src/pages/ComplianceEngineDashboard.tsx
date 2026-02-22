import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowLeft, BookOpen, Shield, Bot,
  MoreVertical, Eye, Pencil, Copy, History, AlertCircle,
} from "lucide-react";
import { mockComplianceEngines, mockRuntimeAgents, ComplianceEngine } from "@/types/agent";
import { cn } from "@/lib/utils";

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
                <Pencil className="h-3.5 w-3.5" /> New Version
              </button>
              <button onClick={(e) => { e.stopPropagation(); onClone(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors">
                <Copy className="h-3.5 w-3.5" /> Clone
              </button>
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

export default function ComplianceEngineDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredEngines = mockComplianceEngines.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const agentUsageMap = mockRuntimeAgents.reduce((acc, agent) => {
    acc[agent.engineId] = (acc[agent.engineId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const linkedEngines = mockComplianceEngines.filter(e => agentUsageMap[e.id]);
  const totalAgentsLinked = mockRuntimeAgents.filter(a => mockComplianceEngines.some(e => e.id === a.engineId)).length;

  // Check for version upgrade notifications
  const enginesWithNewVersions = mockComplianceEngines.filter(e => e.status === "published");

  const stats = [
    { label: "Total Engines", value: mockComplianceEngines.length.toString(), icon: Shield, trend: `${mockComplianceEngines.filter(e => e.status === 'published').length} published` },
    { label: "Linked to Agents", value: linkedEngines.length.toString(), icon: Bot, trend: `${totalAgentsLinked} agents using engines` },
    { label: "Unused Engines", value: (mockComplianceEngines.length - linkedEngines.length).toString(), icon: Shield, trend: "Not linked to any agent" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/lifeplan")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display font-semibold text-foreground text-lg">Guidelines Engines</h2>
        </div>
        <button
          onClick={() => navigate("/lifeplan/guidelines-library/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--destructive))] to-[hsl(30,70%,55%)] text-destructive-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <Shield className="h-4 w-4" /> Create Guidelines Engine
        </button>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {stats.map((stat, i) => (
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
              <input placeholder="Search guidelines engines..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          {/* Grid */}
          {filteredEngines.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4"><Search className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-lg font-medium mb-1">No guidelines engines found</p>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEngines.map((engine, i) => {
                const agentCount = agentUsageMap[engine.id] || 0;
                return (
                  <motion.div key={engine.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                    <div className="group relative rounded-xl bg-card border border-border/40 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ease-out hover:-translate-y-0.5 cursor-pointer"
                      onClick={() => navigate(`/lifeplan/engine/${engine.id}/history`)}
                    >
                      <div className="relative bg-gradient-to-br from-[hsl(210,40%,38%)] to-[hsl(200,35%,48%)] px-4 pt-4 pb-4">
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 blur-2xl -translate-y-6 translate-x-6" />
                        <div className="relative flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-white/15 border border-white/10 shadow shrink-0">
                            <BookOpen className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-[13px] text-white truncate leading-tight">{engine.name}</h3>
                            <p className="text-[10px] text-white/50 mt-0.5 truncate">{engine.state} · {engine.program}</p>
                          </div>
                          <EngineMenu
                            onView={() => navigate(`/lifeplan/engine/${engine.id}/history`)}
                            onEdit={() => navigate("/lifeplan/guidelines-library/new")}
                            onClone={() => {}}
                            onHistory={() => navigate(`/lifeplan/engine/${engine.id}/history`)}
                          />
                        </div>
                      </div>

                      <div className="px-4 pt-3 pb-4">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
                          <span>Effective {engine.effectiveDate}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                            engine.status === "published" ? "bg-primary/10 text-primary" :
                            engine.status === "archived" ? "bg-muted text-muted-foreground" :
                            "bg-warning/10 text-warning"
                          )}>
                            {engine.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
                            <div className="text-lg font-bold text-foreground leading-none">{engine.serviceCount}</div>
                            <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Services</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
                            <div className="text-lg font-bold text-destructive leading-none">{engine.hardStopCount}</div>
                            <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Hard Stops</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
                            <div className="text-lg font-bold text-warning leading-none">{engine.warningCount}</div>
                            <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Warnings</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                          <span>v{engine.version}</span>
                          <span>Updated {engine.lastUpdated}</span>
                        </div>

                        {agentCount > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-primary">
                            <Bot className="h-3 w-3" />
                            <span>{agentCount} agent{agentCount > 1 ? "s" : ""} pinned to this version</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
