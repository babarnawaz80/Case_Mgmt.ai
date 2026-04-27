import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type MentionItem,
  bucketLabel,
  roleAvatarTone,
} from "@/data/notifications";

interface MentionsTabProps {
  mentions: MentionItem[];
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
}

type Filter = "all" | "unread";

export function MentionsTab({
  mentions,
  onMarkRead,
  onMarkUnread,
  onDismiss,
  onMarkAllRead,
}: MentionsTabProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = mentions.filter((m) => !m.dismissed);
    if (filter === "unread") list = list.filter((m) => !m.read);
    return list;
  }, [mentions, filter]);

  const grouped = useMemo(() => {
    const order: MentionItem["bucket"][] = ["today", "yesterday", "thisWeek", "earlier"];
    return order
      .map((b) => ({
        key: b,
        label: bucketLabel(b),
        items: filtered.filter((m) => m.bucket === b),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  function handleClick(m: MentionItem) {
    if (!m.read) onMarkRead(m.id);
    navigate(m.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {(
            [
              { v: "all", label: "All" },
              { v: "unread", label: "Unread" },
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
        <button
          onClick={onMarkAllRead}
          className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
        >
          Mark all as read
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-10 text-center">
          <p className="text-[13px] font-geist text-icm-text-dim">No mentions to show.</p>
        </div>
      ) : (
        grouped.map((g) => (
          <div key={g.key} className="space-y-2">
            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              {g.label}
            </p>
            <div className="space-y-2">
              {g.items.map((m) => (
                <MentionCard
                  key={m.id}
                  mention={m}
                  onClick={() => handleClick(m)}
                  onMenu={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                  menuOpen={openMenu === m.id}
                  onMarkRead={() => {
                    onMarkRead(m.id);
                    setOpenMenu(null);
                  }}
                  onMarkUnread={() => {
                    onMarkUnread(m.id);
                    setOpenMenu(null);
                  }}
                  onDismiss={() => {
                    onDismiss(m.id);
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

function MentionCard({
  mention,
  onClick,
  onMenu,
  menuOpen,
  onMarkRead,
  onMarkUnread,
  onDismiss,
}: {
  mention: MentionItem;
  onClick: () => void;
  onMenu: () => void;
  menuOpen: boolean;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-icm-panel border-l-4 transition-colors relative",
        mention.read ? "border-icm-border border-l-icm-border" : "border-icm-border border-l-icm-accent ring-1 ring-icm-accent/10"
      )}
    >
      <button onClick={onClick} className="w-full text-left p-3 flex items-start gap-3">
        <span
          className={cn(
            "w-9 h-9 rounded-full ring-1 flex items-center justify-center text-[11px] font-geist font-bold shrink-0",
            roleAvatarTone(mention.authorRole)
          )}
        >
          {mention.authorInitials}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-geist text-icm-text">
            <span className="font-bold">{mention.authorName}</span>{" "}
            <span className="text-icm-text-dim">mentioned you in</span>{" "}
            <span className="font-semibold">{mention.contextLabel}</span>
          </p>
          <p className="text-[12px] font-geist text-icm-text-dim mt-1 leading-relaxed italic">
            {renderExcerpt(mention.excerpt, mention.mentionToken)}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
              {mention.contextModule}
            </span>
            <span className="text-[11px] font-mono text-icm-text-faint">{mention.timestamp}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {!mention.read && <span className="w-2 h-2 rounded-full bg-icm-accent" />}
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
          {mention.read ? (
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

function renderExcerpt(text: string, token: string) {
  const parts = text.split(token);
  const out: React.ReactNode[] = [];
  parts.forEach((p, i) => {
    out.push(<span key={`p${i}`}>{p}</span>);
    if (i < parts.length - 1) {
      out.push(
        <span key={`t${i}`} className="text-icm-accent font-bold not-italic">
          {token}
        </span>
      );
    }
  });
  return out;
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
