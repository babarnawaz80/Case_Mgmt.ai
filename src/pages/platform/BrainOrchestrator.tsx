import { useNavigate } from "react-router-dom";
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

const BrainOrchestrator = () => {
  const navigate = useNavigate();
  const { role, isAdmin } = useRole();

  // Access guard: supervisor and admin only
  if (role !== "admin" && role !== "supervisor") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  return <BrainOrchestratorContent isAdmin={isAdmin} />;
};

function BrainOrchestratorContent({ isAdmin }: { isAdmin: boolean }) {
  const {
    runs,
    logs,
    tasks,
    runsLoading,
    logsLoading,
    running,
    runProgress,
    lastRun,
    nextRunDate,
    openTasksCount,
    draftsReadyCount,
    triggerRun,
  } = useOrchestrator();

  const { individuals, loading: individualsLoading } = useIndividuals();

  return (
    <ICMShell title="Brain Orchestrator" showAIPanel={false}>
      <div className="space-y-5 max-w-[1280px]">
        <Breadcrumbs
          backTo="/platform"
          backLabel="Platform Hub"
          items={[
            { label: "Platform Hub", to: "/platform" },
            { label: "Brain Orchestrator" },
          ]}
        />

        {/* Section 1 — System Status Header */}
        <SystemStatusHeader
          lastRun={lastRun}
          nextRunDate={nextRunDate}
          running={running}
          runProgress={runProgress}
          onRunNow={triggerRun}
          isAdmin={isAdmin}
          loading={runsLoading}
        />

        {/* Section 2 — Organization Health Metrics */}
        <div>
          <SectionHeading>Organization Health</SectionHeading>
          <HealthMetricsRow
            tasks={tasks}
            openTasksCount={openTasksCount}
            draftsReadyCount={draftsReadyCount}
            individuals={individuals}
            individualsLoading={individualsLoading}
          />
        </div>

        {/* Section 3 — Agent Activity Feed + Run History */}
        <div>
          <SectionHeading>Agent Activity</SectionHeading>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Activity feed: 60% */}
            <div className="lg:col-span-3" style={{ minHeight: 400 }}>
              <AgentActivityFeed logs={logs} loading={logsLoading} />
            </div>
            {/* Run history: 40% */}
            <div className="lg:col-span-2">
              <RunHistory runs={runs} loading={runsLoading} />
            </div>
          </div>
        </div>

        {/* Section 4 — Individual Compliance Grid */}
        <div>
          <SectionHeading>Individual Compliance Grid</SectionHeading>
          <IndividualComplianceGrid
            individuals={individuals}
            tasks={tasks}
            loading={individualsLoading}
          />
        </div>

        {/* AI Draft disclaimer */}
        <div className="rounded-xl border border-icm-border bg-icm-bg px-4 py-3 flex gap-2.5 items-start">
          <span className="text-[10px] font-geist font-bold px-1.5 py-0.5 rounded bg-icm-amber-soft text-icm-amber border border-icm-amber/20 shrink-0 mt-0.5">
            AI DRAFT
          </span>
          <p className="text-[11.5px] font-geist text-icm-text-dim leading-relaxed">
            All AI-generated content created by the Brain Orchestrator is labeled "AI DRAFT — Requires Review".
            The orchestrator <strong className="text-icm-text">prepares everything</strong> — humans{" "}
            <strong className="text-icm-text">approve everything</strong>. Nothing writes to a participant record
            without explicit CM or supervisor confirmation.
          </p>
        </div>
      </div>
    </ICMShell>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-manrope text-[15px] font-bold text-icm-text mb-3">{children}</h2>
  );
}

export default BrainOrchestrator;
