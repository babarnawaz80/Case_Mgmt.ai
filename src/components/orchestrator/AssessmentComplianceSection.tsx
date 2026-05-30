import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Individual } from "@/hooks/useIndividuals";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AssessmentStats {
  onTrack: number;
  dueThisMonth: number;
  overdue: number;
  neverDone: number;
}

interface Props {
  individuals: Individual[];
}

export function AssessmentComplianceSection({ individuals }: Props) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (individuals.length === 0) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      try {
        const today = new Date();
        const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const thirteenMonthsAgo = new Date(today.getTime() - 395 * 24 * 60 * 60 * 1000);

        const activeIndividuals = individuals.filter(i => i.enrollment_status === "active");
        const s: AssessmentStats = { onTrack: 0, dueThisMonth: 0, overdue: 0, neverDone: 0 };

        // Load all assessments in one batch
        const allAssessments = await getDocs(
          query(collection(db, "assessments"), where("status", "==", "completed"))
        ).catch(() => ({ docs: [] as any[] }));

        // Build map: individualId → latest completed date
        const latestMap: Record<string, Date> = {};
        for (const d of allAssessments.docs) {
          const a = d.data();
          const id = a.individualId;
          if (!id) continue;
          const date = a.completedAt?.toDate?.() || new Date(a.date || 0);
          if (!latestMap[id] || date > latestMap[id]) latestMap[id] = date;
        }

        for (const ind of activeIndividuals) {
          const latest = latestMap[ind.id];
          if (!latest) {
            s.neverDone++;
          } else {
            const nextDue = new Date(latest.getTime() + 365 * 24 * 60 * 60 * 1000);
            if (nextDue < today) {
              s.overdue++;
            } else if (nextDue < thirtyDays) {
              s.dueThisMonth++;
            } else if (latest < thirteenMonthsAgo) {
              s.dueThisMonth++; // >13 months old, count as due soon
            } else {
              s.onTrack++;
            }
          }
        }

        setStats(s);
      } catch { /* non-fatal */ }
      finally { setLoading(false); }
    })();
  }, [individuals]);

  const cards = stats ? [
    { label: "On Track", value: stats.onTrack, icon: CheckCircle2, tone: "green" as const },
    { label: "Due This Month", value: stats.dueThisMonth, icon: Clock, tone: stats.dueThisMonth > 0 ? "amber" as const : "green" as const },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, tone: stats.overdue > 0 ? "red" as const : "green" as const },
    { label: "Never Done", value: stats.neverDone, icon: XCircle, tone: stats.neverDone > 0 ? "red" as const : "green" as const },
  ] : [];

  const toneClasses: Record<string, { value: string; bg: string; border: string }> = {
    green: { value: "text-icm-green", bg: "bg-icm-green-soft", border: "border-icm-green/20" },
    amber: { value: "text-icm-amber", bg: "bg-icm-amber-soft", border: "border-icm-amber/20" },
    red:   { value: "text-icm-red",   bg: "bg-icm-red-soft",   border: "border-icm-red/20" },
  };

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-icm-border bg-icm-bg/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-icm-accent" />
          <p className="font-manrope font-bold text-[14px] text-icm-text">Assessment Compliance</p>
        </div>
        <p className="text-[11.5px] font-geist text-icm-text-dim">Annual/initial assessment status · updated nightly</p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading assessment data…</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map(({ label, value, icon: Icon, tone }) => {
              const tc = toneClasses[tone];
              return (
                <button
                  key={label}
                  onClick={() => navigate("/people")}
                  className={cn("rounded-xl border p-3 text-left hover:shadow-sm transition-shadow", tc.bg, tc.border)}
                >
                  <Icon className={cn("w-4 h-4 mb-2", tc.value)} />
                  <p className={cn("font-manrope font-extrabold text-[22px] leading-tight", tc.value)}>{value}</p>
                  <p className="text-[10.5px] font-geist text-icm-text-dim mt-0.5 leading-snug">{label}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
