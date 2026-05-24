import { useParams, useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Loader2 } from "lucide-react";
import { useIndividual } from "@/hooks/useIndividuals";
import { getProfile } from "@/data/profiles";
import { MonitorsBaselines } from "@/components/profile/MonitorsBaselines";

const PersonMonitorsBaselines = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const profile = individual ? getProfile(individual.id) : null;

  if (loading) {
    return (
      <ICMShell title="Monitors &amp; Baselines" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual || !profile) {
    return (
      <ICMShell title="Monitors &amp; Baselines" showAIPanel={false}>
        <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
          <p className="text-[14px] text-icm-text-dim font-geist">Person not found.</p>
          <button
            onClick={() => navigate("/people")}
            className="mt-4 text-[12px] font-geist font-semibold text-icm-accent hover:underline"
          >
            ← Back to People
          </button>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Monitors &amp; Baselines" showAIPanel={false}>
      <div className="space-y-4">
        <Breadcrumbs
          backTo={`/people/${individual.id}/echart`}
          backLabel="eChart"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${individual.first_name} ${individual.last_name}`, to: `/people/${individual.id}/echart` },
            { label: "Monitors & Baselines" },
          ]}
        />
        <MonitorsBaselines profile={profile} />
      </div>
    </ICMShell>
  );
};

export default PersonMonitorsBaselines;
