import { useMemo, useState } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useAuditLog, type AuditEntry } from "@/hooks/useAuditLog";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Search, X, Loader2,
  User, Settings, FileText, AlertTriangle, Sparkles,
  CheckCircle2, Clock,
} from "lucide-react";

const ACTION_CATEGORIES: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  participant_intake_created: { label: "Intake Created",    color: "text-icm-green bg-icm-green-soft",   icon: CheckCircle2 },
  progress_note_created:     { label: "Note Created",      color: "text-icm-accent bg-icm-accent-soft", icon: FileText },
  progress_note_signed:      { label: "Note Signed",       color: "text-icm-green bg-icm-green-soft",   icon: CheckCircle2 },
  incident_created:          { label: "Incident Filed",    color: "text-icm-red bg-icm-red-soft",       icon: AlertTriangle },
  incident_updated:          { label: "Incident Updated",  color: "text-icm-amber bg-icm-amber-soft",   icon: AlertTriangle },
  login:                     { label: "Login",             color: "text-icm-accent bg-icm-accent-soft", icon: User },
  logout:                    { label: "Logout",            color: "text-icm-text-dim bg-icm-bg",        icon: User },
  settings_changed:          { label: "Settings",          color: "text-icm-amber bg-icm-amber-soft",   icon: Settings },
  ai_assist:                 { label: "AI Assist",         color: "text-purple-600 bg-purple-50",       icon: Sparkles },
};

function formatTs(createdAt: unknown): string {
  if (!createdAt) return "";
  const ts = createdAt as { seconds?: number; toDate?: () => Date };
  const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null;
  if (!d) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function categoryMeta(action: string) {
  return ACTION_CATEGORIES[action] ?? { label: action, color: "text-icm-text-dim bg-icm-bg", icon: Clock };
}

export default function AuditLogPage() {
  const { entries, loading } = useAuditLog(200);
  const [search, setSearch]           = useState("");
  const [actionFilter, setActionFilter] = useState("All");

  const actionTypes = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => s.add(e.action));
    return ["All", ...Array.from(s).sort()];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (actionFilter !== "All" && e.action !== actionFilter) return false;
      if (search) {
        const hay = `${e.actorName} ${e.action} ${e.targetName ?? ""} ${e.details ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [entries, search, actionFilter]);

  return (
    <ICMShell title="Audit Log" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/settings"
          backLabel="Settings"
          items={[{ label: "Settings", to: "/settings" }, { label: "Audit Log" }]}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] inline-flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-icm-accent" /> Audit Log
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              All system activity — HIPAA-compliant, tamper-evident, real-time from Firestore
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-geist bg-icm-green-soft text-icm-green border border-icm-green/20">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
              Live Firestore
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, action, target…"
              className="w-full h-9 pl-8 pr-8 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-icm-text-faint" />
              </button>
            )}
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
          >
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a === "All" ? "All actions" : categoryMeta(a).label || a}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading audit log…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
            <ShieldCheck className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
            <p className="text-[13px] text-icm-text-dim font-geist">
              {entries.length === 0
                ? "No audit events yet. Actions will appear here as users interact with the system."
                : "No entries match your filters."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <div className="divide-y divide-icm-border/50">
              {filtered.map((entry: AuditEntry) => {
                const meta = categoryMeta(entry.action);
                const Icon = meta.icon;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-icm-bg transition-colors"
                  >
                    {/* Icon badge */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        meta.color,
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-semibold text-icm-text">
                          {entry.actorName}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono",
                            meta.color,
                          )}
                        >
                          {meta.label || entry.action}
                        </span>
                        {entry.targetName && (
                          <span className="text-[11px] text-icm-text-dim">
                            → {entry.targetName}
                          </span>
                        )}
                      </div>
                      {entry.details && (
                        <p className="text-[11px] text-icm-text-faint mt-0.5 line-clamp-2">
                          {entry.details}
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10.5px] font-geist text-icm-text-faint shrink-0 mt-0.5 whitespace-nowrap">
                      {formatTs(entry.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-icm-border bg-icm-bg/30 flex items-center justify-between">
              <span className="text-[10.5px] font-geist text-icm-text-faint">
                {filtered.length} of {entries.length} entries
              </span>
              <span className="text-[10px] font-mono text-icm-text-faint">
                HIPAA Audit Trail
              </span>
            </div>
          </div>
        )}
      </div>
    </ICMShell>
  );
}
