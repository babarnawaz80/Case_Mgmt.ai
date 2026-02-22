import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowLeft, BookOpen, Shield, Bot, Plus,
  MoreVertical, Eye, Pencil, Copy, History,
  FileText, Calendar, GitBranch, ChevronRight, Layers,
} from "lucide-react";
import { mockGuidelinesEngines, mockRuntimeAgents, GuidelinesEngine } from "@/types/agent";
import { cn } from "@/lib/utils";

// State-themed accent colors for each engine (soft, calming palette)
const stateAccents: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  Maryland: { bg: "bg-[hsl(200,85%,96%)]", border: "border-l-[hsl(200,80%,44%)]", text: "text-[hsl(200,80%,40%)]", icon: "bg-[hsl(200,80%,44%)]" },
  Virginia: { bg: "bg-[hsl(152,50%,95%)]", border: "border-l-[hsl(152,55%,42%)]", text: "text-[hsl(152,55%,38%)]", icon: "bg-[hsl(152,55%,42%)]" },
  Pennsylvania: { bg: "bg-[hsl(38,90%,95%)]", border: "border-l-[hsl(38,80%,50%)]", text: "text-[hsl(38,80%,40%)]", icon: "bg-[hsl(38,80%,50%)]" },
};
const defaultAccent = { bg: "bg-[hsl(270,50%,96%)]", border: "border-l-[hsl(270,50%,58%)]", text: "text-[hsl(270,50%,50%)]", icon: "bg-[hsl(270,50%,58%)]" };

function EngineMenu({ onView, onEdit, onClone, onHistory }: { onView: () => void; onEdit: () => void; onClone: () => void; onHistory: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
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

  const filteredEngines = mockGuidelinesEngines.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const agentUsageMap = mockRuntimeAgents.reduce((acc, agent) => {
    acc[agent.engineId] = (acc[agent.engineId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/lifeplan")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-display font-semibold text-foreground text-lg">Guidelines Engines</h2>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/lifeplan/guidelines-library/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <Plus className="h-4 w-4" /> New Engine
        </motion.button>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1100px] mx-auto">
          {/* Summary bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6 mb-6 px-5 py-3.5 rounded-xl bg-card border border-border/60"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground leading-none">{mockGuidelinesEngines.length}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{mockGuidelinesEngines.filter(e => e.status === 'published').length}</span> published
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{mockGuidelinesEngines.filter(e => e.status === 'draft').length}</span> draft
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{mockRuntimeAgents.length}</span> agents linked
              </span>
            </div>
          </motion.div>

          {/* Search */}
          <div className="relative max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search engines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Engine List */}
          {filteredEngines.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-1">No guidelines engines found</p>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEngines.map((engine, i) => {
                const accent = stateAccents[engine.state] || defaultAccent;
                const agentCount = agentUsageMap[engine.id] || 0;

                return (
                  <motion.div
                    key={engine.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => navigate(`/lifeplan/engine/${engine.id}/history`)}
                    className={cn(
                      "group relative flex items-center gap-5 px-5 py-4 rounded-xl bg-card border border-border/50 border-l-4 cursor-pointer",
                      "hover:shadow-md hover:border-border transition-all duration-200",
                      accent.border,
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm", accent.icon)}>
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-display font-semibold text-[15px] text-foreground truncate">{engine.name}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0",
                          engine.status === "published" ? "bg-success/10 text-success" :
                          engine.status === "archived" ? "bg-muted text-muted-foreground" :
                          "bg-warning/10 text-warning"
                        )}>
                          {engine.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {engine.state} · {engine.program}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Effective {engine.effectiveDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" /> v{engine.version}
                        </span>
                      </div>
                    </div>

                    {/* Compact stats */}
                    <div className="hidden md:flex items-center gap-4 shrink-0">
                      <div className={cn("text-center px-3 py-1.5 rounded-lg", accent.bg)}>
                        <div className={cn("text-base font-bold leading-none", accent.text)}>{engine.serviceCount}</div>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Services</p>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-destructive/5">
                        <div className="text-base font-bold text-destructive leading-none">{engine.hardStopCount}</div>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Hard Stops</p>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-warning/5">
                        <div className="text-base font-bold text-warning leading-none">{engine.warningCount}</div>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Warnings</p>
                      </div>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden lg:block">
                        <p className="text-[11px] text-muted-foreground">Updated {engine.lastUpdated}</p>
                        {agentCount > 0 && (
                          <p className="text-[11px] text-primary font-medium flex items-center gap-1 justify-end mt-0.5">
                            <Bot className="h-3 w-3" /> {agentCount} agent{agentCount > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                      <EngineMenu
                        onView={() => navigate(`/lifeplan/engine/${engine.id}/history`)}
                        onEdit={() => navigate("/lifeplan/guidelines-library/new")}
                        onClone={() => {}}
                        onHistory={() => navigate(`/lifeplan/engine/${engine.id}/history`)}
                      />
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
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
