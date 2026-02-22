import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, FileText, User, GitBranch, Bot, Shield, Download, AlertCircle, ArrowUp } from "lucide-react";
import { mockComplianceEngines, mockRuntimeAgents } from "@/types/agent";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  version: string;
  by: string;
  date: string;
  details: string;
  sourceFile?: string;
  diff?: string;
}

const mockAuditLog: AuditEntry[] = [
  {
    id: "a1",
    action: "Published",
    version: "2.0",
    by: "Admin",
    date: "2026-02-10 14:32",
    details: "Engine published as v2.0 — 14 services, 8 hard stops, 12 warnings.",
    sourceFile: "MD_DDA_Waiver_Guidelines_2026.pdf",
    diff: "Added 2 new services (Community Living – Enhanced, Remote Supports). Updated limits for Employment Discovery (increased yearly cap from 240 to 320 hours).",
  },
  {
    id: "a2",
    action: "Created Draft",
    version: "2.0",
    by: "Admin",
    date: "2026-02-08 09:15",
    details: "Cloned from v1.0 to begin v2.0 update cycle.",
  },
  {
    id: "a3",
    action: "Published",
    version: "1.0",
    by: "Admin",
    date: "2026-01-15 11:00",
    details: "Initial engine published — 12 services, 6 hard stops, 10 warnings.",
    sourceFile: "MD_DDA_Waiver_Guidelines_2025.pdf",
  },
  {
    id: "a4",
    action: "Created Draft",
    version: "1.0",
    by: "Admin",
    date: "2026-01-10 16:45",
    details: "Initial compliance engine created from Maryland DDA guidelines.",
    sourceFile: "MD_DDA_Waiver_Guidelines_2025.pdf",
  },
];

export default function EngineHistory() {
  const navigate = useNavigate();
  const { id } = useParams();
  const engine = mockComplianceEngines.find((e) => e.id === id) || mockComplianceEngines[0];
  const linkedAgents = mockRuntimeAgents.filter((a) => a.engineId === engine.id);

  // Mock: agents on older version
  const agentsOnOlderVersion = linkedAgents.filter(a => a.engineVersion !== engine.version);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/lifeplan/compliance-engines")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(210,40%,38%)] to-[hsl(200,35%,48%)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">{engine.name} — Version History</h2>
              <p className="text-[11px] text-muted-foreground">Version history & audit log</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[900px] mx-auto space-y-8">
          {/* Engine summary */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground">{engine.name}</h3>
                <p className="text-sm text-muted-foreground">{engine.state} · {engine.program} · Effective {engine.effectiveDate}</p>
              </div>
              <span className={cn(
                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                engine.status === "published" ? "bg-primary/10 text-primary" :
                engine.status === "archived" ? "bg-muted text-muted-foreground" :
                "bg-warning/10 text-warning"
              )}>
                v{engine.version} · {engine.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xl font-bold text-foreground">{engine.serviceCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Services</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xl font-bold text-destructive">{engine.hardStopCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Hard Stops</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xl font-bold text-warning">{engine.warningCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Warnings</p>
              </div>
            </div>

            {/* Immutability notice */}
            {engine.status === "published" && (
              <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/30">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Published engines are immutable.</span> To make changes, create a new version by cloning this engine.
                </p>
              </div>
            )}
          </motion.div>

          {/* Upgrade notification */}
          {agentsOnOlderVersion.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="p-4 rounded-xl bg-warning/5 border border-warning/20"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Engine Update Available</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New version v{engine.version} is available. The following agents are still pinned to older versions and must be manually upgraded:
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {agentsOnOlderVersion.map(agent => (
                      <div key={agent.id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/30">
                        <div className="flex items-center gap-2">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-foreground">{agent.name}</span>
                          <span className="text-[10px] text-muted-foreground">pinned to v{agent.engineVersion}</span>
                        </div>
                        <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 hover:bg-warning/20 text-[10px] font-medium text-warning transition-colors">
                          <ArrowUp className="h-3 w-3" /> Upgrade
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Linked agents */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h4 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> Linked Agents ({linkedAgents.length})
            </h4>
            {linkedAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents linked to this engine.</p>
            ) : (
              <div className="space-y-2">
                {linkedAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card">
                    <div className="flex items-center gap-3">
                      <Bot className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground">Pinned to v{agent.engineVersion}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      agent.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Audit log */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h4 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Audit Log
            </h4>
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border/60" />
              <div className="space-y-4">
                {mockAuditLog.map((entry, i) => (
                  <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="relative pl-10">
                    <div className={cn(
                      "absolute left-2.5 top-3 w-4 h-4 rounded-full flex items-center justify-center",
                      entry.action === "Published" ? "bg-primary" : "bg-muted"
                    )}>
                      {entry.action === "Published" ? (
                        <GitBranch className="h-2.5 w-2.5 text-primary-foreground" />
                      ) : (
                        <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-4 rounded-xl border border-border/40 bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                            entry.action === "Published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {entry.action}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">v{entry.version}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                      </div>
                      <p className="text-xs text-foreground mb-1">{entry.details}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {entry.by}</span>
                        {entry.sourceFile && (
                          <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {entry.sourceFile}</span>
                        )}
                      </div>
                      {entry.diff && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Changes</p>
                          <p className="text-[11px] text-foreground">{entry.diff}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
