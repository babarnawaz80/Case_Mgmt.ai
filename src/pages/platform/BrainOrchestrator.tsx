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
import { PromptStudio } from "@/components/orchestrator/PromptStudio";
import { ForwardComplianceCalendar } from "@/components/orchestrator/ForwardComplianceCalendar";
import { OrchestratorRecommendations } from "@/components/orchestrator/OrchestratorRecommendations";
import { useMemo } from "react";

const BrainOrchestrator = () => {
  const navigate = useNavigate();
  const { role, isAdmin } = useRole();

  // Access guard: supervisor, admin, and platform_admin
  if (role !== "admin" && role !== "supervisor" && role !== "platform_admin") {
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
    <ICMShell title="AI Orchestrator" showAIPanel={false}>
      <div className="space-y-5 max-w-[1280px]">
        <Breadcrumbs
          backTo="/agents"
          backLabel="AI Agents"
          items={[
            { label: "AI Agents", to: "/agents" },
            { label: "AI Orchestrator" },
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

        {/* Section 3 — Forward Compliance Calendar */}
        <ForwardComplianceCalendar
          individuals={individuals}
          loading={individualsLoading}
        />

        {/* Section 4 — AI Recommendations (derived from calendar data) */}
        <OrchestratorRecommendationsWrapper
          individuals={individuals}
          draftsCount={draftsReadyCount}
        />

        {/* Section 5 — Agent Activity Feed + Run History */}
        <div>
          <SectionHeading>Agent Activity</SectionHeading>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3" style={{ minHeight: 400 }}>
              <AgentActivityFeed logs={logs} loading={logsLoading} />
            </div>
            <div className="lg:col-span-2">
              <RunHistory runs={runs} loading={runsLoading} />
            </div>
          </div>
        </div>

        {/* Section 6 — Individual Compliance Grid */}
        <div>
          <SectionHeading>Individual Compliance Grid</SectionHeading>
          <IndividualComplianceGrid
            individuals={individuals}
            tasks={tasks}
            loading={individualsLoading}
          />
        </div>

        {/* Section 7 — Prompt Studio */}
        <div>
          <SectionHeading>Prompt Studio — Agent Intelligence</SectionHeading>
          <PromptStudio />
        </div>

        {/* AI Draft disclaimer */}
        <div className="rounded-xl border border-icm-border bg-icm-bg px-4 py-3 flex gap-2.5 items-start">
          <span className="text-[10px] font-geist font-bold px-1.5 py-0.5 rounded bg-icm-amber-soft text-icm-amber border border-icm-amber/20 shrink-0 mt-0.5">
            AI DRAFT
          </span>
          <p className="text-[11.5px] font-geist text-icm-text-dim leading-relaxed">
            All AI-generated content created by the AI Orchestrator is labeled "AI DRAFT — Requires Review".
            The orchestrator <strong className="text-icm-text">prepares everything</strong> — humans{" "}
            <strong className="text-icm-text">approve everything</strong>. Nothing writes to a participant record
            without explicit CM or supervisor confirmation.
          </p>
        </div>
      </div>
    </ICMShell>
  );
}

function OrchestratorRecommendationsWrapper({
  individuals,
  draftsCount,
}: {
  individuals: ReturnType<typeof useIndividuals>["individuals"];
  draftsCount: number;
}) {
  // Build deadlines from individuals for recommendations
  const deadlines = useMemo(() => {
    const today = new Date();
    const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const items: import("@/components/orchestrator/ForwardComplianceCalendar").Deadline[] = [];
    for (const ind of individuals) {
      if (ind.enrollment_status !== "active") continue;
      const name = `${ind.last_name}, ${ind.first_name}`;
      const cm = ind.assigned_case_manager_name ?? "—";
      const push = (type: import("@/components/orchestrator/ForwardComplianceCalendar").DeadlineType, dueDate: Date) => {
        const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (dueDate > ninetyDays && days >= 0) return;
        const status: "overdue" | "at_risk" | "on_track" = days < 0 ? "overdue" : days <= 30 ? "at_risk" : "on_track";
        items.push({ id: `${ind.id}-${type}`, type, individualId: ind.id, individualName: name, caseManager: cm, dueDate, daysUntil: days, status });
      };
      if (ind.pcp_due_date ?? ind.isp_due_date) push("PCP Renewal", new Date((ind.pcp_due_date ?? ind.isp_due_date)!));
      if (ind.ma_redetermination_date) push("MA Renewal", new Date(ind.ma_redetermination_date));
      if (ind.last_visit_date) push("Quarterly Visit Due", new Date(new Date(ind.last_visit_date).getTime() + 90 * 24 * 60 * 60 * 1000));
    }
    return items;
  }, [individuals]);

  return <OrchestratorRecommendations deadlines={deadlines} draftsCount={draftsCount} />;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-manrope text-[15px] font-bold text-icm-text mb-3">{children}</h2>
  );
}

export default BrainOrchestrator;
