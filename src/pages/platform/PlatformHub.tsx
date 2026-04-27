import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { BookOpen, Bot, ArrowRight, Layers, Library, ClipboardCheck } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { engineSummary } from "@/data/guidelinesEngines";
import { AdminOnly } from "@/components/platform/AdminOnly";

const PlatformHub = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const sum = engineSummary();

  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="Agents Platform" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Platform
        </div>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Agents Platform
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist max-w-[640px]">
              Build Guidelines Engines from state guideline documents. Create
              and manage Compliance Agents that run against individual data.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
            ADMIN AREA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlatformCard
            icon={BookOpen}
            title="Guidelines Engines"
            description="Convert state guidelines into structured, machine-readable rule sets that drive every compliance check."
            stat={`${sum.total} engines · ${sum.published} published · ${sum.draft} draft`}
            onClick={() => navigate("/platform/guidelines-engines")}
            tone="accent"
          />
          <PlatformCard
            icon={Bot}
            title="Compliance Agents"
            description="Runtime agents that execute published Guidelines Engines against real individual data."
            stat={`${sum.linkedAgents} agents linked to engines`}
            onClick={() => navigate("/lifeplan")}
            tone="green"
          />
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
            <Library className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-geist font-semibold text-icm-text">
              Rule Library
            </p>
            <p className="text-[11.5px] text-icm-text-dim font-geist">
              Cross-engine searchable index of every rule and citation in the
              system.
            </p>
          </div>
          <button
            onClick={() => navigate("/platform/rule-library")}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
          >
            Open library
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-icm-accent-soft text-icm-accent flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-geist font-semibold text-icm-text">
              Assessment Builder
            </p>
            <p className="text-[11.5px] text-icm-text-dim font-geist">
              Configure assessment templates with sections, scoring, and LOC thresholds.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/assessment-builder")}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
          >
            Open builder
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </ICMShell>
  );
};

function PlatformCard({
  icon: Icon,
  title,
  description,
  stat,
  onClick,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stat: string;
  onClick: () => void;
  tone: "accent" | "green";
}) {
  const iconBg =
    tone === "accent"
      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
      : "bg-icm-green-soft text-icm-green ring-icm-green/20";
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-icm-border bg-icm-panel p-5 hover:border-icm-border-strong hover:shadow-elevated transition-all group"
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center ${iconBg}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-4 h-4 text-icm-text-faint group-hover:text-icm-text transition-colors" />
      </div>
      <h3 className="font-manrope font-bold text-[16px] text-icm-text mt-3">
        {title}
      </h3>
      <p className="text-[12.5px] font-geist text-icm-text-dim mt-1 leading-relaxed">
        {description}
      </p>
      <p className="text-[11px] font-mono text-icm-text-faint mt-3">{stat}</p>
    </button>
  );
}

export default PlatformHub;
