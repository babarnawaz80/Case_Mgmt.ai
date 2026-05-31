import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { type Individual } from "@/hooks/useIndividuals";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface AuthStats {
  totalActive: number;
  expiringIn90: number;
  expiringIn30: number;
  expiringIn14: number;
  expired: number;
  overPace: number;
}

interface AuthHealthSectionProps {
  individuals: Individual[];
}

export function AuthorizationHealthSection({ individuals }: AuthHealthSectionProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<AuthStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orgId = userProfile?.organizationId;
    if (!orgId) return;

    (async () => {
      setLoading(true);
      try {
        const today = new Date();
        const s: AuthStats = { totalActive: 0, expiringIn90: 0, expiringIn30: 0, expiringIn14: 0, expired: 0, overPace: 0 };

        const [snapActive, snapLower] = await Promise.all([
          getDocs(query(collection(db, "service_authorizations"),
            where("organizationId", "==", orgId), where("status", "==", "Active")
          )).catch(() => ({ docs: [] as any[] })),
          getDocs(query(collection(db, "service_authorizations"),
            where("organizationId", "==", orgId), where("status", "==", "active")
          )).catch(() => ({ docs: [] as any[] })),
        ]);

        const seen = new Set<string>();
        const allDocs: any[] = [];
        for (const snap of [snapActive, snapLower]) {
          for (const d of snap.docs) {
            if (!seen.has(d.id)) { seen.add(d.id); allDocs.push(d); }
          }
        }

        for (const d of allDocs) {
          const a = d.data();
          s.totalActive++;
          const endRaw = a.end_date || a.endDate || a.expirationDate;
          if (!endRaw) continue;
          const end = new Date(endRaw);
          const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (days < 0) { s.expired++; }
          else if (days <= 14) { s.expiringIn14++; s.expiringIn30++; s.expiringIn90++; }
          else if (days <= 30) { s.expiringIn30++; s.expiringIn90++; }
          else if (days <= 90) { s.expiringIn90++; }

          const startRaw = a.start_date || a.startDate || a.effectiveDate;
          if (startRaw && (a.units_authorized || a.authorizedUnits) && (a.units_used || a.unitsUsed) && days > 0) {
            const start = new Date(startRaw);
            const elapsed = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            if (elapsed >= 7) {
              const used = a.units_used || a.unitsUsed || 0;
              const auth = a.units_authorized || a.authorizedUnits || 1;
              const daily = used / elapsed;
              const daysLeft = Math.floor((auth - used) / daily);
              if (daily > 0 && daysLeft < days - 7) s.overPace++;
            }
          }
        }

        setStats(s);
      } catch { /* non-fatal */ }
      finally { setLoading(false); }
    })();
  }, [userProfile?.organizationId]);

  // Compact single-row layout — spec: ~80px total height
  const cols: { label: string; value: number; color: string }[] = stats ? [
    { label: "Active",        value: stats.totalActive,  color: "#16a34a" },
    { label: "Exp. 90 days",  value: stats.expiringIn90, color: stats.expiringIn90 > 0  ? "#d97706" : "#9ca3af" },
    { label: "Exp. 30 days",  value: stats.expiringIn30, color: stats.expiringIn30 > 0  ? "#d97706" : "#9ca3af" },
    { label: "Exp. 14 days",  value: stats.expiringIn14, color: stats.expiringIn14 > 0  ? "#dc2626" : "#9ca3af" },
    { label: "Expired",       value: stats.expired,      color: stats.expired > 0       ? "#dc2626" : "#9ca3af" },
    { label: "Over util.",    value: stats.overPace,     color: stats.overPace > 0      ? "#d97706" : "#9ca3af" },
  ] : [];

  return (
    <div
      className="bg-white overflow-hidden cursor-pointer"
      style={{ border: "0.5px solid #e5e7eb", borderRadius: 12 }}
      onClick={() => navigate("/authorizations")}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 42, borderBottom: "0.5px solid #e5e7eb" }}
      >
        <div className="flex items-center gap-2">
          <Shield style={{ width: 14, height: 14, color: "#6b7280" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Authorization health</span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Across all active individuals · updated nightly</span>
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
