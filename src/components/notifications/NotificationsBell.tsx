import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ArrowRight, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import {
  type AlertItem,
  type MentionItem,
  severityTone,
  roleAvatarTone,
} from "@/data/notifications";

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"alerts" | "mentions">("alerts");
  const ref = useRef<HTMLDivElement>(null);

  const {
    alerts,
    mentions,
    unreadTotal,
    unreadAlerts,
    unreadMentions,
    markAlertRead,
    markMentionRead,
    markAllAlertsRead,
    markAllMentionsRead,
  } = useNotifications();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const visibleAlerts = alerts.filter((a) => !a.dismissed).slice(0, 5);
  const visibleMentions = mentions.filter((m) => !m.dismissed).slice(0, 5);

  function handleAlertClick(a: AlertItem) {
    if (!a.read) markAlertRead(a.id);
    navigate(a.href);
    setOpen(false);
  }
  function handleMentionClick(m: MentionItem) {
    if (!m.read) markMentionRead(m.id);
    navigate(m.href);
    setOpen(false);
  }
  function viewAll() {
    navigate(`/my-work?tab=${tab}`);
    setOpen(false);
  }
  function markAllRead() {
    if (tab === "alerts") markAllAlertsRead();
    else markAllMentionsRead();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors"
        title="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadTotal > 0 && (
          <span className="absolute top-1 right-1 h-[16px] min-w-[16px] px-1 flex items-center justify-center rounded-full bg-icm-red text-white text-[9px] font-mono font-bold">
            {unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[360px] rounded-xl border border-icm-border bg-icm-panel shadow-elevated z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-icm-border">
            <p className="font-manrope font-bold text-[13px] text-icm-text">Notifications</p>
            <button
              onClick={markAllRead}
              className="text-[11px] font-geist font-semibold text-icm-accent hover:underline"
            >
              Mark all read
            </button>
          </div>
          {/* Tabs */}
          <div className="flex items-center border-b border-icm-border">
            <DropdownTab
              active={tab === "alerts"}
              onClick={() => setTab("alerts")}
              label="Alerts"
              count={unreadAlerts}
            />
            <DropdownTab
              active={tab === "mentions"}
              onClick={() => setTab("mentions")}
              label="Mentions"
              count={unreadMentions}
            />
          </div>
          {/* Items */}
          <div className="max-h-[400px] overflow-y-auto">
            {tab === "alerts" ? (
              visibleAlerts.length === 0 ? (
                <p className="px-3 py-6 text-[12px] font-geist text-icm-text-dim text-center">
                  No alerts
                </p>
              ) : (
                visibleAlerts.map((a) => (
                  <CompactAlertRow key={a.id} alert={a} onClick={() => handleAlertClick(a)} />
                ))
              )
            ) : visibleMentions.length === 0 ? (
              <p className="px-3 py-6 text-[12px] font-geist text-icm-text-dim text-center">
                No mentions
              </p>
            ) : (
              visibleMentions.map((m) => (
                <CompactMentionRow key={m.id} mention={m} onClick={() => handleMentionClick(m)} />
              ))
            )}
          </div>
          {/* Footer */}
          <button
            onClick={viewAll}
            className="w-full px-3 py-2 border-t border-icm-border text-[11.5px] font-geist font-semibold text-icm-accent hover:bg-icm-bg flex items-center justify-center gap-1"
          >
            View all notifications <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function DropdownTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 h-9 text-[12px] font-geist font-semibold transition-colors -mb-px border-b-2 inline-flex items-center justify-center gap-1.5",
        active
          ? "text-icm-accent border-icm-accent"
          : "text-icm-text-dim border-transparent hover:text-icm-text"
      )}
    >
      {label}
      {count > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-icm-red text-white text-[9px] font-mono font-bold">
          {count}
        </span>
      )}
    </button>
  );
}

function SeverityIcon({ severity }: { severity: AlertItem["severity"] }) {
  const cls = "w-3.5 h-3.5";
  if (severity === "critical") return <AlertCircle className={cn(cls, "text-icm-red")} />;
  if (severity === "warning") return <AlertTriangle className={cn(cls, "text-icm-amber")} />;
  if (severity === "good") return <CheckCircle2 className={cn(cls, "text-icm-green")} />;
  return <Info className={cn(cls, "text-icm-accent")} />;
}

function CompactAlertRow({ alert, onClick }: { alert: AlertItem; onClick: () => void }) {
  const tone = severityTone(alert.severity);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-icm-border last:border-b-0 hover:bg-icm-bg transition-colors flex items-start gap-2.5",
        !alert.read && "bg-icm-accent-soft/30"
      )}
    >
      <span className={cn("w-7 h-7 rounded-lg ring-1 flex items-center justify-center shrink-0", tone.wrap)}>
        <SeverityIcon severity={alert.severity} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-geist font-semibold text-icm-text truncate">{alert.title}</p>
        <p className="text-[11px] font-geist text-icm-text-dim truncate">{alert.sourceLabel}</p>
        <p className="text-[10.5px] font-mono text-icm-text-faint mt-0.5">{alert.timestamp}</p>
      </div>
      {!alert.read && <span className="w-2 h-2 rounded-full bg-icm-accent mt-2 shrink-0" />}
    </button>
  );
}

function CompactMentionRow({
  mention,
  onClick,
}: {
  mention: MentionItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-icm-border last:border-b-0 hover:bg-icm-bg transition-colors flex items-start gap-2.5",
        !mention.read && "bg-icm-accent-soft/30"
      )}
    >
      <span
        className={cn(
          "w-7 h-7 rounded-full ring-1 flex items-center justify-center text-[10px] font-geist font-bold shrink-0",
          roleAvatarTone(mention.authorRole)
        )}
      >
        {mention.authorInitials}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-geist text-icm-text truncate">
          <span className="font-bold">{mention.authorName}</span>{" "}
          <span className="text-icm-text-dim">mentioned you</span>
        </p>
        <p className="text-[11px] font-geist text-icm-text-dim truncate">{mention.contextLabel}</p>
        <p className="text-[10.5px] font-mono text-icm-text-faint mt-0.5">{mention.timestamp}</p>
      </div>
      {!mention.read && <span className="w-2 h-2 rounded-full bg-icm-accent mt-2 shrink-0" />}
    </button>
  );
}
