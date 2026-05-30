import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Info, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Deadline } from "./ForwardComplianceCalendar";

interface Recommendation {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "compliance" | "billing" | "eligibility" | "documentation";
  title: string;
  description: string;
  action: string;
  affectedIndividuals: { id: string; name: string }[];
}

function buildRecommendations(deadlines: Deadline[], draftCount: number): Recommendation[] {
  const recs: Recommendation[] = [];

  const overduePCPs = deadlines.filter(d => d.type === "PCP Renewal" && d.daysUntil < 0);
  if (overduePCPs.length > 0) {
    recs.push({
      id: "overdue-pcps",
      severity: "critical",
      category: "compliance",
      title: `${overduePCPs.length} individual${overduePCPs.length > 1 ? "s have" : " has"} overdue PCP renewals`,
      description: `PCP renewal is past due — this is an active compliance risk. Begin renewal immediately to avoid audit findings.`,
      action: "Begin PCP Renewal",
      affectedIndividuals: overduePCPs.map(d => ({ id: d.individualId, name: d.individualName })),
    });
  }

  const upcomingPCPs = deadlines.filter(d => d.type === "PCP Renewal" && d.daysUntil >= 0 && d.daysUntil <= 30);
  if (upcomingPCPs.length > 0) {
    recs.push({
      id: "upcoming-pcps",
      severity: "warning",
      category: "compliance",
      title: `${upcomingPCPs.length} PCP renewal${upcomingPCPs.length > 1 ? "s" : ""} due within 30 days`,
      description: `Start the renewal process now to avoid compliance gaps. ${upcomingPCPs[0].daysUntil} days remaining for the most urgent case.`,
      action: "Review PCP Calendar",
      affectedIndividuals: upcomingPCPs.map(d => ({ id: d.individualId, name: d.individualName })),
    });
  }

  const overdueMA = deadlines.filter(d => d.type === "MA Renewal" && d.daysUntil < 0);
  const upcomingMA = deadlines.filter(d => d.type === "MA Renewal" && d.daysUntil >= 0 && d.daysUntil <= 30);
  const maItems = [...overdueMA, ...upcomingMA];
  if (maItems.length > 0) {
    recs.push({
      id: "ma-renewals",
      severity: overdueMA.length > 0 ? "critical" : "warning",
      category: "eligibility",
      title: `${maItems.length} Medicaid renewal${maItems.length > 1 ? "s" : ""} require${maItems.length === 1 ? "s" : ""} attention`,
      description: `MA lapse interrupts services and billing. Process renewals immediately — lapsed coverage creates billing clawback risk.`,
      action: "Start MA Renewal",
      affectedIndividuals: maItems.map(d => ({ id: d.individualId, name: d.individualName })),
    });
  }

  const overdueVisits = deadlines.filter(d => d.type === "Quarterly Visit Due" && d.daysUntil < 0);
  if (overdueVisits.length > 0) {
    recs.push({
      id: "overdue-visits",
      severity: "warning",
      category: "compliance",
      title: `${overdueVisits.length} quarterly visit${overdueVisits.length > 1 ? "s are" : " is"} overdue`,
      description: `Quarterly visits are required for active waiver participants. Schedule and document visits to maintain compliance.`,
      action: "Schedule Visits",
      affectedIndividuals: overdueVisits.map(d => ({ id: d.individualId, name: d.individualName })),
    });
  }

  if (draftCount > 0) {
    recs.push({
      id: "pending-drafts",
      severity: "info",
      category: "documentation",
      title: `${draftCount} AI draft${draftCount > 1 ? "s" : ""} awaiting your review`,
      description: `The orchestrator has prepared documentation drafts ready for case manager review and approval. Nothing is submitted without your confirmation.`,
      action: "Review Drafts",
      affectedIndividuals: [],
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return recs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

const SEVERITY_CONFIG = {
  critical: { bg: "bg-icm-red-soft", text: "text-icm-red", badge: "bg-icm-red text-white", border: "border-icm-red/20", icon: AlertTriangle },
  warning:  { bg: "bg-icm-amber-soft", text: "text-icm-amber", badge: "bg-icm-amber text-white", border: "border-icm-amber/20", icon: AlertTriangle },
  info:     { bg: "bg-icm-accent-soft", text: "text-icm-accent", badge: "bg-icm-accent text-white", border: "border-icm-accent/20", icon: Info },
};

const CATEGORY_LABELS: Record<string, string> = {
  compliance: "COMPLIANCE", billing: "BILLING", eligibility: "ELIGIBILITY", documentation: "DOCUMENTATION",
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const navigate = useNavigate();
  const cfg = SEVERITY_CONFIG[rec.severity];
  const Icon = cfg.icon;
  const shown = rec.affectedIndividuals.slice(0, 3);
  const extra = rec.affectedIndividuals.length - 3;

  return (
    <div className={cn("rounded-xl border border-l-[3px] p-4 space-y-3", cfg.bg, cfg.border, rec.severity === "critical" ? "border-l-icm-red" : rec.severity === "warning" ? "border-l-icm-amber" : "border-l-icm-accent")}>
      <div className="flex items-start gap-2 flex-wrap">
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-geist font-bold", cfg.badge)}>
          <Icon className="w-3 h-3" />
          {rec.severity.toUpperCase()}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-geist font-bold bg-icm-bg text-icm-text-dim border border-icm-border">
          {CATEGORY_LABELS[rec.category]}
        </span>
        {rec.affectedIndividuals.length > 0 && (
          <span className="text-[11px] font-geist text-icm-text-dim ml-auto">
            {rec.affectedIndividuals.length} individual{rec.affectedIndividuals.length > 1 ? "s" : ""} affected
          </span>
        )}
      </div>

      <div>
        <p className="font-geist font-bold text-[13.5px] text-icm-text">{rec.title}</p>
        <p className="text-[12px] font-geist text-icm-text-dim mt-1 leading-relaxed">{rec.description}</p>
      </div>

      {shown.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shown.map(ind => (
            <button
              key={ind.id}
              onClick={() => navigate(`/people/${ind.id}/echart`)}
              className="text-[11px] font-geist font-semibold px-2 py-0.5 rounded-full bg-icm-bg border border-icm-border text-icm-text hover:border-icm-accent hover:text-icm-accent transition-colors"
            >
              {ind.name}
            </button>
          ))}
          {extra > 0 && (
            <span className="text-[11px] font-geist text-icm-text-faint px-2 py-0.5">+{extra} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end pt-1 border-t border-black/5">
        <button className="inline-flex items-center gap-1 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">
          {rec.action} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface OrchestratorRecommendationsProps {
  deadlines: Deadline[];
  draftsCount: number;
}

export function OrchestratorRecommendations({ deadlines, draftsCount }: OrchestratorRecommendationsProps) {
  const recs = useMemo(() => buildRecommendations(deadlines, draftsCount), [deadlines, draftsCount]);

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-icm-border bg-icm-bg/60 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-icm-accent" />
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Orchestrator Recommendations</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            Prioritized actions based on the latest compliance scan.
          </p>
        </div>
      </div>

      <div className="p-4">
        {recs.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-icm-green mb-2" />
            <p className="font-geist font-semibold text-[13px] text-icm-text">No urgent recommendations at this time.</p>
            <p className="text-[12px] font-geist text-icm-text-dim mt-1">
              All compliance items are on track for the next 90 days.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recs.map(r => <RecommendationCard key={r.id} rec={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
