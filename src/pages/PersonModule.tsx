import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { ChevronLeft, Sparkles, Loader2 } from "lucide-react";
import { useIndividual } from "@/hooks/useIndividuals";

// Pretty-print "monitoring-form" -> "Monitoring Form"
function prettySlug(slug: string): string {
  return slug
    .split("-")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

const PersonModule = () => {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const moduleName = prettySlug(slug ?? "module");

  if (loading) {
    return (
      <ICMShell title={moduleName} showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title={moduleName} showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  return (
    <ICMShell title={moduleName} showAIPanel={false}>
      <div className="space-y-5">
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {individual.last_name}, {individual.first_name} · eChart
        </button>

        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            {moduleName}
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            For {individual.last_name}, {individual.first_name} · ID #{individual.id.slice(0, 8)}
          </p>
        </div>

        {/* AI-first empty state */}
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel p-10 text-center">
          <div className="w-12 h-12 rounded-2xl ai-gradient mx-auto flex items-center justify-center shadow-elevated">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-manrope font-bold text-[15px] text-icm-text mt-4 tracking-tight">
            No records yet
          </h2>
          <p className="text-[12.5px] text-icm-text-dim font-geist mt-2 max-w-md mx-auto leading-relaxed">
            Want me to start a draft based on what I know about{" "}
            <span className="font-semibold text-icm-text">{individual.first_name}</span>?
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90">
              <Sparkles className="w-3.5 h-3.5" /> Draft with AI
            </button>
            <button className="h-9 px-4 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong">
              Start blank
            </button>
          </div>
          <p className="text-[10.5px] text-icm-text-faint font-geist mt-6">
            Module coming soon · Connects to iCM {moduleName} via API Gateway
          </p>
        </div>
      </div>
    </ICMShell>
  );
};

export default PersonModule;
