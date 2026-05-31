import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Loader2 } from "lucide-react";
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

        const allAssessments = await getDocs(
          query(collection(db, "assessments"), where("status", "==", "completed"))
        ).catch(() => ({ docs: [] as any[] }));

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
            } else if (nextDue < thirtyDays || latest < thirteenMonthsAgo) {
              s.dueThisMonth++;
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

  // Compact single-row layout — spec: ~80px total height
  const cols: { label: string; value: number; color: string }[] = stats ? [
    { label: "On track",       value: stats.onTrack,      color: stats.onTrack > 0      ? "#16a34a" : "#9ca3af" },
    { label: "Due this month", value: stats.dueThisMonth, color: stats.dueThisMonth > 0 ? "#d97706" : "#9ca3af" },
    { label: "Overdue",        value: stats.overdue,      color: stats.overdue > 0      ? "#dc2626" : "#9ca3af" },
    { label: "Never done",     value: stats.neverDone,    color: stats.neverDone > 0    ? "#dc2626" : "#9ca3af" },
  ] : [];

  return (
    <div
      className="bg-white overflow-hidden cursor-pointer"
      style={{ border: "0.5px solid #e5e7eb", borderRadius: 12 }}
      onClick={() => navigate("/people")}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 42, borderBottom: "0.5px solid #e5e7eb" }}
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck style={{ width: 14, height: 14, color: "#6b7280" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Assessment compliance</span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Annual/initial assessment status · updated nightly</span>
      </div>

      {/* Data row */}
      {loading ? (
        <div className="flex items-center justify-center gap-2" style={{ height: 38 }}>
          <Loader2 style={{ width: 13, height: 13, color: "#9ca3af" }} className="animate-spin" />
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Loading…</span>
        </div>
      ) : (
        <div className="flex" style={{ height: 38 }}>
          {cols.map((col, i) => (
            <div
              key={col.label}
              className="flex-1 flex flex-col justify-center"
              style={{
                padding: "0 14px",
                borderRight: i < cols.length - 1 ? "0.5px solid #e5e7eb" : undefined,
              }}
            >
              <span style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.2 }}>{col.label}</span>
              <span style={{ fontSize: 20, fontWeight: 500, color: col.color, lineHeight: 1.1 }}>
                {col.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
