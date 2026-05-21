import { useParams, useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson } from "@/data/people";
import { getProfile } from "@/data/profiles";
import { MonitorsBaselines } from "@/components/profile/MonitorsBaselines";

const PersonMonitorsBaselines = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const profile = person ? getProfile(person.id) : null;

  if (!person || !profile) {
    return (
      <ICMShell title="Monitors & Baselines" showAIPanel={false}>
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
    <ICMShell title="Monitors & Baselines" rightPanel={<PersonAIPanel person={person} />}>
      <div className="space-y-4">
        <Breadcrumbs
          backTo={`/people/${person.id}/echart`}
          backLabel="eChart"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${person.firstName} ${person.lastName}`, to: `/people/${person.id}/echart` },
            { label: "Monitors & Baselines" },
          ]}
        />
        <MonitorsBaselines profile={profile} />
      </div>
    </ICMShell>
  );
};

export default PersonMonitorsBaselines;
