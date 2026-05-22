import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Shield, Bot, User, Search,
  Clock, Pause, Play, Eye, ChevronDown,
} from "lucide-react";
import {
  mockRuntimeAgents, mockAgentMonitoringSettings, mockIndividualMonitoring,
  monitoringCadenceLabels, MonitoringCadence,
  AgentIndividualMonitoring,
} from "@/types/agent";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type PauseDuration = "7_days" | "30_days" | "until_manual";
const pauseLabels: Record<PauseDuration, string> = {
  "7_days": "Pause 7 Days",
  "30_days": "Pause 30 Days",
  "until_manual": "Pause Until Manual Resume",
};

export default function AgentMonitoringSettings() {
  const { agentId } = useParams();
  const navigate = useNavigate();

  const agent = mockRuntimeAgents.find(a => a.id === agentId);
  const agentName = agent?.name || "Agent";
  const settings = mockAgentMonitoringSettings.find(s => s.agentId === agentId);

  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [cadence, setCadence] = useState<MonitoringCadence>(settings?.cadence ?? "realtime");
  const [debounceHours, setDebounceHours] = useState(settings?.debounceHours ?? 6);
  const [quietStart, setQuietStart] = useState(settings?.quietHoursStart ?? "");
  const [quietEnd, setQuietEnd] = useState(settings?.quietHoursEnd ?? "");
  const [searchQuery, setSearchQuery] = useState("");

  // Local mutable state for per-individual toggles
  const [individualStates, setIndividualStates] = useState<AgentIndividualMonitoring[]>(
    () => mockIndividualMonitoring.filter(m => m.agentId === agentId)
  );

  const [pauseMenuOpen, setPauseMenuOpen] = useState<string | null>(null);
  const [indListOpen, setIndListOpen] = useState(false);

  const filteredIndividuals = individualStates.filter(ind =>
    ind.individualName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleIndividual = (individualId: string) => {
    setIndividualStates(prev => prev.map(ind =>
      ind.individualId === individualId
        ? { ...ind, enabled: !ind.enabled, pausedUntil: null, updatedAt: new Date().toISOString().split("T")[0] }
        : ind
    ));
  };

  const pauseIndividual = (individualId: string, duration: PauseDuration) => {
    const now = new Date();
    let pauseUntil: string;
    if (duration === "7_days") {
      now.setDate(now.getDate() + 7);
      pauseUntil = now.toISOString().split("T")[0];
    } else if (duration === "30_days") {
      now.setDate(now.getDate() + 30);
      pauseUntil = now.toISOString().split("T")[0];
    } else {
      pauseUntil = "Until Manual Resume";
    }
    setIndividualStates(prev => prev.map(ind =>
      ind.individualId === individualId
        ? { ...ind, enabled: false, pausedUntil: pauseUntil, updatedAt: new Date().toISOString().split("T")[0] }
        : ind
    ));
    setPauseMenuOpen(null);
    toast({
      title: "Monitoring Paused",
      description: `Paused monitoring for ${individualStates.find(i => i.individualId === individualId)?.individualName} — ${pauseLabels[duration]}.`,
    });
  };

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: `Auto-Monitor settings for "${agentName}" have been updated successfully.`,
    });
    navigate("/platform/agents");
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/platform/agents")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">{agentName}</h2>
              <p className="text-[11px] text-muted-foreground">Auto-Monitor Settings</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/platform/agents/${agentId}/drafts`)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs border border-border transition-all">
            <Eye className="h-3.5 w-3.5" /> View Drafts
          </button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[800px] mx-auto space-y-6">
          {/* Master Toggle */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground">Auto-Monitor (Draft Mode)</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Automatically generate draft compliance runs in the background. No iCM writes occur.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2">
              <Shield className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Draft runs are <span className="font-semibold text-foreground">read-only</span>. All outputs remain in the Draft Store until a human explicitly uses <span className="font-semibold text-foreground">Review & Apply</span>.
              </p>
            </div>
          </motion.div>

          {/* Cadence & Debounce */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cn("glass rounded-xl p-6 space-y-5", !enabled && "opacity-50 pointer-events-none")}
          >
            <h4 className="text-sm font-semibold text-foreground">Monitoring Cadence</h4>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Cadence</label>
              <Select value={cadence} onValueChange={(v) => setCadence(v as MonitoringCadence)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {(Object.entries(monitoringCadenceLabels) as [MonitoringCadence, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Realtime: event-driven + daily catch-up sweep. Hourly/Daily: scheduled only.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Debounce Window (hours)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1} max={24} value={debounceHours}
                  onChange={e => setDebounceHours(Number(e.target.value))}
                  className="w-24 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">Max 1 draft per individual per agent within this window (unless Hard Stop detected)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Quiet Hours Start</label>
                <input
                  type="time" value={quietStart}
                  onChange={e => setQuietStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Quiet Hours End</label>
                <input
                  type="time" value={quietEnd}
                  onChange={e => setQuietEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Scheduled runs won't be enqueued during quiet hours. Event-triggered runs (e.g., ambient sessions) are still processed.</p>
          </motion.div>

          {/* Event Triggers Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn("glass rounded-xl p-6", !enabled && "opacity-50 pointer-events-none")}
          >
            <h4 className="text-sm font-semibold text-foreground mb-3">Event Triggers</h4>
            <div className="space-y-2">
              {[
                { icon: Clock, label: "Ambient Session Completed", desc: "When Stop & Process finishes for a linked individual" },
                { icon: Play, label: "Apply Plan Executed", desc: "When new authoritative data is written to iCM" },
                { icon: Eye, label: "Scheduled Sweep", desc: "Daily catch-up detecting changes in PCP, authorizations, utilization, incidents, barriers" },
              ].map((trigger) => (
                <div key={trigger.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                  <trigger.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{trigger.label}</p>
                    <p className="text-[10px] text-muted-foreground">{trigger.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Per-Individual Monitoring */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cn("glass rounded-xl p-6", !enabled && "opacity-50 pointer-events-none")}
          >
            <button
              type="button"
              onClick={() => setIndListOpen(prev => !prev)}
              className="w-full flex items-center justify-between"
            >
              <div className="text-left">
                <h4 className="text-sm font-semibold text-foreground">Per-Individual Monitoring</h4>
                <p className="text-[11px] text-muted-foreground">Toggle monitoring ON/OFF for each individual. Pause temporarily to suppress draft generation.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{individualStates.filter(i => i.enabled).length}/{individualStates.length} active</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", indListOpen && "rotate-180")} />
              </div>
            </button>

            {indListOpen && (
              <div className="mt-4">
                <div className="relative max-w-xs mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search individuals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredIndividuals.map((ind) => (
                    <div key={ind.individualId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ind.individualName}</p>
                          {ind.pausedUntil && (
                            <p className="text-[10px] text-warning flex items-center gap-1">
                              <Pause className="h-2.5 w-2.5" /> Paused until {ind.pausedUntil}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ind.enabled && (
                          <div className="relative">
                            <button
                              onClick={() => setPauseMenuOpen(pauseMenuOpen === ind.individualId ? null : ind.individualId)}
                              className="px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                            >
                              <Pause className="h-3 w-3" /> Pause
                              <ChevronDown className="h-2.5 w-2.5" />
                            </button>
                            {pauseMenuOpen === ind.individualId && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setPauseMenuOpen(null)} />
                                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-popover border border-border shadow-xl z-50 py-1">
                                  {(Object.entries(pauseLabels) as [PauseDuration, string][]).map(([key, label]) => (
                                    <button
                                      key={key}
                                      onClick={() => pauseIndividual(ind.individualId, key)}
                                      className="w-full text-left px-3 py-2 text-xs text-popover-foreground hover:bg-muted transition-colors"
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <Switch checked={ind.enabled} onCheckedChange={() => toggleIndividual(ind.individualId)} />
                      </div>
                    </div>
                  ))}
                  {filteredIndividuals.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No individuals found.</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Save */}
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate("/lifeplan")} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm border border-border">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg">
              Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
