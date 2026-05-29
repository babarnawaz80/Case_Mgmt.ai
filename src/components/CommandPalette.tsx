import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Home, Users, CheckSquare, MessageSquare, BarChart3,
  CreditCard, Settings, FileText, Pencil, CalendarCheck,
  Phone, AlertTriangle, Folder, ArrowRight,
  Loader2, Sparkles, User, Shield, X,
  Bell, Building2, Link, Upload, Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndividuals, initials, riskAvatarClass } from "@/hooks/useIndividuals";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CommandPaletteState = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  action: () => void;
  category: "Navigation" | "People" | "Actions" | "Settings";
  keywords?: string[];
}

// ─── Static item definitions ─────────────────────────────────────────────────

export const NAV_ITEMS: Omit<CommandItem, "action">[] = [
  { id: "nav-dashboard",  label: "Dashboard",         icon: Home,          category: "Navigation" },
  { id: "nav-my-work",    label: "My Work",            icon: CheckSquare,   category: "Navigation" },
  { id: "nav-people",     label: "People Supported",   icon: Users,         category: "Navigation" },
  { id: "nav-messages",   label: "Messages",           icon: MessageSquare, category: "Navigation" },
  { id: "nav-reports",    label: "Reports",            icon: BarChart3,     category: "Navigation" },
  { id: "nav-billing",    label: "Billing Hub",        icon: CreditCard,    category: "Navigation" },
  { id: "nav-incidents",  label: "Incidents",          icon: AlertTriangle, category: "Navigation" },
  { id: "nav-documents",  label: "Documents",          icon: Folder,        category: "Navigation" },
  { id: "nav-referrals",  label: "All Referrals",      icon: Phone,         category: "Navigation" },
  { id: "nav-settings",   label: "Settings",           icon: Settings,      category: "Navigation" },
];

export const ACTION_ITEMS: Omit<CommandItem, "action">[] = [
  {
    id: "act-new-progress-note",
    label: "New Progress Note",
    sublabel: "Create a progress note",
    icon: Pencil,
    category: "Actions",
    keywords: ["note", "document", "write"],
  },
  {
    id: "act-new-contact-note",
    label: "New Contact Note",
    sublabel: "Log a contact interaction",
    icon: FileText,
    category: "Actions",
    keywords: ["contact", "note", "log"],
  },
  {
    id: "act-new-visit",
    label: "New Visit Summary",
    sublabel: "Schedule or document a visit",
    icon: CalendarCheck,
    category: "Actions",
    keywords: ["visit", "schedule"],
  },
  {
    id: "act-new-incident",
    label: "New Incident Report",
    sublabel: "Report a critical incident",
    icon: AlertTriangle,
    category: "Actions",
    keywords: ["incident", "report"],
  },
  {
    id: "act-new-intake",
    label: "New Participant Intake",
    sublabel: "Enroll a new individual",
    icon: User,
    category: "Actions",
    keywords: ["intake", "new", "participant", "enroll"],
  },
  {
    id: "act-new-oncall",
    label: "New On-Call Log",
    sublabel: "Log an on-call interaction",
    icon: Phone,
    category: "Actions",
    keywords: ["oncall", "call", "log"],
  },
  {
    id: "act-compliance",
    label: "Compliance Dashboard",
    sublabel: "View compliance overview",
    icon: Shield,
    category: "Actions",
    keywords: ["compliance", "audit"],
  },
  {
    id: "act-ai",
    label: "Ask AI Assistant",
    sublabel: "Get AI insights about your caseload",
    icon: Sparkles,
    category: "Actions",
    keywords: ["ai", "ask", "help", "assistant"],
  },
];

export const NAV_ROUTES: Record<string, string> = {
  "nav-dashboard": "/dashboard",
  "nav-my-work":   "/my-work",
  "nav-people":    "/people",
  "nav-messages":  "/messages",
  "nav-reports":   "/reports",
  "nav-billing":   "/billing",
  "nav-incidents": "/incidents",
  "nav-documents": "/documents",
  "nav-referrals": "/referrals",
  "nav-settings":  "/settings",
};

export const ACTION_ROUTES: Record<string, string> = {
  "act-new-progress-note": "/progress-note/new",
  "act-new-contact-note":  "/modules/contact-note",
  "act-new-visit":         "/visit-summary/new",
  "act-new-intake":        "/people/new",
  "act-new-oncall":        "/oncall-log/new",
  "act-compliance":        "/supervisor/compliance",
};

export const SETTINGS_ITEMS: Omit<CommandItem, "action">[] = [
  { id: "set-org",           label: "Organization Profile",  sublabel: "Name, address, logo, brand color, NPI",   icon: Building2,  category: "Settings", keywords: ["organization", "org", "address", "logo", "brand", "color", "npi", "license", "phone", "fax", "states", "profile"] },
  { id: "set-security",      label: "Security & Password",   sublabel: "Password policy, session timeout, MFA",   icon: Shield,     category: "Settings", keywords: ["security", "password", "timeout", "session", "mfa", "2fa", "login", "expiry", "expire"] },
  { id: "set-users",         label: "Users & Permissions",   sublabel: "Manage team members and roles",           icon: Users,      category: "Settings", keywords: ["users", "staff", "team", "permissions", "roles", "invite", "add user", "members"] },
  { id: "set-billing",       label: "Billing Configuration", sublabel: "Service codes, rates, payers",            icon: CreditCard, category: "Settings", keywords: ["billing", "rates", "payers", "service codes", "claims", "invoice", "revenue"] },
  { id: "set-programs",      label: "Programs",              sublabel: "Configure service programs",              icon: Folder,     category: "Settings", keywords: ["programs", "services", "waiver", "idd", "dda"] },
  { id: "set-ai",            label: "AI Settings",           sublabel: "AI credits, features, models",            icon: Sparkles,   category: "Settings", keywords: ["ai", "credits", "gemini", "intelligence", "automation", "features"] },
  { id: "set-notifications", label: "Notifications",         sublabel: "Email and in-app notifications",          icon: Bell,       category: "Settings", keywords: ["notifications", "alerts", "email", "reminders"] },
  { id: "set-integrations",  label: "Integrations",          sublabel: "Third-party connections",                 icon: Link,       category: "Settings", keywords: ["integrations", "api", "connect", "third party", "deepgram", "voice"] },
  { id: "set-templates",     label: "Document Templates",    sublabel: "Note and form templates",                 icon: FileText,   category: "Settings", keywords: ["templates", "forms", "documents", "progress note", "contact note"] },
  { id: "set-import",        label: "Import Data",           sublabel: "Import individuals, staff, and data",     icon: Upload,     category: "Settings", keywords: ["import", "upload", "csv", "data", "individuals", "staff"] },
];

export const SETTINGS_ROUTES: Record<string, string> = {
  "set-org":           "/settings/organization",
  "set-security":      "/settings/security",
  "set-users":         "/settings/users",
  "set-billing":       "/settings/billing-config",
  "set-programs":      "/settings/programs",
  "set-ai":            "/settings/ai",
  "set-notifications": "/settings/notifications",
  "set-integrations":  "/settings/integrations",
  "set-templates":     "/settings/templates",
  "set-import":        "/settings/import",
};

// ─── Recent items helpers ─────────────────────────────────────────────────────

const RECENT_KEY = "cp_recent_v1";
const RECENT_MAX = 5;

function loadRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecentId(id: string): void {
  try {
    const current = loadRecentIds().filter((i) => i !== id);
    const next = [id, ...current].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

// ─── Singleton open/close state ───────────────────────────────────────────────

type Listener = (open: boolean) => void;
const paletteListeners = new Set<Listener>();
let paletteOpen = false;

export function openCommandPalette() {
  paletteOpen = true;
  paletteListeners.forEach((l) => l(true));
}

export function closeCommandPalette() {
  paletteOpen = false;
  paletteListeners.forEach((l) => l(false));
}

export function useCommandPalette() {
  const [open, setOpenRaw] = useState(paletteOpen);
  useEffect(() => {
    const cb = (v: boolean) => setOpenRaw(v);
    paletteListeners.add(cb);
    return () => {
      paletteListeners.delete(cb);
    };
  }, []);
  return {
    open,
    toggle: () => {
      paletteOpen ? closeCommandPalette() : openCommandPalette();
    },
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpenRaw] = useState(paletteOpen);
  const [q, setQ] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { individuals, loading: loadingPeople } = useIndividuals();

  // Subscribe to singleton state
  useEffect(() => {
    const cb = (v: boolean) => setOpenRaw(v);
    paletteListeners.add(cb);
    return () => {
      paletteListeners.delete(cb);
    };
  }, []);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        paletteOpen ? closeCommandPalette() : openCommandPalette();
      }
      if (e.key === "Escape" && paletteOpen) {
        closeCommandPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-focus input when opened; reset state + load recents
  useEffect(() => {
    if (open) {
      setQ("");
      setSelectedIdx(0);
      setRecentIds(loadRecentIds());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build full command list (memoised by individuals + navigate)
  const allItems = useMemo((): CommandItem[] => {
    const navItems: CommandItem[] = NAV_ITEMS.map((n) => ({
      ...n,
      action: () => navigate(NAV_ROUTES[n.id]),
    }));

    const actionItems: CommandItem[] = ACTION_ITEMS.map((a) => ({
      ...a,
      action: () => {
        if (ACTION_ROUTES[a.id]) {
          navigate(ACTION_ROUTES[a.id]);
        } else if (a.id === "act-new-incident") {
          navigate("/incidents");
        }
        // act-ai has no route; handled by AI panel — no-op here (future: toggleAI)
      },
    }));

    const settingsItems: CommandItem[] = SETTINGS_ITEMS.map((s) => ({
      ...s,
      action: () => navigate(SETTINGS_ROUTES[s.id]),
    }));

    const peopleItems: CommandItem[] = individuals
      .filter((p) => p.enrollment_status === "active")
      .slice(0, 100)
      .map((p) => ({
        id: `person-${p.id}`,
        label: `${p.first_name} ${p.last_name}`,
        sublabel: [p.county, p.program].filter(Boolean).join(" · ") || undefined,
        icon: User,
        category: "People" as const,
        action: () => navigate(`/people/${p.id}/echart`),
        keywords: [p.first_name, p.last_name, p.county ?? "", p.medicaid_id ?? ""].filter(Boolean),
      }));

    return [...actionItems, ...navItems, ...settingsItems, ...peopleItems];
  }, [individuals, navigate]);

  // Filter by query
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) {
      const actions = allItems.filter((i) => i.category === "Actions");
      const nav     = allItems.filter((i) => i.category === "Navigation").slice(0, 6);
      const people  = allItems.filter((i) => i.category === "People").slice(0, 5);
      return [...actions, ...nav, ...people];
    }
    return allItems
      .filter((item) => {
        const searchable = [item.label, item.sublabel ?? "", ...(item.keywords ?? [])]
          .join(" ")
          .toLowerCase();
        return searchable.includes(term);
      })
      .slice(0, 20);
  }, [allItems, q]);

  // Resolve recent ids to full CommandItems (for display when query is empty)
  const recentItems = useMemo((): CommandItem[] => {
    if (q.trim()) return [];
    return recentIds
      .map((id) => allItems.find((item) => item.id === id))
      .filter((item): item is CommandItem => item != null);
  }, [recentIds, allItems, q]);

  // Group results by category (ordered), with Recent prepended when query is empty
  const groups = useMemo(() => {
    type GroupEntry = { category: string; items: CommandItem[] };
    const result: GroupEntry[] = [];

    if (recentItems.length > 0) {
      result.push({ category: "Recent", items: recentItems });
    }

    const order: CommandItem["category"][] = ["Actions", "People", "Navigation", "Settings"];
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    });
    order
      .filter((cat) => map.has(cat))
      .forEach((cat) => result.push({ category: cat, items: map.get(cat)! }));

    return result;
  }, [filtered, recentItems]);

  // Flat index map for keyboard selection (includes all items across groups)
  const { itemFlatIdx, flatItems } = useMemo(() => {
    let idx = 0;
    const m = new Map<string, number>();
    const flat: CommandItem[] = [];
    groups.forEach((g) => g.items.forEach((item) => {
      m.set(item.id, idx++);
      flat.push(item);
    }));
    return { itemFlatIdx: m, flatItems: flat };
  }, [groups]);

  // Select an item: run its action, save to recents, close
  function selectItem(item: CommandItem) {
    saveRecentId(item.id);
    setRecentIds(loadRecentIds());
    item.action();
    closeCommandPalette();
  }

  // Keyboard navigation inside the input
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[selectedIdx];
      if (item) {
        selectItem(item);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={closeCommandPalette}
    >
      <div
        className="w-full max-w-[600px] rounded-2xl bg-icm-panel border border-icm-border shadow-[0_32px_80px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* ── Search input ── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-icm-border bg-icm-panel">
          <Search className="w-[18px] h-[18px] text-icm-accent shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search people, settings, actions, pages…"
            className="flex-1 bg-transparent text-[15px] font-geist font-medium text-icm-text placeholder:text-icm-text-faint focus:outline-none"
            aria-label="Command palette search"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="w-6 h-6 rounded flex items-center justify-center text-icm-text-faint hover:text-icm-text transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-icm-text-faint bg-icm-bg border border-icm-border">
            ESC
          </kbd>
        </div>

        {/* ── Results list ── */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1.5">
          {/* Loading indicator (only when querying people) */}
          {loadingPeople && q && (
            <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-icm-text-dim font-geist">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading people…
            </div>
          )}

          {/* Empty state */}
          {!loadingPeople && flatItems.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-icm-text-dim font-geist">
                No results for &ldquo;{q}&rdquo;
              </p>
              <p className="text-[11px] text-icm-text-faint font-geist mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Grouped results */}
          {groups.map(({ category, items }) => (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-1 select-none">
                {category === "Recent" && <Clock className="w-3 h-3 text-icm-text-faint" />}
                <p className="text-[10px] uppercase tracking-[0.08em] font-geist font-semibold text-icm-text-faint">
                  {category}
                </p>
                <div className="flex-1 h-px bg-icm-border/60" />
              </div>
              {items.map((item) => {
                const idx = itemFlatIdx.get(item.id) ?? 0;
                const isSelected = idx === selectedIdx;
                const Icon = item.icon;
                const isPerson = item.category === "People";
                const personId = isPerson ? item.id.replace("person-", "") : null;
                const person = personId ? individuals.find((p) => p.id === personId) : null;
                const isSettings = item.category === "Settings";

                return (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={cn(
                      "group w-full text-left flex items-center gap-3 px-4 py-2 transition-colors",
                      isSelected ? "bg-icm-accent-soft" : "hover:bg-icm-bg"
                    )}
                  >
                    {/* Avatar or icon */}
                    {isPerson && person ? (
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold shrink-0",
                          riskAvatarClass(person.risk_score)
                        )}
                      >
                        {initials(person)}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-icm-accent/15 text-icm-accent"
                            : isSettings
                              ? "bg-icm-bg/60 text-icm-text-dim"
                              : "bg-icm-bg text-icm-text-dim border border-icm-border"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Label + sublabel */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-[13px] font-geist truncate",
                          isSelected
                            ? "font-semibold text-icm-accent"
                            : "font-semibold text-icm-text"
                        )}
                      >
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-[11px] text-icm-text-dim font-geist truncate">
                          {item.sublabel}
                        </p>
                      )}
                    </div>

                    {/* ↵ hint — visible only on hover/selected */}
                    <kbd
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono border transition-opacity shrink-0",
                        isSelected
                          ? "opacity-100 bg-icm-accent/10 border-icm-accent/30 text-icm-accent"
                          : "opacity-0 group-hover:opacity-60 bg-icm-bg border-icm-border text-icm-text-faint"
                      )}
                    >
                      ↵
                    </kbd>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer: keyboard hints ── */}
        <div className="px-4 py-2 border-t border-icm-border flex items-center justify-center gap-3 text-[10px] font-geist text-icm-text-faint">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border leading-none">↑↓</kbd>
            navigate
          </span>
          <span className="text-icm-border select-none">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border leading-none">↵</kbd>
            select
          </span>
          <span className="text-icm-border select-none">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border leading-none">esc</kbd>
            close
          </span>
          <span className="ml-auto inline-flex items-center gap-1 opacity-60">
            <Sparkles className="w-3 h-3 text-icm-accent" />
            CaseManagement.AI
          </span>
        </div>
      </div>
    </div>
  );
}
