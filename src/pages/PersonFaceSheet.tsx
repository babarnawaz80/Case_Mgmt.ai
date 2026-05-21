import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { ChevronLeft, Printer, AlertTriangle } from "lucide-react";

import { getPerson, initials, riskAvatarClass } from "@/data/people";
import { getProfile } from "@/data/profiles";
import { cn } from "@/lib/utils";

const PersonFaceSheet = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const profile = person ? getProfile(person.id) : null;

  if (!person || !profile) {
    return (
      <ICMShell title="Face Sheet" showAIPanel={false}>
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

  const primaryDx = profile.diagnoses.find((d) => d.primary);
  const severeAllergy = profile.allergies.find(
    (a) => a.severity === "Severe" || a.severity === "Life-threatening",
  );
  const primaryEmergency = profile.emergencyContacts[0];
  const activeProgram = profile.enrollments.find((e) => e.status === "Active");

  return (
    <ICMShell title="Face Sheet" showAIPanel={false}>
      <div className="space-y-4 max-w-[900px] mx-auto">
        <Breadcrumbs
          backTo={`/people/${person.id}/profile`}
          backLabel="Profile"
          className="print:hidden"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${person.firstName} ${person.lastName}`, to: `/people/${person.id}/profile` },
            { label: "Face Sheet" },
          ]}
        />
        {/* Toolbar */}
        <div className="flex items-center justify-end print:hidden">

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Sheet */}
        <article className="rounded-xl border border-icm-border bg-icm-panel p-8 print:border-0 print:shadow-none">
          {/* Header */}
          <header className="flex items-start gap-5 pb-5 border-b border-icm-border">
            <div
              className={cn(
                "w-20 h-20 rounded-2xl border flex items-center justify-center font-mono text-[24px] font-bold shrink-0",
                riskAvatarClass(person.riskScore),
              )}
            >
              {initials(person)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-manrope font-extrabold text-[26px] text-icm-text tracking-tight leading-tight">
                {person.lastName}, {person.firstName}
                {person.nickname && (
                  <span className="font-medium text-icm-text-dim"> ({person.nickname})</span>
                )}
              </h1>
              <p className="text-[13px] text-icm-text-dim font-geist mt-1">
                {person.gender === "M" ? "Male" : "Female"} · {person.age}y · DOB{" "}
                <span className="font-mono">{person.dob}</span>
              </p>
              <p className="text-[12px] text-icm-text-dim font-geist mt-0.5">
                {profile.street ? `${profile.street}, ${profile.city}, ${profile.state} ${profile.zip}` : person.county}
              </p>
              <p className="text-[12px] text-icm-text-dim font-geist mt-0.5">
                County: <span className="text-icm-text">{person.county}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-icm-text-faint font-mono">Status</p>
              <p className="text-[14px] font-manrope font-bold text-icm-green">{person.status}</p>
              <p className="text-[10px] text-icm-text-faint font-mono mt-2">
                Generated {new Date().toLocaleDateString()}
              </p>
            </div>
          </header>

          {/* Severe allergy banner */}
          {severeAllergy && (
            <div className="mt-5 rounded-lg border-2 border-icm-red bg-icm-red-soft p-3 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-icm-red shrink-0" />
              <div>
                <p className="text-[12px] font-mono font-bold text-icm-red uppercase tracking-wider">
                  {severeAllergy.severity} Allergy
                </p>
                <p className="text-[14px] font-manrope font-bold text-icm-red">
                  {severeAllergy.allergen} — {severeAllergy.reaction}
                </p>
              </div>
            </div>
          )}

          {/* Two-column grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <Block title="Medicaid">
              <Row label="MA Number" value={profile.medicaidId ?? "—"} mono />
              <Row
                label="MA Status"
                value={
                  <span className="px-1.5 py-0.5 rounded bg-icm-green-soft text-icm-green text-[11px] font-mono font-bold">
                    Active
                  </span>
                }
              />
            </Block>

            <Block title="Primary Diagnosis">
              {primaryDx ? (
                <>
                  <Row label="Code" value={<span className="font-mono">{primaryDx.code}</span>} />
                  <Row label="Description" value={primaryDx.description} />
                </>
              ) : (
                <p className="text-[12px] text-icm-text-dim italic">No primary diagnosis on file.</p>
              )}
            </Block>

            <Block title="Allergies">
              {profile.allergies.length === 0 ? (
                <p className="text-[12px] text-icm-text-dim italic">None recorded.</p>
              ) : (
                <ul className="space-y-1.5 text-[12.5px] font-geist">
                  {profile.allergies.map((a) => (
                    <li key={a.allergen} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold",
                          a.severity === "Severe" || a.severity === "Life-threatening"
                            ? "bg-icm-red-soft text-icm-red"
                            : "bg-icm-amber-soft text-icm-amber",
                        )}
                      >
                        {a.severity}
                      </span>
                      <span className="text-icm-text font-semibold">{a.allergen}</span>
                      <span className="text-icm-text-dim">— {a.reaction}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            <Block title="Primary Emergency Contact">
              {primaryEmergency ? (
                <>
                  <Row label="Name" value={primaryEmergency.name} />
                  <Row label="Relationship" value={primaryEmergency.relationship} />
                  <Row label="Phone" value={primaryEmergency.primaryPhone} mono />
                </>
              ) : (
                <p className="text-[12px] text-icm-text-dim italic">No emergency contact on file.</p>
              )}
            </Block>

            <Block title="Case Manager">
              <Row label="Name" value={profile.caseManager} />
              {profile.supervisor && <Row label="Supervisor" value={profile.supervisor} />}
            </Block>

            <Block title="Current Program">
              {activeProgram ? (
                <>
                  <Row label="Program" value={activeProgram.program} />
                  <Row label="Service" value={activeProgram.serviceCategory} />
                  <Row label="Start" value={activeProgram.startDate} mono />
                </>
              ) : (
                <p className="text-[12px] text-icm-text-dim italic">No active program.</p>
              )}
            </Block>
          </div>

          {/* Special Instructions */}
          {person.specialInstructions && (
            <div className="mt-6 pt-5 border-t border-icm-border">
              <p className="text-[10px] uppercase tracking-wider text-icm-text-faint font-mono mb-1.5">
                Special Instructions
              </p>
              <p className="text-[13px] text-icm-text font-geist">{person.specialInstructions}</p>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-6 pt-4 border-t border-icm-border flex items-center justify-between text-[10px] font-mono text-icm-text-faint">
            <span>CaseManagement.ai · Face Sheet</span>
            <span>ID #{person.id}</span>
          </footer>
        </article>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          aside, header, button, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </ICMShell>
  );
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-icm-text-faint font-mono mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 text-[12.5px] font-geist">
      <span className="text-icm-text-faint w-28 shrink-0">{label}</span>
      <span className={cn("text-icm-text", mono && "font-mono")}>{value}</span>
    </div>
  );
}

export default PersonFaceSheet;
