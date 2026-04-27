import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Library, Search, ChevronRight, Layers } from "lucide-react";
import {
  guidelinesEngines,
  allRules,
  RULE_TYPE_TONE,
  type RuleType,
} from "@/data/guidelinesEngines";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";

const RuleLibrary = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [query, setQuery] = useState("");
  const [engineId, setEngineId] = useState<string>("All");
  const [type, setType] = useState<"All" | RuleType>("All");

  const rows = useMemo(() => {
    const out = guidelinesEngines.flatMap((e) => allRules(e));
    const q = query.trim().toLowerCase();
    return out.filter(
      (r) =>
        (engineId === "All" || r.engineId === engineId) &&
        (type === "All" || r.type === type) &&
        (!q ||
          r.description.toLowerCase().includes(q) ||
          r.citation.toLowerCase().includes(q) ||
          r.serviceName.toLowerCase().includes(q)),
    );
  }, [query, engineId, type]);

  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="Rule Library" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <button
            onClick={() => navigate("/platform")}
            className="hover:text-icm-text inline-flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            Platform
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">Rule Library</span>
        </div>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] flex items-center gap-2">
              <Library className="w-6 h-6 text-icm-accent" />
              Rule Library
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Cross-engine searchable index of every rule and citation
            </p>
          </div>
          <span className="text-[12px] font-mono text-icm-text-dim">
            {rows.length} rules
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rules, citations, services..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
            />
          </div>
          <select
            value={engineId}
            onChange={(e) => setEngineId(e.target.value)}
            className="h-9 px-3 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent/40"
          >
            <option value="All">Engine: All</option>
            {guidelinesEngines.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "All" | RuleType)}
            className="h-9 px-3 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent/40"
          >
            <option value="All">Type: All</option>
            <option value="Hard Stop">Type: Hard Stop</option>
            <option value="Warning">Type: Warning</option>
            <option value="Info">Type: Info</option>
          </select>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg">
              <tr className="text-left text-icm-text-faint">
                <th className="px-4 py-2">Rule</th>
                <th className="px-4 py-2 w-[180px]">Engine</th>
                <th className="px-4 py-2 w-[200px]">Service</th>
                <th className="px-4 py-2 w-[100px]">Type</th>
                <th className="px-4 py-2 w-[180px]">Citation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {rows.map((r) => {
                const tone = RULE_TYPE_TONE[r.type];
                return (
                  <tr key={`${r.engineId}-${r.id}`} className="hover:bg-icm-bg/40">
                    <td className="px-4 py-2.5 text-icm-text">
                      {r.description}
                    </td>
                    <td className="px-4 py-2.5 text-icm-text-dim truncate">
                      {r.engineName}
                    </td>
                    <td className="px-4 py-2.5 text-icm-text-dim truncate">
                      {r.serviceName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-geist font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10.5px] text-icm-text-faint">
                      {r.citation}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-[13px] text-icm-text-dim font-geist"
                  >
                    No rules match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ICMShell>
  );
};

export default RuleLibrary;
