import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Clock, AlertTriangle, XCircle, TrendingUp, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

        // Query without status filter to handle case variations ("Active" vs "active"),
        // then filter in-memory for active records.
        const [snapActive, snapLower] = await Promise.all([
          getDocs(query(collection(db, "service_authorizations"),
            where("organizationId", "==", orgId), where("status", "==", "Active")
          )).catch(() => ({ docs: [] as any[] })),
          getDocs(query(collection(db, "service_authorizations"),
            where("organizationId", "==", orgId), where("status", "==", "active")
          )).catch(() => ({ docs: [] as any[] })),
        ]);

        // Deduplicate by doc ID
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

          // Pace check
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

  const cards = stats ? [
    { label: "Active Authorizations", value: stats.totalActive, icon: Shield, tone: "green" as const },
    { label: "Expiring in 90 Days", value: stats.expiringIn90, icon: Clock, tone: stats.expiringIn90 > 0 ? "amber" as const : "green" as const },
    { label: "Expiring in 30 Days", value: stats.expiringIn30, icon: AlertTriangle, tone: stats.expiringIn30 > 0 ? "amber" as const : "green" as const },
    { label: "Expiring in 14 Days", value: stats.expiringIn14, icon: AlertTriangle, tone: stats.expiringIn14 > 0 ? "red" as const : "green" as const },
    { label: "Expired — Action Needed", value: stats.expired, icon: XCircle, tone: stats.expired > 0 ? "red" as const : "green" as const },
    { label: "Over Utilization Pace", value: stats.overPace, icon: TrendingUp, tone: stats.overPace > 0 ? "amber" as const : "green" as const },
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
          <Shield className="w-4 h-4 text-icm-accent" />
          <p className="font-manrope font-bold text-[14px] text-icm-text">Authorization Health</p>
        </div>
        <p className="text-[11.5px] font-geist text-icm-text-dim">Across all active individuals · updated nightly</p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading authorization data…</span>
          </div>
        ) : !stats ? (
          <div className="flex items-center justify-center py-8">
            <CheckCircle2 className="w-5 h-5 text-icm-green mr-2" />
            <span className="text-[12px] font-geist text-icm-text-dim">No authorization data available yet.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {cards.map(({ label, value, icon: Icon, tone }) => {
              const tc = toneClasses[tone];
              return (
                <button
                  key={label}
                  onClick={() => navigate("/authorizations")}
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
