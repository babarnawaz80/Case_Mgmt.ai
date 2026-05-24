import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ArrowRight, AlertCircle, AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import {
  type AlertItem,
  type MentionItem,
  severityTone,
  roleAvatarTone,
} from "@/data/notifications";
import {
  useFirestoreNotifications,
  type FirestoreNotification,
  type NotifSeverity,
} from "@/hooks/useFirestoreNotifications";

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"live" | "alerts" | "mentions">("live");
  const ref = useRef<HTMLDivElement>(null);

  const {
    alerts,
    mentions,
    unreadTotal: mockUnreadTotal,
    unreadAlerts,
    unreadMentions,
    markAlertRead,
    markMentionRead,
    markAllAlertsRead,
    markAllMentionsRead,
  } = useNotifications();

  const {
    notifications: firestoreNotifs,
    unreadCount: firestoreUnread,
    markRead: fsMarkRead,
    markAllRead: fsMarkAllRead,
    dismiss: fsDismiss,
  } = useFirestoreNotifications();

  const unreadTotal = mockUnreadTotal + firestoreUnread;

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
    if (tab !== "live") navigate(`/my-work?tab=${tab}`);
    setOpen(false);
  }
  function markAllRead() {
    if (tab === "live") { void fsMarkAllRead(); return; }
    if (tab === "alerts") markAllAlertsRead();
    else markAllMentionsRead();
  }

  async function handleFsNotifClick(n: FirestoreNotification) {
    if (!n.read) await fsMarkRead(n.id);
    if (n.href) navigate(n.href);
    setOpen(false);
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
              active={tab === "live"}
              onClick={() => setTab("live")}
              label="Live"
              count={firestoreUnread}
            />
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
            {tab === "live" ? (
              firestoreNotifs.length === 0 ? (
                <p className="px-3 py-6 text-[12px] font-geist text-icm-text-dim text-center">
                  No notifications
                </p>
              ) : (
                firestoreNotifs.slice(0, 10).map((n) => (
                  <LiveNotifRow
                    key={n.id}
                    notif={n}
                    onClick={() => handleFsNotifClick(n)}
                    onDismiss={(e) => { e.stopPropagation(); void fsDismiss(n.id); }}
                  />
                ))
              )
            ) : tab === "alerts" ? (
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
          {tab !== "live" && (
            <button
              onClick={viewAll}
              className="w-full px-3 py-2 border-t border-icm-border text-[11.5px] font-geist font-semibold text-icm-accent hover:bg-icm-bg flex items-center justify-center gap-1"
            >
              View all notifications <ArrowRight className="w-3 h-3" />
            </button>
          )}
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

function SeverityIcon({ severity }: { severity: AlertItem["severity"] | NotifSeverity }) {
  const cls = "w-3.5 h-3.5";
  if (severity === "critical") return <AlertCircle className={cn(cls, "text-icm-red")} />;
  if (severity === "warning") return <AlertTriangle className={cn(cls, "text-icm-amber")} />;
  if (severity === "good") return <CheckCircle2 className={cn(cls, "text-icm-green")} />;
  return <Info className={cn(cls, "text-icm-accent")} />;
}

function LiveNotifRow({
  notif,
  onClick,
  onDismiss,
}: {
  notif: FirestoreNotification;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const severityWrap: Record<NotifSeverity, string> = {
    critical: "bg-red-50 ring-icm-red/30",
    warning: "bg-amber-50 ring-icm-amber/30",
    info: "bg-icm-accent-soft/20 ring-icm-accent/20",
  };
  return (
    <div
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-icm-border last:border-b-0 hover:bg-icm-bg transition-colors flex items-start gap-2.5 group",
        !notif.read && "bg-icm-accent-soft/30"
      )}
    >
      <button onClick={onClick} className="flex items-start gap-2.5 flex-1 min-w-0 text-left">
        <span
          className={cn(
            "w-7 h-7 rounded-lg ring-1 flex items-center justify-center shrink-0",
            severityWrap[notif.severity]
          )}
        >
          <SeverityIcon severity={notif.severity} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-geist font-semibold text-icm-text truncate">{notif.title}</p>
          <p className="text-[11px] font-geist text-icm-text-dim line-clamp-2">{notif.body}</p>
        </div>
        {!notif.read && <span className="w-2 h-2 rounded-full bg-icm-accent mt-2 shrink-0" />}
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 mt-0.5 h-5 w-5 flex items-center justify-center rounded-md text-icm-text-faint hover:text-icm-text hover:bg-icm-bg opacity-0 group-hover:opacity-100 transition-opacity"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
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
          "w-7 h-7 rounded-lg ring-1 flex items-center justify-center text-[10px] font-geist font-bold shrink-0",
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
