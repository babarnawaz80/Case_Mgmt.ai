import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { BookOpen, Bot, ArrowRight } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { engineSummary } from "@/data/guidelinesEngines";
import { AdminOnly } from "@/components/platform/AdminOnly";

const PlatformHub = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const sum = engineSummary();

  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="AI Agent" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "AI Agent" },
          ]}
        />

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              AI Agent
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist max-w-[640px]">
              Build guideline engines and manage the compliance agents that
              apply them across your caseload.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
            ADMIN AREA
          </span>
        </div>

        {/* Two large cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlatformCard
            icon={BookOpen}
            title="Guidelines Engines"
            description="Convert state guidelines into structured compliance rule sets. Upload state PDFs and AI builds the engine."
            stat={`${sum.published} published · ${sum.draft} draft · ${sum.linkedAgents} agents linked`}
            onClick={() => navigate("/platform/guidelines-engines")}
            tone="accent"
            size="large"
          />
          <PlatformCard
            icon={Bot}
            title="Compliance Agents"
            description="Runtime agents that apply guidelines to your caseload automatically. Monitor compliance across all individuals."
            stat={`5 active agents · 99 individuals · 94% avg compliance`}
            onClick={() => navigate("/lifeplan")}
            tone="green"
            size="large"
          />
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
  size,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stat?: string;
  onClick: () => void;
  tone: "accent" | "green";
  size: "large" | "small";
}) {
  const iconBg =
    tone === "accent"
      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
      : "bg-icm-green-soft text-icm-green ring-icm-green/20";
  const iconSize = size === "large" ? "w-12 h-12 rounded-xl" : "w-10 h-10 rounded-lg";
  const iconInner = size === "large" ? "w-6 h-6" : "w-5 h-5";
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-icm-border bg-icm-panel p-5 hover:border-icm-border-strong hover:shadow-elevated transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={`${iconSize} ring-1 flex items-center justify-center ${iconBg}`}>
          <Icon className={iconInner} />
        </div>
        <ArrowRight className="w-4 h-4 text-icm-text-faint group-hover:text-icm-text transition-colors" />
      </div>
      <h3 className={`font-manrope font-bold text-icm-text mt-3 ${size === "large" ? "text-[17px]" : "text-[14px]"}`}>
        {title}
      </h3>
      <p className="text-[12.5px] font-geist text-icm-text-dim mt-1 leading-relaxed">
        {description}
      </p>
      {stat && <p className="text-[11px] font-mono text-icm-text-faint mt-3">{stat}</p>}
    </button>
  );
}

export default PlatformHub;
