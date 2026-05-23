import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { demoToast } from "@/lib/demoToast";
import {
  MessageSquare,
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Paperclip,
  AtSign,
  Link2,
  Smile,
  Sparkles,
  ArrowRight,
  Check,
  CheckCheck,
  X,
  ClipboardList,
  AlertTriangle,
  FileText,
  ListChecks,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { cn } from "@/lib/utils";
import { useMessages } from "@/hooks/useMessages";
import {
  CURRENT_USER_ID,
  allStaff,
  staffById,
  conversationDisplayName,
  conversationOtherMember,
  roleAvatarTone,
  roleLabel,
  type ChatMessage,
  type Conversation,
  type LinkedRecord,
  type StaffMember,
} from "@/data/messages";

type ListTab = "all" | "direct" | "groups" | "unread";

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    conversations,
    messagesForConversation,
    unreadTotal,
    markConversationRead,
    markAllRead,
    sendMessage,
    createConversation,
    renameGroup,
  } = useMessages();

  // Selected conversation
  const initialId = searchParams.get("c") ?? conversations[0]?.id ?? null;
  const [activeId, setActiveIdRaw] = useState<string | null>(initialId);
  function setActiveId(id: string | null) {
    setActiveIdRaw(id);
    if (id) setSearchParams({ c: id }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  // Mark active as read when opened
  useEffect(() => {
    if (active && active.unread > 0) markConversationRead(active.id);
  }, [active, markConversationRead]);

  // Tabs and search in left panel
  const [listTab, setListTab] = useState<ListTab>("all");
  const [listSearch, setListSearch] = useState("");

  const filteredConversations = useMemo(() => {
    let list = conversations.slice();
    if (listTab === "direct") list = list.filter((c) => c.type === "direct");
    else if (listTab === "groups") list = list.filter((c) => c.type === "group");
    else if (listTab === "unread") list = list.filter((c) => c.unread > 0);
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      list = list.filter(
        (c) =>
          conversationDisplayName(c).toLowerCase().includes(q) ||
          c.lastPreview.toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, listTab, listSearch]);

  // Composer state
  const [draft, setDraft] = useState("");
  const [draftLinked, setDraftLinked] = useState<LinkedRecord | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // New message modal
  const [newOpen, setNewOpen] = useState(false);

  function handleSend() {
    if (!active) return;
    const text = draft.trim();
    if (!text && !draftLinked) return;

    if (draftLinked) {
      // First send the text (if any) then the linked record card
      if (text) sendMessage(active.id, { kind: "text", text });
      sendMessage(active.id, {
        kind: "linked_record",
        linkedRecord: draftLinked,
      });
    } else if (text.startsWith("@AI ") || text.startsWith("/ai ")) {
      // AI prompt -> send as user, then AI summary reply
      sendMessage(active.id, { kind: "text", text });
      const prompt = text.replace(/^(@AI |\/ai )/, "");
      setTimeout(() => {
        sendMessage(active.id, {
          kind: "ai_summary",
          aiTitle: `Here's a quick summary based on "${prompt}". I cross-referenced recent records and surfaced the most relevant findings.`,
          aiHref: "/dashboard",
        });
      }, 350);
    } else {
      sendMessage(active.id, { kind: "text", text });
    }

    setDraft("");
    setDraftLinked(null);
  }

  return (
    <ICMShell title="Messages" showAIPanel={false}>
      <div className="flex h-[calc(100dvh-160px)] -m-3 sm:-m-6 bg-icm-bg">
        {/* LEFT — conversation list (hidden on mobile when a conversation is active) */}
        <aside
          className={cn(
            "w-full md:w-[280px] shrink-0 bg-icm-panel border-r border-icm-border flex-col",
            active ? "hidden md:flex" : "flex"
          )}
        >
          <div className="p-3 border-b border-icm-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-manrope font-bold text-[15px] text-icm-text">
                Messages
              </p>
              {unreadTotal > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10.5px] font-geist font-semibold text-icm-accent hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <button
              onClick={() => setNewOpen(true)}
              className="w-full h-8 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" /> New message
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-icm-text-faint absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-8 pl-7 pr-2 rounded-lg border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent"
              />
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  { v: "all", label: "All" },
                  { v: "direct", label: "Direct" },
                  { v: "groups", label: "Groups" },
                  { v: "unread", label: "Unread" },
                ] as const
              ).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setListTab(t.v)}
                  className={cn(
                    "flex-1 h-7 rounded-lg text-[11px] font-geist font-semibold transition-colors",
                    listTab === t.v
                      ? "bg-icm-text text-icm-panel"
                      : "text-icm-text-dim hover:bg-icm-bg"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <p className="px-3 py-6 text-[12px] font-geist text-icm-text-dim text-center">
                No conversations
              </p>
            ) : (
              filteredConversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onClick={() => setActiveId(c.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* RIGHT — active conversation */}
        <section
          className={cn(
            "flex-1 flex-col min-w-0 bg-icm-bg",
            active ? "flex" : "hidden md:flex"
          )}
        >
          {!active ? (
            <EmptyConversation onNew={() => setNewOpen(true)} />
          ) : (
            <ActiveConversation
              conversation={active}
              messages={messagesForConversation(active.id)}
              draft={draft}
              setDraft={setDraft}
              draftLinked={draftLinked}
              setDraftLinked={setDraftLinked}
              onSend={handleSend}
              showMentionPicker={showMentionPicker}
              setShowMentionPicker={setShowMentionPicker}
              showLinkPicker={showLinkPicker}
              setShowLinkPicker={setShowLinkPicker}
              headerMenuOpen={headerMenuOpen}
              setHeaderMenuOpen={setHeaderMenuOpen}
              renameMode={renameMode}
              setRenameMode={setRenameMode}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onBack={() => setActiveId(null)}
              onRename={(val) => {
                renameGroup(active.id, val);
                setRenameMode(false);
              }}
            />
          )}
        </section>


        {newOpen && (
          <NewMessageModal
            onClose={() => setNewOpen(false)}
            onCreate={(memberIds, groupName, firstMessage) => {
              const id = createConversation(memberIds, groupName);
              if (firstMessage.trim()) {
                sendMessage(id, { kind: "text", text: firstMessage });
              }
              setActiveId(id);
              setNewOpen(false);
            }}
          />
        )}
      </div>
    </ICMShell>
  );
};

// ----- Conversation list row ----------------------------------------------

function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const name = conversationDisplayName(conversation);
  const other = conversationOtherMember(conversation);
  const isGroup = conversation.type === "group";

  // Build avatar
  const avatarMembers = isGroup
    ? conversation.memberIds
        .filter((id) => id !== CURRENT_USER_ID)
        .slice(0, 3)
        .map((id) => staffById[id])
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-icm-border last:border-b-0 transition-colors flex items-start gap-2.5 relative",
        active
          ? "bg-icm-accent-soft/40 border-l-4 border-l-icm-accent pl-2"
          : "hover:bg-icm-bg border-l-4 border-l-transparent pl-2"
      )}
    >
      {isGroup ? (
        <div className="relative w-8 h-8 shrink-0">
          {avatarMembers?.map((m, i) => (
            <span
              key={m.id}
              className={cn(
                "absolute w-6 h-6 rounded-full ring-1 ring-icm-panel flex items-center justify-center text-[9px] font-geist font-bold",
                roleAvatarTone(m.role)
              )}
              style={{ left: i * 8, top: i * 4, zIndex: 3 - i }}
            >
              {m.initials}
            </span>
          ))}
        </div>
      ) : (
        <div className="relative shrink-0">
          <span
            className={cn(
              "w-8 h-8 rounded-lg ring-1 flex items-center justify-center text-[11px] font-geist font-bold",
              other ? roleAvatarTone(other.role) : "bg-icm-bg text-icm-text-dim"
            )}
          >
            {other?.initials ?? "?"}
          </span>
          {other?.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-icm-green ring-2 ring-icm-panel" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-[13px] font-geist truncate",
              conversation.unread > 0 ? "font-bold text-icm-text" : "font-semibold text-icm-text"
            )}
          >
            {name}
          </p>
          <span className="text-[10.5px] font-mono text-icm-text-faint shrink-0">
            {conversation.lastTimestamp}
          </span>
        </div>
        {isGroup && (
          <p className="text-[10.5px] font-geist text-icm-text-faint">
            {conversation.memberIds.length} members
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "text-[12px] font-geist truncate",
              conversation.unread > 0 ? "text-icm-text" : "text-icm-text-dim"
            )}
          >
            {conversation.lastWasYou && (
              <span className="text-icm-text-faint">You: </span>
            )}
            {conversation.lastPreview}
          </p>
          {conversation.unread > 0 && (
            <span className="px-1.5 h-[16px] min-w-[16px] rounded-full bg-icm-red text-white text-[9px] font-mono font-bold flex items-center justify-center shrink-0">
              {conversation.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ----- Empty state ---------------------------------------------------------

function EmptyConversation({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-icm-panel ring-1 ring-icm-border flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-icm-text-faint" />
        </div>
        <p className="text-[13px] font-geist text-icm-text-dim">
          Select a conversation or start a new one
        </p>
        <button
          onClick={onNew}
          className="h-9 px-3 rounded-lg bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> New message
        </button>
      </div>
    </div>
  );
}

// ----- Active conversation panel ------------------------------------------

interface ActiveConversationProps {
  conversation: Conversation;
  messages: ChatMessage[];
  draft: string;
  setDraft: (v: string) => void;
  draftLinked: LinkedRecord | null;
  setDraftLinked: (v: LinkedRecord | null) => void;
  onSend: () => void;
  showMentionPicker: boolean;
  setShowMentionPicker: (v: boolean) => void;
  showLinkPicker: boolean;
  setShowLinkPicker: (v: boolean) => void;
  headerMenuOpen: boolean;
  setHeaderMenuOpen: (v: boolean) => void;
  renameMode: boolean;
  setRenameMode: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onRename: (v: string) => void;
  onBack?: () => void;
}

function ActiveConversation({
  conversation,
  messages,
  draft,
  setDraft,
  draftLinked,
  setDraftLinked,
  onSend,
  showMentionPicker,
  setShowMentionPicker,
  showLinkPicker,
  setShowLinkPicker,
  headerMenuOpen,
  setHeaderMenuOpen,
  renameMode,
  setRenameMode,
  renameValue,
  setRenameValue,
  onRename,
  onBack,
}: ActiveConversationProps) {
  const isGroup = conversation.type === "group";
  const other = conversationOtherMember(conversation);
  const name = conversationDisplayName(conversation);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, conversation.id]);

  // Group messages by day for date separators
  const grouped = useMemo(() => {
    const out: { label: string; items: ChatMessage[] }[] = [];
    messages.forEach((m) => {
      const last = out[out.length - 1];
      if (last && last.label === m.dayLabel) last.items.push(m);
      else out.push({ label: m.dayLabel, items: [m] });
    });
    return out;
  }, [messages]);

  return (
    <>
      {/* Header */}
      <header className="px-4 py-2.5 border-b border-icm-border bg-icm-panel flex items-center gap-3 relative">
        {isGroup ? (
          <div className="relative w-10 h-10 shrink-0">
            {conversation.memberIds
              .filter((id) => id !== CURRENT_USER_ID)
              .slice(0, 3)
              .map((id, i) => {
                const m = staffById[id];
                return (
                  <span
                    key={id}
                    className={cn(
                      "absolute w-7 h-7 rounded-lg ring-2 ring-icm-panel flex items-center justify-center text-[10px] font-geist font-bold",
                      roleAvatarTone(m.role)
                    )}
                    style={{ left: i * 10, top: i * 5, zIndex: 3 - i }}
                  >
                    {m.initials}
                  </span>
                );
              })}
          </div>
        ) : (
          <div className="relative shrink-0">
            <span
              className={cn(
                "w-10 h-10 rounded-lg ring-1 flex items-center justify-center text-[12px] font-geist font-bold",
                other ? roleAvatarTone(other.role) : ""
              )}
            >
              {other?.initials}
            </span>
            {other?.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-icm-green ring-2 ring-icm-panel" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {isGroup && renameMode ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => onRename(renameValue)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRename(renameValue);
                if (e.key === "Escape") setRenameMode(false);
              }}
              className="font-manrope font-bold text-[16px] text-icm-text bg-icm-bg border border-icm-border rounded px-2 py-0.5 focus:outline-none focus:border-icm-accent"
            />
          ) : (
            <button
              onClick={() => {
                if (isGroup) {
                  setRenameValue(name);
                  setRenameMode(true);
                }
              }}
              className={cn(
                "block text-left max-w-full",
                isGroup && "hover:opacity-80"
              )}
            >
              <p className="font-manrope font-bold text-[16px] text-icm-text truncate">
                {name}
              </p>
            </button>
          )}
          <p className="text-[11px] font-geist text-icm-text-dim">
            {isGroup
              ? `${conversation.memberIds.length} members · View members`
              : other
                ? `${roleLabel(other.role)} · View profile →`
                : ""}
          </p>
        </div>
        <button
          onClick={() => demoToast("In-conversation search")}
          className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          title="Search in conversation"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
          className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          title="More"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {headerMenuOpen && (
          <div className="absolute top-full right-3 mt-1 z-30 w-52 rounded-xl border border-icm-border bg-icm-panel shadow-elevated py-1">
            {isGroup && <HeaderMenuItem>View member list</HeaderMenuItem>}
            {isGroup && <HeaderMenuItem>Add people to conversation</HeaderMenuItem>}
            <HeaderMenuItem>Mute notifications</HeaderMenuItem>
            <HeaderMenuItem>Mark all as read</HeaderMenuItem>
            {isGroup ? (
              <HeaderMenuItem destructive>Leave conversation</HeaderMenuItem>
            ) : (
              <HeaderMenuItem destructive>Delete conversation</HeaderMenuItem>
            )}
            <HeaderMenuItem>Export conversation</HeaderMenuItem>
          </div>
        )}
      </header>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {grouped.map((g) => (
          <div key={g.label} className="space-y-3">
            <div className="flex items-center justify-center">
              <span className="px-2.5 py-0.5 rounded-full bg-icm-panel border border-icm-border text-[10.5px] font-geist text-icm-text-dim">
                {g.label}
              </span>
            </div>
            <div className="space-y-3">
              {g.items.map((m, i) => {
                const prev = i > 0 ? g.items[i - 1] : null;
                const showAuthor =
                  m.authorId !== CURRENT_USER_ID &&
                  (!prev || prev.authorId !== m.authorId);
                return <MessageBubble key={m.id} message={m} showAuthor={showAuthor} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-icm-border bg-icm-panel p-3 space-y-2">
        {draftLinked && (
          <div className="rounded-lg border border-icm-border bg-icm-bg p-2 flex items-center gap-2">
            <RecordCard record={draftLinked} compact />
            <button
              onClick={() => setDraftLinked(null)}
              className="ml-auto w-7 h-7 rounded-lg hover:bg-icm-panel text-icm-text-dim flex items-center justify-center shrink-0"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="rounded-xl border border-icm-border bg-icm-bg overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-icm-border relative">
            <ToolbarButton title="Attach file">
              <Paperclip className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Mention a user"
              onClick={() => setShowMentionPicker(!showMentionPicker)}
            >
              <AtSign className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Link a record"
              onClick={() => setShowLinkPicker(!showLinkPicker)}
            >
              <Link2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Emoji">
              <Smile className="w-3.5 h-3.5" />
            </ToolbarButton>
            <span className="ml-auto text-[10.5px] font-geist text-icm-text-faint pr-1">
              Tip: type <span className="font-mono text-icm-accent">@AI</span> to ask AI inline
            </span>

            {showMentionPicker && (
              <MentionPicker
                onSelect={(s) => {
                  setDraft(`${draft}${draft && !draft.endsWith(" ") ? " " : ""}@${s.name.split(" ")[0]} `);
                  setShowMentionPicker(false);
                }}
                onClose={() => setShowMentionPicker(false)}
              />
            )}
            {showLinkPicker && (
              <LinkRecordPicker
                onSelect={(r) => {
                  setDraftLinked(r);
                  setShowLinkPicker(false);
                }}
                onClose={() => setShowLinkPicker(false)}
              />
            )}
          </div>

          <div className="flex items-end gap-2 p-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder={`Message ${name}...`}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none min-h-[28px] max-h-[120px] py-1"
            />
            <button
              onClick={onSend}
              disabled={!draft.trim() && !draftLinked}
              className="w-8 h-8 rounded-lg bg-icm-accent text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ToolbarButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg hover:bg-icm-panel text-icm-text-dim hover:text-icm-text flex items-center justify-center"
    >
      {children}
    </button>
  );
}

function HeaderMenuItem({
  children,
  destructive,
}: {
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={() => demoToast(typeof children === "string" ? children : "Menu action")}
      className={cn(
        "w-full text-left px-3 py-1.5 text-[12px] font-geist hover:bg-icm-bg",
        destructive ? "text-icm-red" : "text-icm-text"
      )}
    >
      {children}
    </button>
  );
}

// ----- Single message bubble ----------------------------------------------

function MessageBubble({
  message,
  showAuthor,
}: {
  message: ChatMessage;
  showAuthor: boolean;
}) {
  const isMe = message.authorId === CURRENT_USER_ID;
  const author = staffById[message.authorId];

  if (message.kind === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] font-geist text-icm-text-faint italic">
          {message.systemText}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <span
          className={cn(
            "w-7 h-7 rounded-lg ring-1 flex items-center justify-center text-[10px] font-geist font-bold shrink-0",
            roleAvatarTone(author.role)
          )}
        >
          {author.initials}
        </span>
      )}
      <div className={cn("max-w-[70%] flex flex-col", isMe ? "items-end" : "items-start")}>
        {showAuthor && !isMe && (
          <p className="text-[10.5px] font-geist text-icm-text-dim mb-0.5 ml-1">
            {author.name}
          </p>
        )}
        <BubbleBody message={message} isMe={isMe} />
        <div
          className={cn(
            "flex items-center gap-1 mt-0.5",
            isMe ? "flex-row-reverse mr-1" : "ml-1"
          )}
        >
          <span className="text-[10px] font-mono text-icm-text-faint">
            {message.timestamp}
          </span>
          {isMe && message.receipt && <ReceiptIcon receipt={message.receipt} />}
        </div>
      </div>
    </div>
  );
}

function BubbleBody({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  if (message.kind === "linked_record" && message.linkedRecord) {
    return <RecordCard record={message.linkedRecord} />;
  }

  if (message.kind === "ai_summary") {
    return (
      <div className="rounded-2xl rounded-bl-sm bg-icm-accent-soft border border-icm-accent/20 px-3 py-2 max-w-full">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
          <span className="text-[10.5px] font-geist font-bold text-icm-accent uppercase tracking-wider">
            AI Summary
          </span>
        </div>
        <p className="text-[12.5px] font-geist text-icm-text leading-relaxed">
          {message.aiTitle}
        </p>
        {message.aiHref && (
          <a
            href={message.aiHref}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent hover:underline"
          >
            View full report <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  if (message.kind === "file") {
    return (
      <div className="rounded-2xl bg-icm-panel border border-icm-border px-3 py-2 flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-icm-text-dim" />
        <div>
          <p className="text-[12.5px] font-geist font-semibold text-icm-text">
            {message.fileName}
          </p>
          <p className="text-[10.5px] font-mono text-icm-text-faint">{message.fileSize}</p>
        </div>
      </div>
    );
  }

  // text
  return (
    <div
      className={cn(
        "px-3 py-1.5 max-w-full break-words",
        isMe
          ? "rounded-2xl rounded-br-sm bg-icm-accent text-white"
          : "rounded-2xl rounded-bl-sm bg-icm-panel border border-icm-border text-icm-text"
      )}
    >
      <p className="text-[12.5px] font-geist leading-relaxed whitespace-pre-wrap">
        {renderTextWithMentions(message.text ?? "", isMe)}
      </p>
    </div>
  );
}

function renderTextWithMentions(text: string, isMe: boolean) {
  // Highlight @Word tokens
  const parts = text.split(/(@[A-Za-z][A-Za-z0-9_]*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("@")) {
      return (
        <span
          key={i}
          className={cn(
            "font-bold",
            isMe ? "text-white" : "text-icm-accent"
          )}
        >
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function ReceiptIcon({ receipt }: { receipt: NonNullable<ChatMessage["receipt"]> }) {
  if (receipt === "delivered")
    return <Check className="w-3 h-3 text-icm-text-faint" />;
  if (receipt === "seen")
    return <CheckCheck className="w-3 h-3 text-icm-text-faint" />;
  return <CheckCheck className="w-3 h-3 text-icm-accent" />;
}

// ----- Linked record card -------------------------------------------------

function recordIcon(kind: LinkedRecord["moduleIcon"]) {
  const cls = "w-3.5 h-3.5";
  switch (kind) {
    case "monitoring":
      return <ClipboardList className={cls} />;
    case "incident":
      return <AlertTriangle className={cls} />;
    case "isp":
    case "assessment":
    case "referral":
      return <FileText className={cls} />;
    case "note":
    default:
      return <ListChecks className={cls} />;
  }
}

function RecordCard({ record, compact }: { record: LinkedRecord; compact?: boolean }) {
  return (
    <a
      href={record.href}
      className={cn(
        "block rounded-lg border border-icm-border bg-icm-panel hover:border-icm-accent transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded bg-icm-bg ring-1 ring-icm-border flex items-center justify-center text-icm-text-dim shrink-0">
          {recordIcon(record.moduleIcon)}
        </span>
        <span className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim">
          {record.moduleLabel}
        </span>
        <span className="text-icm-text-faint">·</span>
        <span className="text-[11.5px] font-geist font-semibold text-icm-text">
          {record.individualName}
        </span>
      </div>
      <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">{record.detail}</p>
      <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-geist font-semibold text-icm-accent">
        View <ArrowRight className="w-3 h-3" />
      </span>
    </a>
  );
}

// ----- Mention picker (simple dropdown) -----------------------------------

function MentionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (s: StaffMember) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute bottom-full left-2 mb-1 z-30 w-56 rounded-xl border border-icm-border bg-icm-panel shadow-elevated py-1"
      onMouseLeave={onClose}
    >
      <p className="px-3 py-1 text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint">
        Mention a user
      </p>
      {allStaff.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-icm-bg text-left"
        >
          <span
            className={cn(
              "w-6 h-6 rounded-full ring-1 flex items-center justify-center text-[9px] font-geist font-bold",
              roleAvatarTone(s.role)
            )}
          >
            {s.initials}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-geist font-semibold text-icm-text truncate">
              {s.name}
            </p>
            <p className="text-[10.5px] font-geist text-icm-text-faint">
              {roleLabel(s.role)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ----- Link record picker -------------------------------------------------

const SAMPLE_RECORDS: LinkedRecord[] = [
  {
    moduleIcon: "monitoring",
    moduleLabel: "Monitoring Form",
    individualName: "Joseph Brown",
    detail: "Due 04/09/2026",
    href: "/people/1/monitoring-form",
  },
  {
    moduleIcon: "isp",
    moduleLabel: "Care Plan / ISP",
    individualName: "Joseph Brown",
    detail: "Renewal overdue 25 days",
    href: "/people/1/care-plan",
  },
  {
    moduleIcon: "incident",
    moduleLabel: "Incident",
    individualName: "Joseph Brown",
    detail: "ID 99225 — under review",
    href: "/people/1/incident-reporting",
  },
  {
    moduleIcon: "note",
    moduleLabel: "Contact Note",
    individualName: "Joseph Brown",
    detail: "Quarterly visit completed 04/27/2026",
    href: "/people/1/contact-note",
  },
];

function LinkRecordPicker({
  onSelect,
  onClose,
}: {
  onSelect: (r: LinkedRecord) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute bottom-full left-12 mb-1 z-30 w-72 rounded-xl border border-icm-border bg-icm-panel shadow-elevated py-1"
      onMouseLeave={onClose}
    >
      <p className="px-3 py-1 text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint">
        Link a record
      </p>
      {SAMPLE_RECORDS.map((r, i) => (
        <button
          key={i}
          onClick={() => onSelect(r)}
          className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-icm-bg text-left"
        >
          <span className="w-5 h-5 rounded bg-icm-bg ring-1 ring-icm-border flex items-center justify-center text-icm-text-dim shrink-0 mt-0.5">
            {recordIcon(r.moduleIcon)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-geist font-semibold text-icm-text">
              {r.moduleLabel} · {r.individualName}
            </p>
            <p className="text-[10.5px] font-geist text-icm-text-dim truncate">
              {r.detail}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ----- New message modal --------------------------------------------------

function NewMessageModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (memberIds: string[], groupName: string | undefined, firstMessage: string) => void;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");

  const matches = allStaff.filter(
    (s) =>
      !recipients.includes(s.id) &&
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const isGroup = recipients.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-icm-panel border border-icm-border shadow-elevated overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
          <p className="font-manrope font-bold text-[15px] text-icm-text">New Message</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              To
            </label>
            <div className="mt-1 rounded-lg border border-icm-border bg-icm-bg px-2 py-1.5 flex flex-wrap gap-1.5 min-h-[40px]">
              {recipients.map((id) => {
                const s = staffById[id];
                return (
                  <span
                    key={id}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-geist font-semibold ring-1",
                      roleAvatarTone(s.role)
                    )}
                  >
                    {s.name}
                    <button
                      onClick={() => setRecipients(recipients.filter((r) => r !== id))}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={recipients.length === 0 ? "Search staff..." : ""}
                className="flex-1 min-w-[120px] bg-transparent text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
              />
            </div>
            {search && matches.length > 0 && (
              <div className="mt-1 rounded-lg border border-icm-border bg-icm-panel max-h-48 overflow-y-auto">
                {matches.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setRecipients([...recipients, s.id]);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-icm-bg text-left"
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full ring-1 flex items-center justify-center text-[9px] font-geist font-bold",
                        roleAvatarTone(s.role)
                      )}
                    >
                      {s.initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-geist font-semibold text-icm-text">
                        {s.name}
                      </p>
                      <p className="text-[10.5px] font-geist text-icm-text-faint">
                        {roleLabel(s.role)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isGroup && (
            <div>
              <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                Group name (optional)
              </label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Joseph Brown — Quarterly Review"
                className="mt-1 w-full h-9 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent"
              />
            </div>
          )}

        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-icm-border">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (recipients.length === 0) return;
              onCreate(recipients, groupName.trim() || undefined, "");
            }}
            disabled={recipients.length === 0}
            className="h-8 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold disabled:opacity-40 hover:bg-teal-700"
          >
            Start conversation
          </button>
        </div>
      </div>
    </div>
  );
}

export default Messages;
