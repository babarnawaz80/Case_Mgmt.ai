import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  BookOpen,
  Plus,
  Search,
  ChevronRight,
  MoreHorizontal,
  Bot,
  Layers,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { getGuidelinesEngines, type GuidelinesEngineDoc } from "@/services/guidelinesEngineService";
import { seedPlatformData } from "@/lib/seedPlatformData";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";

function toDisplayEngine(e: GuidelinesEngineDoc) {
  const updatedOn = e.published_at
    ? e.published_at.toDate().toLocaleDateString()
    : e.created_at
    ? e.created_at.toDate().toLocaleDateString()
    : "—";

  return {
    id: e.id,
    name: e.name,
    state: e.state,
    program: e.program || e.waiver_type || "DD Waiver",
    version: e.version,
    status: (e.status === 'published' ? 'Published' : e.status === 'draft' ? 'Draft' : 'Archived') as 'Published' | 'Draft' | 'Archived',
    effectiveDate: e.effective_date || "—",
    updatedOn,
    borderTone: (e.status === 'published' ? 'green' : e.status === 'draft' ? 'amber' : 'gray') as 'green' | 'amber' | 'gray',
    servicesCount: e.extracted_rules?.required_sections?.length || 0,
    hardStopCount: e.hard_stop_count || e.extracted_rules?.hard_stops?.length || 0,
    warningCount: e.warning_count || e.extracted_rules?.warnings?.length || 0,
    linkedAgentsCount: e.linked_agent_ids?.length || 0,
    hasCustomPrompt: e.has_custom_prompt === true,
  };
}

const GuidelinesEnginesList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [query, setQuery] = useState("");
  const [engines, setEngines] = useState<ReturnType<typeof toDisplayEngine>[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    (async () => {
      await seedPlatformData();
      const docs = await getGuidelinesEngines();
      setEngines(docs.map(toDisplayEngine));
      setLoading(false);
    })();
  }, []);

  const sum = useMemo(() => {
    const total = engines.length;
    const published = engines.filter((e) => e.status === "Published").length;
    const draft = engines.filter((e) => e.status === "Draft").length;
    const linkedAgents = engines.reduce((acc, e) => acc + e.linkedAgentsCount, 0);
    return { total, published, draft, linkedAgents };
  }, [engines]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return engines;
    return engines.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.state.toLowerCase().includes(q) ||
        e.program.toLowerCase().includes(q),
    );
  }, [query, engines]);

  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="Guidelines Engines" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <button
            onClick={() => navigate("/platform")}
            className="hover:text-icm-text inline-flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            Platform
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">Guidelines Engines</span>
        </div>

        {/* Header */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Guidelines Engines
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Convert state guidelines into structured compliance rule sets
            </p>
          </div>
          <button
            onClick={() => navigate("/platform/guidelines-engines/new")}
            className="h-9 px-3.5 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" />
            New Engine
          </button>
        </div>

        {/* Stat chips + search */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip label="Total" value={loading ? 0 : sum.total} />
            <Chip label="Published" value={loading ? 0 : sum.published} tone="green" />
            <Chip label="Draft" value={loading ? 0 : sum.draft} tone="amber" />
            <span className="text-[11.5px] font-geist text-icm-text-dim ml-2 inline-flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              {loading ? 0 : sum.linkedAgents} agents linked
            </span>
          </div>
          <div className="relative w-full sm:w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search engines..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
            />
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full h-[76px] rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-icm-bg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-icm-bg rounded w-1/3" />
                  <div className="h-3 bg-icm-bg rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Engine list */}
        {!loading && (
          <div className="space-y-2.5">
            {filtered.map((e) => {
              const borderCls =
                e.borderTone === "green"
                  ? "border-l-icm-green"
                  : e.borderTone === "amber"
                  ? "border-l-icm-amber"
                  : "border-l-icm-text-faint";
              const iconCls =
                e.borderTone === "green"
                  ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                  : e.borderTone === "amber"
                  ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                  : "bg-icm-bg text-icm-text-dim ring-icm-border";
              const statusCls =
                e.status === "Published"
                  ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                  : e.status === "Draft"
                  ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                  : "bg-icm-bg text-icm-text-dim ring-icm-border";
              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/platform/guidelines-engines/${e.id}`)}
                  className={`w-full text-left rounded-xl border border-icm-border border-l-[3px] ${borderCls} bg-icm-panel p-4 flex items-center gap-4 hover:border-icm-border-strong hover:shadow-elevated transition-all`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg ring-1 flex items-center justify-center shrink-0 ${iconCls}`}
                  >
                    <BookOpen className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-tight font-semibold text-[14px] text-icm-text truncate" title={e.name}>
                        {e.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${statusCls}`}
                      >
                        {e.status.toUpperCase()}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-icm-bg border border-icm-border text-icm-text-dim">
                        {e.version}
                      </span>
                      {e.hasCustomPrompt && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-geist font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">
                          ⚠ Custom prompt
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 truncate">
                      {e.state} · {e.program} · Effective {e.effectiveDate}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-5 shrink-0">
                    <Stat label="SERVICES" value={e.servicesCount} tone="accent" />
                    <Stat label="HARD STOPS" value={e.hardStopCount} tone="red" />
                    <Stat label="WARNINGS" value={e.warningCount} tone="amber" />
                  </div>
                  <div className="hidden xl:flex flex-col items-end gap-1 shrink-0 min-w-[140px]">
                    <span className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist">
                      Updated
                    </span>
                    <span className="text-[11.5px] font-mono text-icm-text-dim">
                      {e.updatedOn}
                    </span>
                    <span className="text-[11px] font-geist text-icm-text-dim inline-flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {e.linkedAgentsCount} agents
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" ref={openMenuId === e.id ? menuRef : null}>
                    <div className="relative">
                      <button
                        className={`h-8 w-8 rounded-lg border text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center justify-center transition-colors ${
                          openMenuId === e.id
                            ? "bg-icm-bg border-icm-border-strong text-icm-text"
                            : "border-icm-border bg-icm-panel"
                        }`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setOpenMenuId(openMenuId === e.id ? null : e.id);
                        }}
                        aria-label="Engine actions"
                        title="Actions"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown menu */}
                      {openMenuId === e.id && (
                        <div
                          className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-icm-border bg-icm-panel shadow-elevated z-50 py-1 overflow-hidden"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setOpenMenuId(null);
                              navigate(`/platform/guidelines-engines/${e.id}`);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-geist text-icm-text hover:bg-icm-bg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-icm-text-dim" />
                            View Engine
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setOpenMenuId(null);
                              navigate(`/platform/guidelines-engines/${e.id}?edit=true`);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-geist text-icm-text hover:bg-icm-bg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-icm-text-dim" />
                            Edit Engine
                          </button>
                          <div className="border-t border-icm-border my-1" />
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setOpenMenuId(null);
                              if (confirm(`Delete "${e.name}"? This cannot be undone.`)) {
                                import("firebase/firestore").then(({ doc, deleteDoc }) => {
                                  import("@/lib/firebase").then(({ db }) => {
                                    deleteDoc(doc(db, "guidelines_engines", e.id)).then(() => {
                                      setEngines((prev) => prev.filter((x) => x.id !== e.id));
                                    });
                                  });
                                });
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-geist text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Engine
                          </button>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-icm-text-faint" />
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-12 text-center">
                <p className="text-[13px] text-icm-text-dim font-geist">
                  No engines match your search.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ICMShell>
  );
};

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green" | "amber";
}) {
  const cls =
    tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "amber"
      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
      : "bg-icm-panel text-icm-text ring-icm-border";
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1 ${cls}`}
    >
      <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-80">
        {label}
      </span>
      <span className="font-mono font-bold text-[14px]">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "red" | "amber";
}) {
  const cls =
    tone === "accent"
      ? "text-icm-accent"
      : tone === "red"
      ? "text-icm-red"
      : "text-icm-amber";
  return (
    <div className="text-center">
      <p className={`font-mono font-bold text-[18px] leading-tight ${cls}`}>
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-geist mt-0.5">
        {label}
      </p>
    </div>
  );
}

export default GuidelinesEnginesList;
