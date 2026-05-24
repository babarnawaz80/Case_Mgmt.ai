/**
 * RecentActivityFeed — Real-time activity feed for the Dashboard.
 * Shows the latest progress notes and activity from Firestore.
 */
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Pencil, AlertTriangle, CalendarCheck, FileText,
  ArrowRight, Loader2, Sparkles, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllProgressNotes } from "@/hooks/useProgressNotes";
import { useIncidentSummary } from "@/hooks/useIncidents";

type ActivityKind = "progress_note" | "incident" | "visit";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  sub: string;
  timeLabel: string;
  href?: string;
  urgent?: boolean;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ICON_MAP: Record<ActivityKind, { icon: typeof Pencil; bg: string; text: string }> = {
  progress_note: { icon: Pencil, bg: "bg-icm-accent-soft", text: "text-icm-accent" },
  incident: { icon: AlertTriangle, bg: "bg-icm-red-soft", text: "text-icm-red" },
  visit: { icon: CalendarCheck, bg: "bg-icm-green-soft", text: "text-icm-green" },
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const { icon: Icon, bg, text } = ICON_MAP[item.kind];
  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 group/row transition-colors hover:bg-icm-bg/50",
        item.urgent && "bg-icm-red/[0.02]"
      )}
    >
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", bg)}>
        <Icon className={cn("w-3.5 h-3.5", text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-geist font-medium text-icm-text truncate leading-tight">
          {item.title}
        </p>
        <p className="text-[11px] text-icm-text-dim font-geist mt-0.5 truncate">
          {item.sub}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10.5px] font-mono text-icm-text-faint">{item.timeLabel}</span>
        {item.href && (
          <ArrowRight className="w-3 h-3 text-icm-text-faint opacity-0 group-hover/row:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
  if (item.href) {
    return (
      <NavLink to={item.href} className="block">
        {inner}
      </NavLink>
    );
  }
  return inner;
}

export function RecentActivityFeed() {
  const { notes, loading: notesLoading } = useAllProgressNotes();
  const { totalOpen, overdue, loading: incLoading } = useIncidentSummary();

  const loading = notesLoading || incLoading;

  const activities = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    // Latest progress notes
    notes.slice(0, 12).forEach((note) => {
      const dateStr = note.progressDate || "";
      items.push({
        id: `note-${note.id}`,
        kind: "progress_note",
        title: `Progress Note — ${note.activityType || "Case Management"}`,
        sub: `${note.contactType} · ${note.status === "signed" ? "✓ Signed" : note.status === "pending_signature" ? "⏳ Pending signature" : "Draft"} · ${note.authorName || "Unknown author"}`,
        timeLabel: timeAgo(dateStr),
        href: `/people/${note.individualId}/progress-note/${note.id}`,
        urgent: note.status === "pending_signature",
      });
    });

    // Sort by most recent
    items.sort((a, b) => {
      // urgent items float up
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return 0;
    });

    return items.slice(0, 10);
  }, [notes]);

  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-icm-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-icm-accent" />
          <h3 className="font-manrope font-bold text-[13px] text-icm-text uppercase tracking-wider">
            Recent Activity
          </h3>
          {!loading && activities.length > 0 && (
            <span className="text-[10px] font-mono text-icm-text-faint ml-1">
              · {activities.length} items
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {overdue > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-icm-red-soft text-icm-red text-[10px] font-bold uppercase tracking-wider">
              {overdue} overdue incidents
            </span>
          )}
          <NavLink
            to="/progress-note"
            className="text-[11px] font-geist font-semibold text-icm-accent hover:underline inline-flex items-center gap-0.5"
          >
            View all <ArrowRight className="w-2.5 h-2.5" />
          </NavLink>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div className="px-4 py-2 border-b border-icm-border bg-icm-bg/30 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px] font-geist text-icm-text-dim">
            <Pencil className="w-3 h-3 text-icm-accent" />
            <span className="font-semibold text-icm-text">{notes.length}</span> notes total
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-geist text-icm-text-dim">
            <AlertTriangle className="w-3 h-3 text-icm-amber" />
            <span className="font-semibold text-icm-text">{totalOpen}</span> open incidents
          </div>
          {notes.filter((n) => n.status === "pending_signature").length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-geist text-icm-text-dim">
              <Clock className="w-3 h-3 text-icm-red" />
              <span className="font-semibold text-icm-red">
                {notes.filter((n) => n.status === "pending_signature").length}
              </span>{" "}
              pending signature
            </div>
          )}
          <div className="ml-auto flex items-center gap-1 text-[10px] text-icm-text-faint font-geist">
            <Sparkles className="w-2.5 h-2.5 text-icm-accent" />
            Live Firestore
          </div>
        </div>
      )}

      {/* Activity list */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-icm-text-dim">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px] font-geist">Loading activity…</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-icm-bg border border-icm-border flex items-center justify-center mb-3">
            <FileText className="w-4 h-4 text-icm-text-faint" />
          </div>
          <p className="text-[12.5px] font-geist text-icm-text-dim">No recent activity yet.</p>
          <NavLink
            to="/progress-note/new"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent hover:underline"
          >
            Write a progress note <ArrowRight className="w-3 h-3" />
          </NavLink>
        </div>
      ) : (
        <div className="divide-y divide-icm-border/50">
          {activities.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
