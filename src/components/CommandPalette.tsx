import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Home, Users, CheckSquare, MessageSquare, BarChart3,
  CreditCard, Settings, FileText, Pencil, CalendarCheck,
  Phone, AlertTriangle, Folder, ArrowRight,
  Loader2, Sparkles, User, Shield, X,
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

const NAV_ITEMS: Omit<CommandItem, "action">[] = [
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

const ACTION_ITEMS: Omit<CommandItem, "action">[] = [
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

const NAV_ROUTES: Record<string, string> = {
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

const ACTION_ROUTES: Record<string, string> = {
  "act-new-progress-note": "/progress-note/new",
  "act-new-contact-note":  "/modules/contact-note",
  "act-new-visit":         "/visit-summary/new",
  "act-new-intake":        "/people/new",
  "act-new-oncall":        "/oncall-log/new",
  "act-compliance":        "/supervisor/compliance",
};

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

  // Auto-focus input when opened; reset state
  useEffect(() => {
    if (open) {
      setQ("");
      setSelectedIdx(0);
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

    return [...actionItems, ...navItems, ...peopleItems];
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

  // Group results by category (ordered)
  const groups = useMemo(() => {
    const order: CommandItem["category"][] = ["Actions", "People", "Navigation", "Settings"];
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    });
    return order
      .filter((cat) => map.has(cat))
      .map((cat) => ({ category: cat, items: map.get(cat)! }));
  }, [filtered]);

  // Flat index map for keyboard selection
  const itemFlatIdx = useMemo(() => {
    let idx = 0;
    const m = new Map<string, number>();
    groups.forEach((g) => g.items.forEach((item) => { m.set(item.id, idx++); }));
    return m;
  }, [groups]);

  // Keyboard navigation inside the input
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[selectedIdx];
      if (item) {
        item.action();
        closeCommandPalette();
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
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-icm-border">
          <Search className="w-4 h-4 text-icm-text-dim shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search people, actions, pages…"
            className="flex-1 bg-transparent text-[14px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
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
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
          {/* Loading indicator (only when querying people) */}
          {loadingPeople && q && (
            <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-icm-text-dim font-geist">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading people…
            </div>
          )}

          {/* Empty state */}
          {!loadingPeople && filtered.length === 0 && (
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
              <p className="px-4 py-1.5 text-[10px] uppercase tracking-widest font-geist font-semibold text-icm-text-faint select-none">
                {category}
              </p>
              {items.map((item) => {
                const idx = itemFlatIdx.get(item.id) ?? 0;
                const isSelected = idx === selectedIdx;
                const Icon = item.icon;
                const isPerson = item.category === "People";
                const personId = isPerson ? item.id.replace("person-", "") : null;
                const person = personId ? individuals.find((p) => p.id === personId) : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      closeCommandPalette();
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-4 py-2 transition-colors",
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
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                          isSelected
                            ? "bg-icm-accent/15 text-icm-accent"
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
                            : "font-medium text-icm-text"
                        )}
                      >
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-[10.5px] text-icm-text-faint font-geist truncate">
                          {item.sublabel}
                        </p>
                      )}
                    </div>

                    {/* Arrow indicator on selected */}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-icm-accent shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer: keyboard hints ── */}
        <div className="px-4 py-2.5 border-t border-icm-border flex items-center gap-4 text-[10.5px] font-geist text-icm-text-faint">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border">
              ↵
            </kbd>
            select
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border">
              ESC
            </kbd>
            close
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-icm-accent" />
            CaseManagement.AI
          </span>
        </div>
      </div>
    </div>
  );
}
