/**
 * MentionInput — textarea (or single-line input) with @mention autocomplete.
 *
 * When the user types "@" followed by non-space text, a floating dropdown
 * shows matching team members. Selecting one inserts "@First Last " at the
 * cursor and tracks the mentioned user's UID.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MentionSuggestion {
  uid: string;
  name: string;
  role?: string;
  initials: string;
}

export interface MentionInputProps {
  value: string;
  onChange: (value: string, mentionedUids: string[]) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** If true, renders as a single-line <input> instead of <textarea> */
  singleLine?: boolean;
}

// ─── Avatar colors (deterministic from uid) ──────────────────────────────────

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function avatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Role label (brief) ───────────────────────────────────────────────────────

function shortRole(role?: string): string {
  if (!role) return "";
  const map: Record<string, string> = {
    admin: "Admin",
    supervisor: "Supervisor",
    case_manager: "Case Manager",
    platform_admin: "Platform Admin",
  };
  return map[role] ?? role;
}

// ─── Extract the @-query at the cursor position ───────────────────────────────

/**
 * Returns the "@query" text that ends at `cursorPos`, or null if the cursor
 * is not immediately after an "@" sequence (with no spaces inside).
 */
function extractMentionQuery(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@([^\s@]*)$/);
  return match ? match[1] : null;
}

/**
 * Returns the start index of the "@query" token ending at `cursorPos`.
 */
function mentionStartIndex(text: string, cursorPos: number): number {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return -1;
  return cursorPos - match[0].length; // position of the "@" itself
}

// ─── Extract all @Name tokens already present in text ────────────────────────

function extractMentionedUids(text: string, userList: MentionSuggestion[]): string[] {
  const tokens = text.match(/@([\w\s'-]+?)(?=\s|$|@)/g) ?? [];
  const uids: string[] = [];
  for (const token of tokens) {
    const nameQuery = token.slice(1).trim().toLowerCase();
    const match = userList.find((u) => (u.name ?? "").toLowerCase() === nameQuery);
    if (match && !uids.includes(match.uid)) uids.push(match.uid);
  }
  return uids;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  rows = 3,
  onKeyDown,
  disabled = false,
  autoFocus = false,
  singleLine = false,
}: MentionInputProps) {
  const { userProfile } = useAuth();

  // Cached org user list — fetched once on mount
  const [orgUsers, setOrgUsers] = useState<MentionSuggestion[]>([]);
  const usersFetched = useRef(false);

  // Dropdown state
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Fetch org users once ────────────────────────────────────────────────────

  useEffect(() => {
    if (usersFetched.current || !userProfile?.organizationId) return;
    usersFetched.current = true;

    (async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("organizationId", "==", userProfile.organizationId)
        );
        const snap = await getDocs(q);
        const list: MentionSuggestion[] = snap.docs
          .map((d) => {
            const data = d.data();
            const firstName: string = data.firstName ?? "";
            const lastName: string = data.lastName ?? "";
            const namePart = `${firstName} ${lastName}`.trim();
            const displayName: string =
              data.displayName ||
              namePart ||
              data.email ||
              "Unknown";
            const initials =
              ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() ||
              displayName.slice(0, 2).toUpperCase();
            return {
              uid: d.id,
              name: displayName,
              role: data.role,
              initials: initials,
            };
          })
          .filter((u) => u.name && u.name !== "Unknown")
          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        setOrgUsers(list);
      } catch (err) {
        console.warn("[MentionInput] Failed to load org users:", err);
      }
    })();
  }, [userProfile?.organizationId]);

  // ── Handle text changes ─────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const newVal = e.target.value;
      const cursor = e.target.selectionStart ?? newVal.length;

      const q = extractMentionQuery(newVal, cursor);

      if (q !== null) {
        // Filter users by the query text
        const filtered = orgUsers
          .filter((u) => (u.name ?? "").toLowerCase().includes(q.toLowerCase()))
          .slice(0, 6);
        setSuggestions(filtered);
        setActiveIdx(0);
        setDropdownOpen(filtered.length > 0);
      } else {
        setDropdownOpen(false);
      }

      // Re-derive mentioned UIDs from the updated text
      const mentionedUids = extractMentionedUids(newVal, orgUsers);
      onChange(newVal, mentionedUids);
    },
    [orgUsers, onChange]
  );

  // ── Select a suggestion ─────────────────────────────────────────────────────

  const selectSuggestion = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!inputRef.current) return;

      const cursor = inputRef.current.selectionStart ?? value.length;
      const startIdx = mentionStartIndex(value, cursor);
      if (startIdx === -1) return;

      // Replace "@query" with "@Full Name "
      const before = value.slice(0, startIdx);
      const after = value.slice(cursor);
      const newVal = `${before}@${suggestion.name} ${after}`;

      // Derive fresh mentioned UIDs
      const mentionedUids = extractMentionedUids(newVal, [
        ...orgUsers,
        suggestion,
      ]);

      onChange(newVal, mentionedUids);
      setDropdownOpen(false);

      // Move cursor after the inserted mention
      const newCursor = before.length + suggestion.name.length + 2; // +2 for "@" and " "
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursor, newCursor);
          inputRef.current.focus();
        }
      });
    },
    [value, orgUsers, onChange]
  );

  // ── Keyboard navigation ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (dropdownOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          if (suggestions[activeIdx]) {
            e.preventDefault();
            selectSuggestion(suggestions[activeIdx]);
            return;
          }
        }
        if (e.key === "Escape") {
          setDropdownOpen(false);
          return;
        }
      }

      // Pass through to parent handler
      onKeyDown?.(e as React.KeyboardEvent<HTMLTextAreaElement>);
    },
    [dropdownOpen, suggestions, activeIdx, selectSuggestion, onKeyDown]
  );

  // ── Close dropdown on outside click ────────────────────────────────────────

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // ── Shared input props ──────────────────────────────────────────────────────

  const sharedProps = {
    ref: inputRef as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    disabled,
    autoFocus,
    className,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full">
      {singleLine ? (
        <input type="text" {...sharedProps} />
      ) : (
        <textarea {...sharedProps} rows={rows} />
      )}

      {/* Dropdown */}
      {dropdownOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Mention suggestions"
          className={cn(
            "absolute z-50 bottom-full mb-1 left-0 w-64",
            "bg-white dark:bg-gray-900",
            "border border-icm-border rounded-xl shadow-elevated",
            "py-1 overflow-hidden"
          )}
        >
          {suggestions.map((s, i) => (
            <div
              key={s.uid}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                // Prevent blur before click completes
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                i === activeIdx
                  ? "bg-icm-bg"
                  : "hover:bg-icm-bg"
              )}
            >
              {/* Initials avatar */}
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  avatarColor(s.uid)
                )}
              >
                {s.initials}
              </div>

              {/* Name + role */}
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-geist font-semibold text-icm-text leading-tight truncate">
                  {s.name}
                </div>
                {s.role && (
                  <div className="text-[10.5px] font-geist text-icm-text-dim leading-tight truncate">
                    {shortRole(s.role)}
                  </div>
                )}
              </div>

              {/* Keyboard hint on active item */}
              {i === activeIdx && (
                <kbd className="shrink-0 text-[9px] font-mono text-icm-text-faint bg-icm-bg/60 border border-icm-border rounded px-1">
                  ↵
                </kbd>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
