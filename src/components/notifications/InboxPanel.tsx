/**
 * InboxPanel — slide-over inbox replacing the bell dropdown.
 *
 * Tabs: All · Urgent · Tasks · Mentions · AI
 * Single source of unread count used by both the button badge and My Work.
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Inbox, X, AlertCircle, AlertTriangle, Info, CheckCircle2,
  CheckSquare, AtSign, Bot, ChevronRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useFirestoreNotifications, type FirestoreNotification, type NotifSeverity } from "@/hooks/useFirestoreNotifications";
import { type AlertItem, type MentionItem, severityTone, roleAvatarTone } from "@/data/notifications";
import { loadCheckIns, type AICheckInSession } from "@/lib/aiCheckIns";
import { useTasks } from "@/hooks/useTasks";

// ─── Types ───────────────────────────────────────────────────────────────────

type InboxTab = "all" | "urgent" | "tasks" | "mentions" | "ai";

// ─── Unified unread count hook (exported for topbar badge) ───────────────────

export function useInboxCount() {
  const { unreadAlerts, unreadMentions } = useNotifications();
  const { unreadCount: fsUnread } = useFirestoreNotifications();
  const [pendingAI, setPendingAI] = useState(() =>
    loadCheckIns().filter((c) => c.status === "Pending Review").length
  );

  useEffect(() => {
    const refresh = () =>
      setPendingAI(loadCheckIns().filter((c) => c.status === "Pending Review").length);
    window.addEventListener("cm_ai_checkins_changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cm_ai_checkins_changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return unreadAlerts + unreadMentions + fsUnread + pendingAI;
}

// ─── Inbox Button (rendered in Topbar) ───────────────────────────────────────

export function InboxButton() {
  const [open, setOpen] = useState(false);
  const total = useInboxCount();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative h-9 px-3 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center gap-1.5 transition-colors font-geist text-[12.5px] font-semibold"
        title="Inbox"
      >
        <Inbox className="w-[17px] h-[17px]" />
        <span className="hidden sm:inline">Inbox</span>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-[17px] min-w-[17px] px-1 flex items-center justify-center rounded-full bg-icm-red text-white text-[9px] font-mono font-bold leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && createPortal(
        <InboxPanel onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function InboxPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<InboxTab>("all");
  const panelRef = useRef<HTMLDivElement>(null);

  // Notifications data
  const {
    alerts, mentions,
    unreadAlerts, unreadMentions,
    markAlertRead, markMentionRead,
    markAllAlertsRead, markAllMentionsRead,
  } = useNotifications();

  const {
    notifications: fsNotifs,
    unreadCount: fsUnread,
    markRead: fsMarkRead,
    markAllRead: fsMarkAllRead,
    dismiss: fsDismiss,
  } = useFirestoreNotifications();

  const { tasks } = useTasks();

  const [aiList, setAiList] = useState<AICheckInSession[]>(() => loadCheckIns());
  useEffect(() => {
    const refresh = () => setAiList(loadCheckIns());
    window.addEventListener("cm_ai_checkins_changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cm_ai_checkins_changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Tab counts
  const pendingAI = aiList.filter((c) => c.status === "Pending Review").length;
  const openTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "Completed").length;
  const urgentCount = fsNotifs.filter((n) => !n.read && (n.severity === "critical" || n.severity === "warning")).length
    + alerts.filter((a) => !a.read && !a.dismissed && (a.severity === "critical" || a.severity === "warning")).length;
  const totalUnread = unreadAlerts + unreadMentions + fsUnread + pendingAI;

  const tabs: { key: InboxTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "all",      label: "All",      icon: Inbox,       count: totalUnread },
    { key: "urgent",   label: "Urgent",   icon: AlertCircle, count: urgentCount },
    { key: "tasks",    label: "Tasks",    icon: CheckSquare, count: openTasks },
    { key: "mentions", label: "Mentions", icon: AtSign,       count: unreadMentions },
    { key: "ai",       label: "AI",       icon: Bot,          count: pendingAI },
  ];

  function nav(href: string) { navigate(href); onClose(); }

  function markAllRead() {
    void fsMarkAllRead();
    markAllAlertsRead();
    markAllMentionsRead();
  }

  // ── Rendered content per tab ─────────────────────────────────────────────

  const visibleAlerts  = useMemo(() => alerts.filter((a) => !a.dismissed), [alerts]);
  const visibleMentions = useMemo(() => mentions.filter((m) => !m.dismissed), [mentions]);

  function renderAll() {
    const hasContent = fsNotifs.length > 0 || visibleAlerts.length > 0 || visibleMentions.length > 0;
    if (!hasContent) return <EmptyState label="All clear — no notifications" />;
    return (
      <div>
        {fsNotifs.length > 0 && (
          <Section title="Live Alerts">
            {fsNotifs.slice(0, 8).map((n) => (
              <LiveRow key={n.id} notif={n}
                onClick={async () => { if (!n.read) await fsMarkRead(n.id); if (n.href) nav(n.href); }}
                onDismiss={() => fsDismiss(n.id)}
              />
            ))}
          </Section>
        )}
        {visibleAlerts.length > 0 && (
          <Section title="Alerts">
            {visibleAlerts.slice(0, 6).map((a) => (
              <AlertRow key={a.id} alert={a} onClick={() => { markAlertRead(a.id); nav(a.href); }} />
            ))}
          </Section>
        )}
        {visibleMentions.length > 0 && (
          <Section title="Mentions">
            {visibleMentions.slice(0, 4).map((m) => (
              <MentionRow key={m.id} mention={m} onClick={() => { markMentionRead(m.id); nav(m.href); }} />
            ))}
          </Section>
        )}
      </div>
    );
  }

  function renderUrgent() {
    const urgentNotifs = fsNotifs.filter((n) => n.severity === "critical" || n.severity === "warning");
    const urgentAlerts = visibleAlerts.filter((a) => a.severity === "critical" || a.severity === "warning");
    if (urgentNotifs.length === 0 && urgentAlerts.length === 0) return <EmptyState label="No urgent items" />;
    return (
      <div>
        {urgentNotifs.map((n) => (
          <LiveRow key={n.id} notif={n}
            onClick={async () => { if (!n.read) await fsMarkRead(n.id); if (n.href) nav(n.href); }}
            onDismiss={() => fsDismiss(n.id)}
          />
        ))}
        {urgentAlerts.map((a) => (
          <AlertRow key={a.id} alert={a} onClick={() => { markAlertRead(a.id); nav(a.href); }} />
        ))}
      </div>
    );
  }

  function renderTasks() {
    const open = tasks.filter((t) => t.status !== "completed" && t.status !== "Completed").slice(0, 20);
    if (open.length === 0) return <EmptyState label="No open tasks" />;
    return (
      <div>
        {open.map((t) => (
          <TaskRow key={t.id} task={t} onClick={() => nav("/my-work")} />
        ))}
        <button
          onClick={() => nav("/my-work")}
          className="w-full py-3 text-center text-[12px] font-geist font-semibold text-icm-accent hover:bg-icm-bg transition-colors border-t border-icm-border"
        >
          View all in My Work →
        </button>
      </div>
    );
  }

  function renderMentions() {
    if (visibleMentions.length === 0) return <EmptyState label="No mentions yet" />;
    return (
      <div>
        {visibleMentions.map((m) => (
          <MentionRow key={m.id} mention={m} onClick={() => { markMentionRead(m.id); nav(m.href); }} />
        ))}
      </div>
    );
  }

  function renderAI() {
    const pending = aiList.filter((c) => c.status === "Pending Review");
    const rest    = aiList.filter((c) => c.status !== "Pending Review").slice(0, 5);
    if (aiList.length === 0) return <EmptyState label="No AI check-ins yet" />;
    return (
      <div>
        {pending.length > 0 && (
          <Section title={`Pending Review (${pending.length})`}>
            {pending.map((c) => <CheckInRow key={c.id} session={c} onClick={() => nav("/my-work?tab=ai_checkins")} />)}
          </Section>
        )}
        {rest.length > 0 && (
          <Section title="Recent">
            {rest.map((c) => <CheckInRow key={c.id} session={c} onClick={() => nav("/my-work?tab=ai_checkins")} />)}
          </Section>
        )}
        <button
          onClick={() => nav("/my-work?tab=ai_checkins")}
          className="w-full py-3 text-center text-[12px] font-geist font-semibold text-icm-accent hover:bg-icm-bg transition-colors border-t border-icm-border"
        >
          View all AI Check-Ins →
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-icm-panel border-l border-icm-border shadow-[-4px_0_40px_rgba(0,0,0,0.12)] z-50 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border shrink-0">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-icm-accent" />
            <span className="font-manrope font-bold text-[15px] text-icm-text">Inbox</span>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-icm-red text-white text-[10px] font-mono font-bold">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-[11.5px] font-geist font-semibold text-icm-accent hover:opacity-80 transition-opacity"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-icm-text-dim hover:text-icm-text hover:bg-icm-bg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs — pill chips */}
        <div className="flex items-center flex-wrap gap-1.5 px-4 py-2.5 border-b border-icm-border shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-8 px-3 rounded-full flex items-center gap-1.5 text-[12px] font-geist font-semibold whitespace-nowrap transition-all shrink-0",
                  active
                    ? "bg-icm-text text-white shadow-sm"
                    : "bg-icm-bg text-icm-text-dim hover:text-icm-text hover:bg-icm-border/60 ring-1 ring-icm-border"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {t.label}
                {t.count > 0 && (
                  <span className={cn(
                    "px-1.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-mono font-bold flex items-center justify-center leading-none",
                    active
                      ? "bg-white/20 text-white"
                      : t.key === "urgent"
                        ? "bg-icm-red text-white"
                        : "bg-icm-red/12 text-icm-red"
                  )}>
                    {t.count > 99 ? "99+" : t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "all"      && renderAll()}
          {tab === "urgent"   && renderUrgent()}
          {tab === "tasks"    && renderTasks()}
          {tab === "mentions" && renderMentions()}
          {tab === "ai"       && renderAI()}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-2 bg-icm-bg/60">
        <span className="text-[10.5px] font-geist font-bold uppercase tracking-widest text-icm-text-faint">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <CheckCircle2 className="w-8 h-8 text-icm-green/40" />
      <p className="text-[12.5px] font-geist text-icm-text-dim">{label}</p>
    </div>
  );
}

// Derive a short blue action label from the alert's source module
function alertActionLabel(alert: AlertItem): string {
  const m = alert.sourceModule?.toLowerCase() ?? "";
  if (m.includes("care plan") || m.includes("isp"))      return "Open care plan →";
  if (m.includes("monitoring"))                           return "Open monitoring form →";
  if (m.includes("eligibility"))                          return "Verify eligibility →";
  if (m.includes("contact"))                              return "Open contact note →";
  if (m.includes("progress"))                             return "Open progress note →";
  if (m.includes("billing"))                              return "Open billing →";
  if (m.includes("document"))                             return "Open document →";
  if (m.includes("referral"))                             return "Open referral →";
  if (m.includes("visit"))                                return "Open visit note →";
  if (m.includes("incident"))                             return "Open incident report →";
  if (m.includes("workflow"))                             return "Open workflow →";
  return "Open record →";
}

function SeverityIcon({ severity }: { severity: AlertItem["severity"] | NotifSeverity }) {
  const cls = "w-3.5 h-3.5";
  if (severity === "critical") return <AlertCircle className={cn(cls, "text-icm-red")} />;
  if (severity === "warning")  return <AlertTriangle className={cn(cls, "text-icm-amber")} />;
  if (severity === "good")     return <CheckCircle2 className={cn(cls, "text-icm-green")} />;
  return <Info className={cn(cls, "text-icm-accent")} />;
}

function LiveRow({
  notif, onClick, onDismiss,
}: {
  notif: FirestoreNotification;
  onClick: () => void;
  onDismiss: () => void;
}) {
  const bg: Record<NotifSeverity, string> = {
    critical: "bg-red-50 ring-icm-red/20",
    warning:  "bg-amber-50 ring-icm-amber/20",
    info:     "bg-icm-accent-soft/20 ring-icm-accent/15",
  };
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 border-b border-icm-border last:border-b-0 hover:bg-icm-bg group cursor-pointer",
      !notif.read && "bg-icm-accent-soft/10"
    )} onClick={onClick}>
      <span className={cn("w-7 h-7 rounded-lg ring-1 flex items-center justify-center shrink-0 mt-0.5", bg[notif.severity])}>
        <SeverityIcon severity={notif.severity} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] font-geist font-semibold text-icm-text leading-snug">{notif.title}</p>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {!notif.read && <span className="w-2 h-2 rounded-full bg-icm-accent" />}
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="h-6 w-6 flex items-center justify-center rounded-md text-icm-text-faint hover:text-icm-text opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        <p className="text-[11.5px] font-geist text-icm-text-dim line-clamp-2 mt-0.5">{notif.body}</p>
        {notif.href && (
          <p className="mt-1.5 text-[11.5px] font-geist font-semibold text-icm-accent">View details →</p>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, onClick }: { alert: AlertItem; onClick: () => void }) {
  const tone = severityTone(alert.severity);
  const actionLabel = alertActionLabel(alert);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-icm-border last:border-b-0 hover:bg-icm-bg transition-colors",
        !alert.read && "bg-icm-accent-soft/10"
      )}
    >
      <span className={cn("w-7 h-7 rounded-lg ring-1 flex items-center justify-center shrink-0 mt-0.5", tone.wrap)}>
        <SeverityIcon severity={alert.severity} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] font-geist font-semibold text-icm-text leading-snug">{alert.title}</p>
          {!alert.read && <span className="w-2 h-2 rounded-full bg-icm-accent mt-1 shrink-0" />}
        </div>
        <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5 line-clamp-2">{alert.description}</p>
        <p className="mt-1.5 text-[11.5px] font-geist font-semibold text-icm-accent">{actionLabel}</p>
      </div>
    </button>
  );
}

function MentionRow({ mention, onClick }: { mention: MentionItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-icm-border last:border-b-0 hover:bg-icm-bg transition-colors",
        !mention.read && "bg-icm-accent-soft/10"
      )}
    >
      <span className={cn(
        "w-7 h-7 rounded-lg ring-1 flex items-center justify-center text-[10px] font-geist font-bold shrink-0 mt-0.5",
        roleAvatarTone(mention.authorRole)
      )}>
        {mention.authorInitials}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] font-geist text-icm-text leading-snug">
            <span className="font-bold">{mention.authorName}</span>{" "}
            <span className="text-icm-text-dim">mentioned you in {mention.contextLabel}</span>
          </p>
          {!mention.read && <span className="w-2 h-2 rounded-full bg-icm-accent mt-1 shrink-0" />}
        </div>
        <p className="text-[10.5px] font-mono text-icm-text-faint mt-0.5">{mention.timestamp}</p>
        <p className="mt-1.5 text-[11.5px] font-geist font-semibold text-icm-accent">View comment →</p>
      </div>
    </button>
  );
}

function TaskRow({
  task, onClick,
}: {
  task: { id: string; title: string; individualName?: string; priority?: string; dueDate?: any; status: string };
  onClick: () => void;
}) {
  const isOverdue = task.status === "overdue" || task.status === "Overdue";
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-icm-border last:border-b-0 hover:bg-icm-bg transition-colors"
    >
      <span className={cn(
        "w-7 h-7 rounded-lg ring-1 flex items-center justify-center shrink-0 mt-0.5",
        isOverdue ? "bg-red-50 ring-icm-red/20" : "bg-icm-accent-soft/30 ring-icm-accent/20"
      )}>
        <CheckSquare className={cn("w-3.5 h-3.5", isOverdue ? "text-icm-red" : "text-icm-accent")} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-geist font-semibold text-icm-text leading-snug">{task.title}</p>
        {task.individualName && (
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">{task.individualName}</p>
        )}
        {isOverdue && (
          <p className="text-[10.5px] font-mono text-icm-red mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Overdue
          </p>
        )}
        <p className="mt-1.5 text-[11.5px] font-geist font-semibold text-icm-accent">Open in My Work →</p>
      </div>
    </button>
  );
}

function CheckInRow({
  session, onClick,
}: {
  session: AICheckInSession;
  onClick: () => void;
}) {
  const isPending = session.status === "Pending Review";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 border-b border-icm-border last:border-b-0 hover:bg-icm-bg transition-colors",
        isPending && "bg-icm-accent-soft/10"
      )}
    >
      <span className="w-7 h-7 rounded-lg bg-violet-50 ring-1 ring-violet-200 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-violet-500" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] font-geist font-semibold text-icm-text leading-snug">
            {session.individualName}
          </p>
          {isPending && <span className="w-2 h-2 rounded-full bg-icm-accent mt-1 shrink-0" />}
        </div>
        <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
          {session.cmName} · {session.date}
        </p>
        <p className="mt-1.5 text-[11.5px] font-geist font-semibold text-icm-accent">
          {isPending ? "Review session →" : "View transcript →"}
        </p>
      </div>
    </button>
  );
}
