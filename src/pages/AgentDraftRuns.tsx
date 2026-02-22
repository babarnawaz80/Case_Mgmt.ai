import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileText, AlertTriangle, Eye, CheckCircle2,
  Clock, Bot, Shield, Search, Filter, Sparkles, User,
} from "lucide-react";
import {
  mockDraftRuns, mockRuntimeAgents,
  draftRunStatusLabels, draftTriggerTypeLabels,
  DraftComplianceRun, DraftRunStatus,
} from "@/types/agent";
import { cn } from "@/lib/utils";

const statusColors: Record<DraftRunStatus, string> = {
  draft_pending_review: "bg-warning/10 text-warning border-warning/20",
  draft_updated: "bg-info/10 text-info border-info/20",
  reviewed: "bg-primary/10 text-primary border-primary/20",
  applied: "bg-success/10 text-success border-success/20",
  expired: "bg-muted text-muted-foreground border-border",
  discarded: "bg-muted text-muted-foreground border-border",
};

const triggerIcons: Record<string, typeof Sparkles> = {
  ambient_session: Sparkles,
  apply_plan: CheckCircle2,
  scheduled_sweep: Clock,
};

type FilterTab = "all" | "draft_pending_review" | "draft_updated" | "reviewed" | "applied";

export default function AgentDraftRuns() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const agent = mockRuntimeAgents.find(a => a.id === agentId);
  const agentName = agent?.name || "Agent";

  const agentDrafts = mockDraftRuns.filter(d => d.agentId === agentId);

  const filteredDrafts = agentDrafts.filter(d => {
    const matchesSearch = d.individualName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.detectedChangesSummary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || d.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All Drafts", count: agentDrafts.length },
    { key: "draft_pending_review", label: "Pending Review", count: agentDrafts.filter(d => d.status === "draft_pending_review").length },
    { key: "draft_updated", label: "Updated", count: agentDrafts.filter(d => d.status === "draft_updated").length },
    { key: "reviewed", label: "Reviewed", count: agentDrafts.filter(d => d.status === "reviewed").length },
    { key: "applied", label: "Applied", count: agentDrafts.filter(d => d.status === "applied").length },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/lifeplan")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-warning" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">{agentName}</h2>
              <p className="text-[11px] text-muted-foreground">Draft Compliance Runs · Auto-Monitor Output</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/lifeplan/agent/${agentId}/monitoring`)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border transition-all">
            <Shield className="h-3.5 w-3.5" /> Monitoring Settings
          </button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Safety banner */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 mb-6">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Draft Mode:</span> These runs were generated automatically by Auto-Monitor. No data has been written to iCM. Use <span className="font-medium text-foreground">Review & Apply</span> to commit changes.
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search by individual or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Draft Runs Table */}
          {filteredDrafts.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-1">No draft runs found</p>
              <p className="text-muted-foreground text-sm">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDrafts.map((draft, i) => {
                const TriggerIcon = triggerIcons[draft.triggerType] || Clock;
                return (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "relative flex items-start gap-4 px-5 py-4 rounded-xl bg-card border border-border/50 cursor-pointer",
                      "hover:shadow-md hover:border-border transition-all duration-200",
                      draft.hasHardStop && "border-l-4 border-l-destructive"
                    )}
                  >
                    {/* Individual + summary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display font-semibold text-[14px] text-foreground">{draft.individualName}</h4>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", statusColors[draft.status])}>
                          {draftRunStatusLabels[draft.status]}
                        </span>
                        {draft.hasHardStop && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Hard Stop
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{draft.detectedChangesSummary}</p>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TriggerIcon className="h-3 w-3" /> {draftTriggerTypeLabels[draft.triggerType]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" /> {draft.engineName} v{draft.engineVersion}
                        </span>
                        <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                      <div className="text-center px-3 py-1.5 rounded-lg bg-muted/40">
                        <div className="text-base font-bold text-foreground leading-none">{draft.findingsCount}</div>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Findings</p>
                      </div>
                      {draft.hardStopCount > 0 && (
                        <div className="text-center px-3 py-1.5 rounded-lg bg-destructive/5">
                          <div className="text-base font-bold text-destructive leading-none">{draft.hardStopCount}</div>
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5 font-medium">Hard Stops</p>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {(draft.status === "draft_pending_review" || draft.status === "draft_updated") && (
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                          <Eye className="h-3.5 w-3.5" /> Review
                        </button>
                      )}
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
