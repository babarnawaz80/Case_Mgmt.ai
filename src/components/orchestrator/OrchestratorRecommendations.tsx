import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Info, ChevronRight, ChevronDown, Sparkles, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Deadline } from "./ForwardComplianceCalendar";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  if (overduePCPs.length > 0) recs.push({
    id: "overdue-pcps", severity: "critical", category: "compliance",
    title: `${overduePCPs.length} individual${overduePCPs.length > 1 ? "s have" : " has"} overdue PCP renewals`,
    description: "PCP renewal is past due — active compliance risk. Begin renewal immediately to avoid audit findings.",
    action: "Begin PCP Renewal",
    affectedIndividuals: overduePCPs.map(d => ({ id: d.individualId, name: d.individualName })),
  });

  const upcomingPCPs = deadlines.filter(d => d.type === "PCP Renewal" && d.daysUntil >= 0 && d.daysUntil <= 30);
  if (upcomingPCPs.length > 0) recs.push({
    id: "upcoming-pcps", severity: "warning", category: "compliance",
    title: `${upcomingPCPs.length} PCP renewal${upcomingPCPs.length > 1 ? "s" : ""} due within 30 days`,
    description: `Start the renewal process now. ${upcomingPCPs[0]?.daysUntil} days remaining for the most urgent case.`,
    action: "Review PCP Calendar",
    affectedIndividuals: upcomingPCPs.map(d => ({ id: d.individualId, name: d.individualName })),
  });

  const overdueMA = deadlines.filter(d => d.type === "MA Renewal" && d.daysUntil < 0);
  const upcomingMA = deadlines.filter(d => d.type === "MA Renewal" && d.daysUntil >= 0 && d.daysUntil <= 30);
  const maItems = [...overdueMA, ...upcomingMA];
  if (maItems.length > 0) recs.push({
    id: "ma-renewals", severity: overdueMA.length > 0 ? "critical" : "warning", category: "eligibility",
    title: `${maItems.length} Medicaid renewal${maItems.length > 1 ? "s" : ""} require attention`,
    description: "MA lapse interrupts services and billing. Process renewals immediately.",
    action: "Start MA Renewal",
    affectedIndividuals: maItems.map(d => ({ id: d.individualId, name: d.individualName })),
  });

  const overdueVisits = deadlines.filter(d => d.type === "Quarterly Visit Due" && d.daysUntil < 0);
  if (overdueVisits.length > 0) recs.push({
    id: "overdue-visits", severity: "warning", category: "compliance",
    title: `${overdueVisits.length} quarterly visit${overdueVisits.length > 1 ? "s are" : " is"} overdue`,
    description: "Quarterly visits are required for active waiver participants. Schedule and document visits.",
    action: "Schedule Visits",
    affectedIndividuals: overdueVisits.map(d => ({ id: d.individualId, name: d.individualName })),
  });

  if (draftCount > 0) recs.push({
    id: "pending-drafts", severity: "info", category: "documentation",
    title: `${draftCount} AI draft${draftCount > 1 ? "s" : ""} awaiting your review`,
    description: "The orchestrator has prepared documentation drafts ready for case manager review.",
    action: "Review Drafts",
    affectedIndividuals: [],
  });

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return recs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

const SEVERITY_CONFIG = {
  critical: { bg: "bg-icm-red-soft", badge: "bg-icm-red text-white", border: "border-l-icm-red", icon: AlertTriangle },
  warning:  { bg: "bg-icm-amber-soft", badge: "bg-icm-amber text-white", border: "border-l-icm-amber", icon: AlertTriangle },
  info:     { bg: "bg-icm-accent-soft", badge: "bg-icm-accent text-white", border: "border-l-icm-accent", icon: Info },
};

const CATEGORY_LABELS: Record<string, string> = {
  compliance: "COMPLIANCE", billing: "BILLING", eligibility: "ELIGIBILITY", documentation: "DOCUMENTATION",
};

function RecommendationCard({
  rec, defaultExpanded, onDismiss, onSnooze,
}: {
  rec: Recommendation;
  defaultExpanded: boolean;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cfg = SEVERITY_CONFIG[rec.severity];
  const Icon = cfg.icon;
  const shown = rec.affectedIndividuals.slice(0, 3);
  const extra = rec.affectedIndividuals.length - 3;

  return (
    <div className={cn("rounded-xl border border-l-[3px] overflow-hidden", cfg.bg, cfg.border)}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:opacity-90 transition-opacity"
      >
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-geist font-bold shrink-0", cfg.badge)}>
          <Icon className="w-3 h-3" />
          {rec.severity.toUpperCase()}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-geist font-bold bg-icm-bg text-icm-text-dim border border-icm-border shrink-0">
          {CATEGORY_LABELS[rec.category]}
        </span>
        <span className="text-[13px] font-geist font-bold text-icm-text flex-1 min-w-0 truncate">{rec.title}</span>
        {rec.affectedIndividuals.length > 0 && (
          <span className="text-[11px] font-geist text-icm-text-dim shrink-0">{rec.affectedIndividuals.length} affected</span>
        )}
        {expanded
          ? <ChevronDown className="w-4 h-4 text-icm-text-faint shrink-0" />
          : <ChevronRight className="w-4 h-4 text-icm-text-faint shrink-0" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5">
          <p className="text-[12px] font-geist text-icm-text-dim leading-relaxed pt-2">{rec.description}</p>

          {shown.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {shown.map(ind => (
                <button key={ind.id} onClick={() => navigate(`/people/${ind.id}/echart`)}
                  className="text-[11px] font-geist font-semibold px-2 py-0.5 rounded-full bg-icm-bg border border-icm-border text-icm-text hover:border-icm-accent hover:text-icm-accent transition-colors">
                  {ind.name}
                </button>
              ))}
              {extra > 0 && <span className="text-[11px] font-geist text-icm-text-faint px-2 py-0.5">+{extra} more</span>}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-black/5 flex-wrap gap-2">
            <button className="inline-flex items-center gap-1 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">
              {rec.action} <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => onSnooze(rec.id)}
                className="inline-flex items-center gap-1 text-[11px] font-geist text-icm-text-dim hover:text-icm-text">
                <Clock className="w-3.5 h-3.5" /> Snooze 7 days
              </button>
              <button onClick={() => onDismiss(rec.id)}
                className="inline-flex items-center gap-1 text-[11px] font-geist text-icm-text-dim hover:text-icm-red transition-colors">
                <X className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrchestratorRecommendationsProps {
  deadlines: Deadline[];
  draftsCount: number;
}

export function OrchestratorRecommendations({ deadlines, draftsCount }: OrchestratorRecommendationsProps) {
  const { userProfile } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);

  const allRecs = useMemo(() => buildRecommendations(deadlines, draftsCount), [deadlines, draftsCount]);
  const recs = allRecs.filter(r => !dismissed.has(r.id) && !snoozed.has(r.id));

  // Load dismissed/snoozed from Firestore
  useEffect(() => {
    const orgId = userProfile?.organizationId;
    if (!orgId) return;
    getDocs(query(collection(db, "orchestrator_recommendation_states"),
      where("organizationId", "==", orgId)
    )).then(snap => {
      const now = new Date();
      const dis = new Set<string>();
      const sno = new Set<string>();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.action === "dismissed") dis.add(data.recommendationId);
        else if (data.action === "snoozed" && data.snoozedUntil?.toDate() > now) sno.add(data.recommendationId);
      });
      setDismissed(dis);
      setSnoozed(sno);
    }).catch(() => {});
  }, [userProfile?.organizationId]);

  async function saveState(recId: string, action: "dismissed" | "snoozed") {
    const orgId = userProfile?.organizationId;
    if (!orgId) return;
    try {
      await addDoc(collection(db, "orchestrator_recommendation_states"), {
        organizationId: orgId,
        recommendationId: recId,
        action,
        snoozedUntil: action === "snoozed" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
        dismissedBy: userProfile?.uid || "unknown",
        createdAt: serverTimestamp(),
      });
    } catch { /* non-fatal */ }
  }

  function handleDismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]));
    saveState(id, "dismissed");
    toast.success("Recommendation dismissed");
  }

  function handleSnooze(id: string) {
    setSnoozed(prev => new Set([...prev, id]));
    saveState(id, "snoozed");
    toast.success("Snoozed for 7 days");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-icm-accent" />
          <p className="font-geist font-semibold text-[14px] text-icm-text">Orchestrator Recommendations</p>
          <span className="text-[11px] font-geist text-icm-text-dim">
            Prioritized actions from the latest compliance scan
          </span>
        </div>
        {recs.length > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setAllExpanded(false)} className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text">Collapse all</button>
            <span className="text-icm-border">|</span>
            <button onClick={() => setAllExpanded(true)} className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text">Expand all</button>
          </div>
        )}
      </div>

      {recs.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-icm-green mb-2" />
          <p className="font-geist font-semibold text-[13px] text-icm-text">No urgent recommendations at this time.</p>
          <p className="text-[12px] font-geist text-icm-text-dim mt-1">All compliance items are on track for the next 90 days.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recs.map(r => (
            <RecommendationCard
              key={r.id}
              rec={r}
              defaultExpanded={allExpanded !== null ? allExpanded : r.severity === "critical"}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      )}
    </div>
  );
}
