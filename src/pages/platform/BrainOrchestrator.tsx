import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useRole } from "@/contexts/RoleContext";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import { useIndividuals } from "@/hooks/useIndividuals";
import { SystemStatusHeader } from "@/components/orchestrator/SystemStatusHeader";
import { HealthMetricsRow } from "@/components/orchestrator/HealthMetricsRow";
import { AgentActivityFeed } from "@/components/orchestrator/AgentActivityFeed";
import { RunHistory } from "@/components/orchestrator/RunHistory";
import { IndividualComplianceGrid } from "@/components/orchestrator/IndividualComplianceGrid";
import { PromptStudio } from "@/components/orchestrator/PromptStudio";
import { ForwardComplianceCalendar, buildDeadlines, type Deadline } from "@/components/orchestrator/ForwardComplianceCalendar";
import { OrchestratorRecommendations } from "@/components/orchestrator/OrchestratorRecommendations";
import { AuthorizationHealthSection } from "@/components/orchestrator/AuthorizationHealthSection";
import { StateComplianceBreakdown } from "@/components/orchestrator/StateComplianceBreakdown";
import { cn } from "@/lib/utils";

// ─── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",         label: "Overview" },
  { id: "calendar",         label: "Compliance Calendar" },
  { id: "recommendations",  label: "Recommendations", showBadge: true },
  { id: "activity",         label: "Activity & Runs" },
  { id: "prompt-studio",    label: "Prompt Studio" },
] as const;

type TabId = typeof TABS[number]["id"];

function TabBar({ active, onChange, recCount }: { active: TabId; onChange: (t: TabId) => void; recCount: number }) {
  return (
    <div className="border-b border-icm-border bg-icm-panel">
      <div className="flex overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-5 py-3 text-[13px] font-geist whitespace-nowrap relative transition-colors flex-shrink-0",
              active === tab.id
                ? "font-bold text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-600"
                : "text-icm-text-dim hover:text-icm-text"
            )}
          >
            {tab.label}
            {tab.showBadge && recCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-icm-red text-white text-[9px] font-bold">
                {recCount > 9 ? "9+" : recCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Guard & page wrapper ──────────────────────────────────────────────────────

const BrainOrchestrator = () => {
  const navigate = useNavigate();
  const { role, isAdmin } = useRole();
  if (role !== "admin" && role !== "supervisor" && role !== "platform_admin") {
    navigate("/dashboard", { replace: true });
    return null;
  }
  return <BrainOrchestratorContent isAdmin={isAdmin} />;
};

function BrainOrchestratorContent({ isAdmin }: { isAdmin: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as TabId | null;
  const validTabs: TabId[] = TABS.map(t => t.id);
  const activeTab: TabId = rawTab && validTabs.includes(rawTab) ? rawTab : "overview";

  // Track which tabs have been mounted (for lazy loading)
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set(["overview"]));
  const [selectedState, setSelectedState] = useState("all");

  // Derive available states from individuals
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    individuals.forEach(ind => {
      const s = ind.state || (ind as any).address_state;
      if (s) states.add(s);
    });
    return [...states].sort();
  }, [individuals]);

  // Filter individuals by selected state
  const filteredIndividuals = useMemo(() =>
    selectedState === "all" ? individuals : individuals.filter(ind => {
      const s = ind.state || (ind as any).address_state;
      return s === selectedState;
    }), [individuals, selectedState]);

  function handleTabChange(tab: TabId) {
    setMountedTabs(prev => new Set([...prev, tab]));
    setSearchParams({ tab }, { replace: true });
  }

  const {
    runs, logs, tasks,
    runsLoading, logsLoading, running, runProgress,
    lastRun, nextRunDate, openTasksCount, draftsReadyCount,
    triggerRun,
  } = useOrchestrator();

  const { individuals, loading: individualsLoading } = useIndividuals();

  // Build deadlines for recommendations badge count
  const deadlines: Deadline[] = useMemo(() => buildDeadlines(individuals), [individuals]);
  const recCount = useMemo(() => {
    const overduePCPs = deadlines.filter(d => d.type === "PCP Renewal" && d.daysUntil < 0).length > 0 ? 1 : 0;
    const upcomingPCPs = deadlines.filter(d => d.type === "PCP Renewal" && d.daysUntil >= 0 && d.daysUntil <= 30).length > 0 ? 1 : 0;
    const maItems = deadlines.filter(d => d.type === "MA Renewal" && d.daysUntil <= 30).length > 0 ? 1 : 0;
    const visits = deadlines.filter(d => d.type === "Quarterly Visit Due" && d.daysUntil < 0).length > 0 ? 1 : 0;
    const drafts = draftsReadyCount > 0 ? 1 : 0;
    return overduePCPs + upcomingPCPs + maItems + visits + drafts;
  }, [deadlines, draftsReadyCount]);

  return (
    <ICMShell title="AI Orchestrator" showAIPanel={false}>
      <div className="space-y-4 max-w-[1400px]">
        <Breadcrumbs
          backTo="/agents"
          backLabel="AI Agents"
          items={[{ label: "AI Agents", to: "/agents" }, { label: "AI Orchestrator" }]}
        />

        {/* Always-visible header */}
        <SystemStatusHeader
          lastRun={lastRun}
          nextRunDate={nextRunDate}
          running={running}
          runProgress={runProgress}
          onRunNow={triggerRun}
          isAdmin={isAdmin}
          loading={runsLoading}
        />

        {/* State filter — only shown when multiple states present */}
        {availableStates.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-geist text-icm-text-dim">Filter by state:</span>
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12px] font-geist text-icm-text"
            >
              <option value="all">All States ({individuals.length} individuals)</option>
              {availableStates.map(s => (
                <option key={s} value={s}>{s} ({individuals.filter(i => (i.state || (i as any).address_state) === s).length})</option>
              ))}
            </select>
            {selectedState !== "all" && (
              <button onClick={() => setSelectedState("all")}
                className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text">
                Clear ×
              </button>
            )}
          </div>
        )}

        {/* Always-visible stat cards */}
        <HealthMetricsRow
          tasks={tasks}
          openTasksCount={openTasksCount}
          draftsReadyCount={draftsReadyCount}
          individuals={individuals}
          individualsLoading={individualsLoading}
        />

        {/* Tab bar */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <TabBar active={activeTab} onChange={handleTabChange} recCount={recCount} />

          <div className="min-h-[400px]">
            {/* ── Overview Tab ──────────────────────────────────────────── */}
            <div className={activeTab === "overview" ? "p-5" : "hidden"}>
              {mountedTabs.has("overview") && (
                <div className="space-y-5">
                  <StateComplianceBreakdown individuals={individuals} selectedState={selectedState} />
                  <AuthorizationHealthSection individuals={filteredIndividuals} />
                  <IndividualComplianceGrid
                    individuals={filteredIndividuals}
                    tasks={tasks}
                    loading={individualsLoading}
                  />
                </div>
              )}
            </div>

            {/* ── Compliance Calendar Tab ───────────────────────────────── */}
            <div className={activeTab === "calendar" ? "p-5" : "hidden"}>
              {mountedTabs.has("calendar") && (
                <ForwardComplianceCalendar
                  individuals={filteredIndividuals}
                  loading={individualsLoading}
                />
              )}
            </div>

            {/* ── Recommendations Tab ───────────────────────────────────── */}
            <div className={activeTab === "recommendations" ? "p-5" : "hidden"}>
              {mountedTabs.has("recommendations") && (
                <OrchestratorRecommendations
                  deadlines={deadlines}
                  draftsCount={draftsReadyCount}
                />
              )}
            </div>

            {/* ── Activity & Runs Tab ───────────────────────────────────── */}
            <div className={activeTab === "activity" ? "p-5" : "hidden"}>
              {mountedTabs.has("activity") && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-3" style={{ minHeight: 400 }}>
                    <AgentActivityFeed logs={logs} loading={logsLoading} />
                  </div>
                  <div className="lg:col-span-2">
                    <RunHistory runs={runs} loading={runsLoading} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Prompt Studio Tab ─────────────────────────────────────── */}
            <div className={activeTab === "prompt-studio" ? "p-5" : "hidden"}>
              {mountedTabs.has("prompt-studio") && <PromptStudio />}
            </div>
          </div>
        </div>

        {/* AI Draft disclaimer */}
        <div className="rounded-xl border border-icm-border bg-icm-bg px-4 py-3 flex gap-2.5 items-start">
          <span className="text-[10px] font-geist font-bold px-1.5 py-0.5 rounded bg-icm-amber-soft text-icm-amber border border-icm-amber/20 shrink-0 mt-0.5">
            AI DRAFT
          </span>
          <p className="text-[11.5px] font-geist text-icm-text-dim leading-relaxed">
            All AI-generated content is labeled "AI DRAFT — Requires Review". The orchestrator{" "}
            <strong className="text-icm-text">prepares everything</strong> — humans{" "}
            <strong className="text-icm-text">approve everything</strong>.
          </p>
        </div>
      </div>
    </ICMShell>
  );
}

export default BrainOrchestrator;
