import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  Printer,
  AlertTriangle,
  Phone,
  MapPin,
  ShieldCheck,
  Users,
  Building2,
  FileText,
  Activity,
  HeartPulse,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { useIndividual, calcAge, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useProgressNotes } from "@/hooks/useProgressNotes";
import { cn } from "@/lib/utils";

const PersonFaceSheet = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { notes } = useProgressNotes(id);

  // Hooks always called first — no early returns before this
  const age = individual ? calcAge(individual.dob) : null;
  const riskClass = individual ? riskAvatarClass(individual.risk_score) : "";
  const personInitials = individual ? initials(individual) : "";

  if (loading) {
    return (
      <ICMShell title="Face Sheet" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading face sheet…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Face Sheet" showAIPanel={false}>
        <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
          <p className="text-[14px] text-icm-text-dim font-geist">Person not found.</p>
          <button onClick={() => navigate("/people")} className="mt-4 text-[12px] font-geist font-semibold text-icm-accent hover:underline">
            ← Back to People
          </button>
        </div>
      </ICMShell>
    );
  }

  const lastNote = notes[0] ?? null;
  const highRisk = individual.risk_score != null && individual.risk_score >= 60;

  /** Returns a display name, or masks raw UIDs */
  const displayName = (name?: string, uid?: string): string => {
    const val = name ?? uid;
    if (!val) return "—";
    // Firebase UIDs are 28 char alphanumeric — don't display raw
    if (/^[A-Za-z0-9]{20,}$/.test(val) && !val.includes(" ")) return "Assigned";
    return val;
  };

  return (
    <ICMShell title="Face Sheet" showAIPanel={false}>
      <div className="space-y-4 max-w-[1000px] mx-auto">
        <Breadcrumbs
          backTo={`/people/${individual.id}/echart`}
          backLabel="eChart"
          className="print:hidden"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${individual.first_name} ${individual.last_name}`, to: `/people/${individual.id}/echart` },
            { label: "Face Sheet" },
          ]}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between print:hidden">
          <p className="text-[11px] font-mono uppercase tracking-wider text-icm-text-faint">
            Comprehensive snapshot · Pulled from individual record
          </p>
          <button
            onClick={() => window.print()}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>

        <article className="rounded-xl border border-icm-border bg-icm-panel p-7 print:border-0 print:shadow-none print:p-0">
          {/* Header */}
          <header className="flex items-start gap-5 pb-5 border-b border-icm-border">
            <div
              className={`rounded-2xl border-2 flex items-center justify-center font-mono text-[24px] font-bold ${riskClass} shrink-0`}
              style={{ width: 88, height: 88 }}
            >
              {personInitials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-manrope font-extrabold text-[24px] text-icm-text tracking-tight leading-tight">
                {individual.last_name}, {individual.first_name}
                {individual.preferred_name && (
                  <span className="font-medium text-icm-text-dim"> &ldquo;{individual.preferred_name}&rdquo;</span>
                )}
              </h1>
              <p className="text-[12.5px] text-icm-text-dim font-geist mt-1">
                {individual.gender ?? "—"} · {age !== null ? `${age}y` : "—"} · DOB{" "}
                <span className="font-mono text-icm-text">{individual.dob ?? "—"}</span>
              </p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11.5px] font-geist text-icm-text-dim">
                <KV label="MA #" value={individual.medicaid_id ?? "—"} />
                <KV label="County" value={individual.county ?? "—"} />
                <KV label="Program" value={individual.program ?? "—"} />
                <KV label="Level of Care" value={individual.level_of_care ?? "—"} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={cn(
                  "inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider",
                  individual.enrollment_status === "active" && "bg-icm-green-soft text-icm-green",
                  individual.enrollment_status === "pending" && "bg-icm-amber-soft text-icm-amber",
                  individual.enrollment_status === "discharged" && "bg-icm-bg text-icm-text-dim",
                )}
              >
                {individual.enrollment_status}
              </span>
              <p className="text-[10px] text-icm-text-faint font-mono mt-2">
                Generated {new Date().toLocaleDateString()}{" "}
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[10px] text-icm-text-faint font-mono">ID #{individual.id.slice(0, 8)}</p>
            </div>
          </header>

          {/* High Risk Alert */}
          {highRisk && (
            <div className="mt-4">
              <div className="rounded-lg border-2 border-icm-red bg-icm-red-soft p-2.5 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-icm-red shrink-0" />
                <div className="flex-1">
                  <span className="text-[10.5px] font-mono font-bold text-icm-red uppercase tracking-wider mr-2">
                    High Risk
                  </span>
                  <span className="text-[13px] font-manrope font-bold text-icm-red">
                    Risk Score {individual.risk_score} — Requires elevated monitoring
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* At-a-glance stats */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Stat
              label="Risk Score"
              value={individual.risk_score ?? "—"}
              accent={
                (individual.risk_score ?? 0) >= 60
                  ? "red"
                  : (individual.risk_score ?? 0) >= 35
                  ? "amber"
                  : "green"
              }
            />
            <Stat label="Last Visit" value={individual.last_visit_date ?? "—"} />
            <Stat label="Open Tasks" value={individual.open_tasks ?? 0} />
            <Stat label="Progress Notes" value={notes.length} />
          </div>

          {/* Section: Demographics & Contact */}
          <Section icon={<Users className="w-3.5 h-3.5" />} title="Demographics & Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Preferred Name" value={individual.preferred_name ?? "—"} />
              <Row label="Gender" value={individual.gender ?? "—"} />
              <Row label="Date of Birth" value={individual.dob ?? "—"} mono />
              <Row label="Age" value={age !== null ? `${age} years` : "—"} />
              <Row label="County" value={individual.county ?? "—"} />
              <Row label="Program" value={individual.program ?? "—"} />
              <Row label="Level of Care" value={individual.level_of_care ?? "—"} />
              <Row label="Enrollment Status" value={individual.enrollment_status ?? "—"} />
            </div>
            <div className="mt-3 pt-3 border-t border-icm-border-soft grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row
                label="Address"
                value={
                  individual.address ? (
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 mt-0.5 text-icm-text-faint" />
                      {individual.address}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Primary Phone"
                value={
                  individual.phone ? (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <Phone className="w-3 h-3 text-icm-text-faint" />
                      {individual.phone}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Medicaid ID" value={individual.medicaid_id ?? "—"} mono />
            </div>
          </Section>

          {/* Section: Insurance */}
          <Section icon={<ShieldCheck className="w-3.5 h-3.5" />} title="Insurance Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Medicaid ID" value={individual.medicaid_id ?? "—"} mono />
              <Row label="Level of Care" value={individual.level_of_care ?? "—"} />
            </div>
            <Empty>Full insurance details (policy #, group #, effective dates) captured via profile edit.</Empty>
          </Section>

          {/* Section: Medical */}
          <Section icon={<HeartPulse className="w-3.5 h-3.5" />} title="Medical Information">
            <SubHeading>Primary Diagnosis</SubHeading>
            {individual.diagnosis ? (
              <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-2.5 mb-2">
                <span className="text-[12.5px] text-icm-text">{individual.diagnosis}</span>
              </div>
            ) : (
              <Empty>No diagnosis on file.</Empty>
            )}
            <Empty>Medications, allergies, and vital baselines captured via clinical profile.</Empty>
          </Section>

          {/* Section: Care Team */}
          <Section icon={<Building2 className="w-3.5 h-3.5" />} title="Care Team & Administrative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Case Manager" value={displayName(individual.assigned_case_manager_name, individual.assigned_case_manager)} />
              <Row label="Supervisor" value={displayName(individual.assigned_supervisor_name, individual.assigned_supervisor)} />
              <Row label="Program" value={individual.program ?? "—"} />
              <Row label="Enrollment Status" value={individual.enrollment_status ?? "—"} />
            </div>
          </Section>

          {/* Section: Recent Activity */}
          <Section icon={<Activity className="w-3.5 h-3.5" />} title="Recent Activity">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <Stat label="Progress Notes" value={notes.length} />
              <Stat label="Open Tasks" value={individual.open_tasks ?? 0} />
              <Stat label="Open Incidents" value={individual.open_incidents ?? 0} />
              <Stat
                label="Compliance"
                value={
                  individual.monitoring_compliance_pct
                    ? `${individual.monitoring_compliance_pct}%`
                    : "—"
                }
              />
            </div>
            {lastNote ? (
              <div className="rounded-lg border border-icm-border bg-icm-bg/30 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-icm-accent" />
                  <p className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-mono font-semibold">
                    Last Progress Note
                  </p>
                </div>
                <p className="text-[12.5px] font-semibold text-icm-text">
                  {lastNote.progressDate} · {lastNote.activityType}
                </p>
                <p className="text-[11.5px] text-icm-text-dim">
                  {lastNote.contactType} · {lastNote.status}
                </p>
                {lastNote.purposeOfActivity && (
                  <p className="text-[11.5px] text-icm-text-dim mt-1 line-clamp-2">
                    {lastNote.purposeOfActivity}
                  </p>
                )}
              </div>
            ) : (
              <Empty>No progress notes on file.</Empty>
            )}
          </Section>

          {/* Section: Documents placeholder */}
          <Section icon={<FileText className="w-3.5 h-3.5" />} title="Managed Documents">
            <Empty>Documents captured in Managed Documents module.</Empty>
          </Section>

          {/* Footer */}
          <footer className="mt-6 pt-4 border-t border-icm-border flex items-center justify-between text-[10px] font-mono text-icm-text-faint">
            <span>CaseManagement.ai · Comprehensive Face Sheet</span>
            <span>Confidential — for authorized use only</span>
            <span>ID #{individual.id.slice(0, 8)}</span>
          </footer>
        </article>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          aside, .print\\:hidden { display: none !important; }
          article { page-break-inside: auto; }
        }
      `}</style>
    </ICMShell>
  );
};

// ---- Reusable building blocks ----

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-icm-accent">{icon}</span>
        <h2 className="text-[11px] uppercase tracking-wider text-icm-text font-mono font-bold">{title}</h2>
        <div className="flex-1 h-px bg-icm-border ml-1" />
      </div>
      <div>{children}</div>
    </section>
  );
}

function SubHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10.5px] uppercase tracking-wider text-icm-text-faint font-mono font-semibold mb-1.5", className)}>
      {children}
    </p>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 text-[12.5px] font-geist">
      <span className="text-icm-text-faint w-32 shrink-0">{label}</span>
      <span className={cn("text-icm-text flex-1 min-w-0", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function KV({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-icm-text-faint font-mono">{label}</p>
      <p className="text-[12px] text-icm-text font-geist truncate">{value ?? "—"}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "red" | "amber" | "green";
}) {
  const accentClass =
    accent === "red"
      ? "text-icm-red"
      : accent === "amber"
      ? "text-icm-amber"
      : accent === "green"
      ? "text-icm-green"
      : "text-icm-text";
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg/40 px-2.5 py-2">
      <p className="text-[9.5px] uppercase tracking-wider text-icm-text-faint font-mono">{label}</p>
      <p className={cn("text-[15px] font-manrope font-bold mt-0.5 truncate", accentClass)}>{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-icm-text-dim italic mt-1">{children}</p>;
}

export default PersonFaceSheet;
