import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MoreHorizontal, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AlertItem,
  type AlertSeverity,
  bucketLabel,
  severityTone,
  categoryLabel,
} from "@/data/notifications";

interface AlertsTabProps {
  alerts: AlertItem[];
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  onClearDismissed: () => void;
}

type Filter =
  | "all"
  | "unread"
  | "critical"
  | "warnings"
  | "billing"
  | "compliance"
  | "documents"
  | "dismissed";

export function AlertsTab({
  alerts,
  onMarkRead,
  onMarkUnread,
  onDismiss,
  onMarkAllRead,
  onClearDismissed,
}: AlertsTabProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = alerts.slice();
    if (!showDismissed && filter !== "dismissed") {
      list = list.filter((a) => !a.dismissed);
    }
    if (filter === "unread") list = list.filter((a) => !a.read);
    else if (filter === "critical") list = list.filter((a) => a.severity === "critical");
    else if (filter === "warnings") list = list.filter((a) => a.severity === "warning");
    else if (filter === "billing") list = list.filter((a) => a.category === "billing");
    else if (filter === "compliance") list = list.filter((a) => a.category === "compliance");
    else if (filter === "documents") list = list.filter((a) => a.category === "documents");
    else if (filter === "dismissed") list = list.filter((a) => a.dismissed);
    return list;
  }, [alerts, filter, showDismissed]);

  // group by bucket
  const grouped = useMemo(() => {
    const order: AlertItem["bucket"][] = ["today", "yesterday", "thisWeek", "earlier"];
    return order
      .map((b) => ({ key: b, label: bucketLabel(b), items: filtered.filter((a) => a.bucket === b) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  function handleClick(a: AlertItem) {
    if (!a.read) onMarkRead(a.id);
    navigate(a.href);
  }

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { v: "all", label: "All" },
              { v: "unread", label: "Unread" },
              { v: "critical", label: "Critical" },
              { v: "warnings", label: "Warnings" },
              { v: "billing", label: "Billing" },
              { v: "compliance", label: "Compliance" },
              { v: "documents", label: "Documents" },
              { v: "dismissed", label: "Dismissed" },
            ] as const
          ).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11.5px] font-geist font-semibold transition-colors",
                filter === f.v
                  ? "bg-icm-text text-icm-panel"
                  : "border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllRead}
            className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Mark all as read
          </button>
          <button
            onClick={onClearDismissed}
            className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Clear dismissed
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-10 text-center">
          <p className="text-[13px] font-geist text-icm-text-dim">No alerts to show.</p>
        </div>
      ) : (
        grouped.map((g) => (
          <div key={g.key} className="space-y-2">
            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              {g.label}
            </p>
            <div className="space-y-2">
              {g.items.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onClick={() => handleClick(a)}
                  onMenu={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                  menuOpen={openMenu === a.id}
                  onMarkRead={() => {
                    onMarkRead(a.id);
                    setOpenMenu(null);
                  }}
                  onMarkUnread={() => {
                    onMarkUnread(a.id);
                    setOpenMenu(null);
                  }}
                  onDismiss={() => {
                    onDismiss(a.id);
                    setOpenMenu(null);
                  }}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  const cls = "w-4 h-4";
  switch (severity) {
    case "critical":
      return <AlertCircle className={cn(cls, "text-icm-red")} />;
    case "warning":
      return <AlertTriangle className={cn(cls, "text-icm-amber")} />;
    case "info":
      return <Info className={cn(cls, "text-icm-accent")} />;
    case "good":
      return <CheckCircle2 className={cn(cls, "text-icm-green")} />;
  }
}

function AlertCard({
  alert,
  onClick,
  onMenu,
  menuOpen,
  onMarkRead,
  onMarkUnread,
  onDismiss,
}: {
  alert: AlertItem;
  onClick: () => void;
  onMenu: () => void;
  menuOpen: boolean;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDismiss: () => void;
}) {
  const tone = severityTone(alert.severity);
  return (
    <div
      className={cn(
        "rounded-xl border bg-icm-panel border-l-4 hover:border-icm-border-strong transition-colors relative",
        tone.border,
        alert.read ? "border-icm-border" : "border-icm-border ring-1 ring-icm-accent/10"
      )}
    >
      <button
        onClick={onClick}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        <div
          className={cn(
            "w-9 h-9 rounded-xl ring-1 flex items-center justify-center shrink-0",
            tone.wrap
          )}
        >
          <SeverityIcon severity={alert.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-geist font-bold ring-1",
                tone.wrap
              )}
            >
              {tone.label}
            </span>
            <span className="text-[10.5px] font-geist text-icm-text-faint">
              · {categoryLabel(alert.category)}
            </span>
            <p className="text-[13px] font-geist font-bold text-icm-text">{alert.title}</p>
          </div>
          <p className="text-[12px] font-geist text-icm-text-dim mt-1 leading-relaxed line-clamp-2">
            {alert.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[11px] font-geist text-icm-text-faint">{alert.sourceLabel}</span>
            <span className="text-icm-text-faint">·</span>
            <span className="text-[11px] font-mono text-icm-text-faint">{alert.timestamp}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {!alert.read && <span className="w-2 h-2 rounded-full bg-icm-accent" />}
          <ArrowRight className="w-4 h-4 text-icm-text-faint" />
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenu();
        }}
        className="absolute top-2 right-10 w-7 h-7 rounded-lg hover:bg-icm-bg text-icm-text-faint flex items-center justify-center"
        title="More"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {menuOpen && (
        <div className="absolute top-10 right-10 z-20 w-48 rounded-xl border border-icm-border bg-icm-panel shadow-elevated py-1">
          {alert.read ? (
            <MenuButton onClick={onMarkUnread}>Mark as unread</MenuButton>
          ) : (
            <MenuButton onClick={onMarkRead}>Mark as read</MenuButton>
          )}
          <MenuButton onClick={onDismiss}>Dismiss</MenuButton>
        </div>
      )}
    </div>
  );
}

function MenuButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-[12px] font-geist text-icm-text hover:bg-icm-bg"
    >
      {children}
    </button>
  );
}
