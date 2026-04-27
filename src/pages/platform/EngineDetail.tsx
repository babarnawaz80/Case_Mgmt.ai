import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Bot,
  Plus,
  History,
  Layers,
  Lock,
} from "lucide-react";
import {
  getEngine,
  totalHardStops,
  totalWarnings,
  RULE_TYPE_TONE,
  type GuidelinesEngine,
  type ServiceDefinition,
  type Rule,
} from "@/data/guidelinesEngines";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";

type Tab = "overview" | "services" | "agents" | "versions" | "audit";

const EngineDetail = () => {
  const navigate = useNavigate();
  const { engineId } = useParams<{ engineId: string }>();
  const { isAdmin } = useRole();
  const [tab, setTab] = useState<Tab>("overview");

  if (!isAdmin) return <AdminOnly />;

  const engine = getEngine(engineId ?? "");
  if (!engine) {
    return (
      <ICMShell title="Engine" showAIPanel={false}>
        <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
          <p className="text-[14px] text-icm-text-dim font-geist">
            Engine not found.
          </p>
          <button
            onClick={() => navigate("/platform/guidelines-engines")}
            className="mt-4 text-[12px] font-geist font-semibold text-icm-accent hover:underline"
          >
            ← Back to Guidelines Engines
          </button>
        </div>
      </ICMShell>
    );
  }

  const hs = totalHardStops(engine);
  const wn = totalWarnings(engine);
  const statusCls =
    engine.status === "Published"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : engine.status === "Draft"
      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
      : "bg-icm-bg text-icm-text-dim ring-icm-border";

  return (
    <ICMShell title={engine.name} showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => navigate("/platform")}
            className="hover:text-icm-text inline-flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            Platform
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <button
            onClick={() => navigate("/platform/guidelines-engines")}
            className="hover:text-icm-text"
          >
            Guidelines Engines
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">{engine.name}</span>
        </div>

        <button
          onClick={() => navigate("/platform/guidelines-engines")}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Guidelines Engines
        </button>

        {/* Header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl ring-1 flex items-center justify-center shrink-0 ${
                  engine.borderTone === "green"
                    ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                    : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-manrope font-extrabold text-[22px] text-icm-text leading-tight tracking-tight">
                    {engine.name}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${statusCls}`}
                  >
                    {engine.status.toUpperCase()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-icm-bg border border-icm-border text-icm-text-dim">
                    {engine.version}
                  </span>
                </div>
                <p className="text-[12px] font-geist text-icm-text-dim mt-1">
                  {engine.state} · {engine.program} · Effective{" "}
                  {engine.effectiveDate}
                </p>
                <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5 inline-flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  {engine.linkedAgents.length} agents linked
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New version
              </button>
              <button
                onClick={() => setTab("versions")}
                className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                View history
              </button>
              <button
                onClick={() => navigate("/lifeplan/agent/new")}
                className="h-9 px-3.5 rounded-xl bg-icm-accent text-white text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
              >
                Create agent
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-icm-border flex items-center gap-1">
          {(
            [
              ["overview", "Overview"],
              ["services", "Services & Rules"],
              ["agents", "Agents"],
              ["versions", "Version History"],
              ["audit", "Audit Log"],
            ] as Array<[Tab, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative px-3 py-2 text-[12.5px] font-geist font-medium transition-colors ${
                tab === k
                  ? "text-icm-text"
                  : "text-icm-text-dim hover:text-icm-text"
              }`}
            >
              {label}
              {tab === k && (
                <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-icm-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <Overview engine={engine} hs={hs} wn={wn} navigate={navigate} />
        )}
        {tab === "services" && <ServicesTab engine={engine} />}
        {tab === "agents" && <AgentsTab engine={engine} navigate={navigate} />}
        {tab === "versions" && <VersionsTab engine={engine} />}
        {tab === "audit" && <AuditTab engine={engine} />}
      </div>
    </ICMShell>
  );
};

function Overview({
  engine,
  hs,
  wn,
  navigate,
}: {
  engine: GuidelinesEngine;
  hs: number;
  wn: number;
  navigate: (p: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Services" value={engine.services.length} tone="accent" />
        <StatCard label="Hard Stops" value={hs} tone="red" />
        <StatCard label="Warnings" value={wn} tone="amber" />
        <StatCard
          label="Agents"
          value={engine.linkedAgents.length}
          tone="green"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="text-[13px] font-geist font-semibold text-icm-text mb-3">
            Recent activity
          </h3>
          <ul className="space-y-2">
            {engine.audit.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-icm-accent mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-geist text-icm-text">
                    <span className="font-semibold">{a.user}</span> · {a.action}
                  </p>
                  {a.details && (
                    <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">
                      {a.details}
                    </p>
                  )}
                  <p className="text-[10.5px] font-mono text-icm-text-faint mt-0.5">
                    {a.timestamp}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="text-[13px] font-geist font-semibold text-icm-text mb-3">
            Linked agents
          </h3>
          {engine.linkedAgents.length === 0 ? (
            <p className="text-[12px] font-geist text-icm-text-dim">
              No agents are using this engine yet.
            </p>
          ) : (
            <ul className="divide-y divide-icm-border">
              {engine.linkedAgents.map((a) => (
                <li
                  key={a.id}
                  className="py-2 flex items-center gap-3 cursor-pointer hover:bg-icm-bg/40 -mx-2 px-2 rounded"
                  onClick={() => navigate(`/lifeplan/agent/${a.id}`)}
                >
                  <div className="w-8 h-8 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-geist font-semibold text-icm-text truncate">
                      {a.name}
                    </p>
                    <p className="text-[10.5px] font-geist text-icm-text-dim">
                      {a.type} · last run {a.lastRun ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${
                      a.status === "Active"
                        ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                        : a.status === "Paused"
                        ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                        : "bg-icm-bg text-icm-text-dim ring-icm-border"
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ServicesTab({ engine }: { engine: GuidelinesEngine }) {
  const [query, setQuery] = useState("");
  const filtered = engine.services.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const isPublished = engine.status === "Published";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services..."
          className="flex-1 h-9 px-3 rounded-xl bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
        />
        {isPublished && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-icm-bg border border-icm-border text-[11px] font-geist text-icm-text-dim">
            <Lock className="w-3 h-3" />
            Frozen
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-12 text-center">
          <p className="text-[13px] text-icm-text-dim font-geist">
            {engine.services.length === 0
              ? "No services have been extracted yet. Upload the guideline PDF to begin."
              : "No services match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              published={isPublished}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  published,
}: {
  service: ServiceDefinition;
  published: boolean;
}) {
  const [open, setOpen] = useState(false);
  const allHs = countByType(service, "Hard Stop");
  const allWn = countByType(service, "Warning");
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-icm-bg/50 text-left"
      >
        <ChevronDown
          className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-geist font-semibold text-icm-text truncate">
            {service.name}
          </p>
          <p className="text-[11px] font-geist text-icm-text-dim">
            {service.category} · {service.billingUnit}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono shrink-0">
          <span className="text-icm-red">{allHs} HS</span>
          <span className="text-icm-amber">{allWn} W</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-icm-border p-4 space-y-4">
          <RuleGroup
            title="Eligibility Rules"
            rules={service.eligibilityRules}
            published={published}
          />
          <RuleGroup
            title="Authorization Requirements"
            rules={service.authorizationRules}
            published={published}
          />
          <RuleGroup
            title="PCP Requirements"
            rules={service.pcpRequirements}
            published={published}
          />
          <RuleGroup
            title="Documentation Requirements"
            rules={service.documentationRequirements}
            published={published}
          />
          <RuleGroup title="Limits" rules={service.limits} published={published} />
          <RuleGroup
            title="Conflicts"
            rules={service.conflicts}
            published={published}
          />
        </div>
      )}
    </div>
  );
}

function RuleGroup({
  title,
  rules,
  published,
}: {
  title: string;
  rules: Rule[];
  published: boolean;
}) {
  if (rules.length === 0) return null;
  return (
    <div>
      <h4 className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint mb-2">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {rules.map((r) => {
          const tone = RULE_TYPE_TONE[r.type];
          return (
            <li
              key={r.id}
              className="rounded-lg border border-icm-border bg-icm-bg p-3"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-geist font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring} shrink-0`}
                >
                  {r.type}
                </span>
                <p className="text-[12px] text-icm-text font-geist leading-snug flex-1">
                  {r.description}
                </p>
                <button
                  disabled={published}
                  title={
                    published
                      ? "Engine is published and frozen. Create a new version to modify rules."
                      : "Edit rule"
                  }
                  className="text-[10.5px] font-geist text-icm-text-dim hover:text-icm-text disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Edit
                </button>
              </div>
              <p className="text-[10.5px] font-mono text-icm-text-faint mt-1.5 ml-1">
                {r.citation}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AgentsTab({
  engine,
  navigate,
}: {
  engine: GuidelinesEngine;
  navigate: (p: string) => void;
}) {
  return (
    <div className="space-y-3">
      {engine.linkedAgents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-12 text-center">
          <p className="text-[13px] text-icm-text-dim font-geist">
            No agents are using this engine yet.
          </p>
        </div>
      ) : (
        engine.linkedAgents.map((a) => (
          <button
            key={a.id}
            onClick={() => navigate(`/lifeplan/agent/${a.id}`)}
            className="w-full text-left rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 hover:border-icm-border-strong hover:shadow-elevated transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-geist font-semibold text-icm-text truncate">
                {a.name}
              </p>
              <p className="text-[11px] font-geist text-icm-text-dim">
                {a.type} · last run {a.lastRun ?? "—"}
              </p>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${
                a.status === "Active"
                  ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                  : a.status === "Paused"
                  ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                  : "bg-icm-bg text-icm-text-dim ring-icm-border"
              }`}
            >
              {a.status}
            </span>
          </button>
        ))
      )}
      <button
        onClick={() => navigate("/lifeplan/agent/new")}
        className="w-full h-10 rounded-xl border border-dashed border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        Create new agent using this engine
      </button>
    </div>
  );
}

function VersionsTab({ engine }: { engine: GuidelinesEngine }) {
  return (
    <div className="space-y-3">
      {engine.versions.map((v, i) => {
        const isCurrent = i === 0 && v.status === "Published";
        const cls =
          v.status === "Published"
            ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
            : v.status === "Draft"
            ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
            : "bg-icm-bg text-icm-text-dim ring-icm-border";
        return (
          <div
            key={v.version}
            className="rounded-xl border border-icm-border bg-icm-panel p-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[14px] text-icm-text">
                  {v.version}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${cls}`}
                >
                  {v.status.toUpperCase()}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-geist font-semibold text-icm-accent">
                    CURRENT
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-icm-text-dim">
                {v.publishedOn ?? "—"}
              </span>
            </div>
            {v.publishedBy && (
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
                Published by {v.publishedBy}
              </p>
            )}
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
              {v.servicesCount} services · {v.hardStopsCount} hard stops ·{" "}
              {v.warningsCount} warnings
            </p>
            {v.changeSummary && (
              <p className="text-[12px] font-geist text-icm-text mt-2 italic">
                {v.changeSummary}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong">
                View
              </button>
              <button className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong">
                Create new version from {v.version}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditTab({ engine }: { engine: GuidelinesEngine }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <table className="w-full text-[12px] font-geist">
        <thead className="bg-icm-bg">
          <tr className="text-left text-icm-text-faint">
            <th className="px-4 py-2">Timestamp</th>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-icm-border">
          {engine.audit.map((a, i) => (
            <tr key={i}>
              <td className="px-4 py-2 font-mono text-[11px] text-icm-text-dim">
                {a.timestamp}
              </td>
              <td className="px-4 py-2 text-icm-text">{a.user}</td>
              <td className="px-4 py-2 text-icm-text font-medium">
                {a.action}
              </td>
              <td className="px-4 py-2 text-icm-text-dim">
                {a.details ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "red" | "amber" | "green";
}) {
  const cls =
    tone === "accent"
      ? "text-icm-accent"
      : tone === "red"
      ? "text-icm-red"
      : tone === "amber"
      ? "text-icm-amber"
      : "text-icm-green";
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <p className={`font-mono font-bold text-[24px] leading-tight ${cls}`}>
        {value}
      </p>
      <p className="text-[10.5px] uppercase tracking-wide text-icm-text-faint font-geist mt-1">
        {label}
      </p>
    </div>
  );
}

function countByType(s: ServiceDefinition, type: Rule["type"]): number {
  return [
    ...s.eligibilityRules,
    ...s.authorizationRules,
    ...s.pcpRequirements,
    ...s.documentationRequirements,
    ...s.limits,
    ...s.conflicts,
  ].filter((r) => r.type === type).length;
}

export default EngineDetail;
