import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  ChevronLeft,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Star,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  FileText,
  Upload,
  Search,
  X,
  Sparkle,
  ArrowRight,
  Phone as PhoneIcon,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { cn } from "@/lib/utils";
import { getPerson, initials, riskAvatarClass, riskScoreClass } from "@/data/people";
import {
  getProfile,
  tabCompleteness,
  overallCompleteness,
  type TabKey,
  type ProfileData,
} from "@/data/profiles";

const TABS: { key: TabKey; label: string }[] = [
  { key: "basic", label: "Basic Info" },
  { key: "medical", label: "Medical Info" },
  { key: "monitors", label: "Monitors & Baselines" },
  { key: "court", label: "Court Involvement" },
  { key: "program", label: "Program" },
  { key: "contacts", label: "Contacts" },
  { key: "documents", label: "Documents" },
  { key: "administrative", label: "Administrative" },
];

const PersonProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const person = getPerson(id ?? "");
  const profile = useMemo(() => (person ? getProfile(person.id) : null), [person]);

  const initialTab = (params.get("tab") as TabKey) ?? "basic";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [showSsn, setShowSsn] = useState(false);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const [echartOpen, setEchartOpen] = useState(false);

  if (!person || !profile) {
    return (
      <ICMShell title="Profile" showAIPanel={false}>
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

  const tabs = tabCompleteness(profile, person.firstName, person.lastName, person.dob);
  const overall = overallCompleteness(tabs);
  const tabMap = Object.fromEntries(tabs.map((t) => [t.tab, t]));

  function setTabAndUrl(t: TabKey) {
    setTab(t);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("tab", t);
      return next;
    });
  }

  return (
    <ICMShell title="Profile" rightPanel={<ProfileAIPanel pct={overall.pct} />}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${person.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People → {person.firstName} {person.lastName} → Profile →{" "}
          <span className="text-icm-text">{TABS.find((t) => t.key === tab)?.label}</span>
        </button>

        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-3 bg-icm-bg/95 backdrop-blur-sm">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center font-mono text-[18px] font-bold shrink-0 ${riskAvatarClass(person.riskScore)}`}
              >
                {initials(person)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight leading-tight">
                    {person.lastName}, {person.firstName}
                    {person.nickname && (
                      <span className="font-medium text-icm-text-dim"> ({person.nickname})</span>
                    )}
                  </h1>
                  {person.riskScore !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ring-1 ring-current/20 ${riskScoreClass(person.riskScore)}`}
                    >
                      RISK {person.riskScore}
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-mono text-icm-text-dim mt-1">
                  {person.gender} · {person.age}y · {person.dob} · {person.county} · ID #{person.id}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <InlineField label="Allergies" value={person.allergies ?? "None recorded"} />
                  <InlineField
                    label="Special Instructions"
                    value={person.specialInstructions ?? "—"}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap relative">
                <button className="h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 hover:brightness-95">
                  <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
                  {person.status}
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setEchartOpen((s) => !s)}
                    className="h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
                  >
                    eChart
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                  {echartOpen && (
                    <div className="absolute right-0 top-10 z-30 w-[200px] rounded-xl border border-icm-border bg-icm-panel shadow-elevated overflow-hidden">
                      <DropdownItem
                        label="View Profile"
                        onClick={() => {
                          setEchartOpen(false);
                        }}
                        active
                      />
                      <DropdownItem
                        label="Face Sheet"
                        onClick={() => navigate(`/people/${person.id}/facesheet`)}
                      />
                      <DropdownItem
                        label="Manage Programs"
                        onClick={() => {
                          setTabAndUrl("program");
                          setEchartOpen(false);
                        }}
                      />
                      <div className="border-t border-icm-border" />
                      <DropdownItem
                        label="Open eChart"
                        onClick={() => navigate(`/people/${person.id}/echart`)}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setTabAndUrl("program")}
                  className="h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
                >
                  Manage Programs
                  <Settings2 className="w-3 h-3 opacity-70" />
                </button>
              </div>
            </div>

            {/* Completeness ribbon */}
            {!briefDismissed && overall.pct < 100 && (
              <div className="mt-4 rounded-xl bg-icm-accent-soft border border-icm-accent/20 px-3.5 py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                      <span className="font-semibold">
                        {person.firstName}'s profile is {overall.pct}% complete.
                      </span>{" "}
                      <span className="text-icm-text-dim">
                        {overall.missing.length > 0 &&
                          `Missing: ${overall.missing.slice(0, 3).join(", ")}${overall.missing.length > 3 ? `, +${overall.missing.length - 3} more` : ""}.`}
                      </span>
                    </p>
                    <button
                      onClick={() => {
                        const firstIncomplete = tabs.find((t) => t.missing.length > 0);
                        if (firstIncomplete) setTabAndUrl(firstIncomplete.tab);
                      }}
                      className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline mt-0.5 flex items-center gap-1"
                    >
                      Complete profile <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setBriefDismissed(true)}
                  className="text-icm-text-faint hover:text-icm-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="mt-4 flex items-center gap-0.5 border-b border-icm-border overflow-x-auto -mb-3 -mx-1 px-1">
              {TABS.map((t) => {
                const tc = tabMap[t.key];
                const incomplete = tc && tc.missing.length > 0;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTabAndUrl(t.key)}
                    className={cn(
                      "px-3 py-2 text-[12.5px] font-geist border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap",
                      active
                        ? "border-icm-accent text-icm-text font-semibold"
                        : "border-transparent text-icm-text-dim hover:text-icm-text",
                    )}
                  >
                    {t.label}
                    {incomplete && <span className="w-1.5 h-1.5 rounded-full bg-icm-amber" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {tab === "basic" && (
          <BasicInfoTab person={person} profile={profile} showSsn={showSsn} setShowSsn={setShowSsn} />
        )}
        {tab === "medical" && <MedicalInfoTab profile={profile} />}
        {tab === "monitors" && <MonitorsTab profile={profile} />}
        {tab === "court" && <CourtTab profile={profile} />}
        {tab === "program" && <ProgramTab profile={profile} />}
        {tab === "contacts" && <ContactsTab profile={profile} />}
        {tab === "documents" && <DocumentsTab profile={profile} />}
        {tab === "administrative" && <AdminTab profile={profile} />}

        {/* Per-tab completeness footer */}
        {tabMap[tab] && (
          <CompletenessFooter
            tc={tabMap[tab]}
            onJump={(_label) => {
              /* placeholder — would scroll to first incomplete field */
            }}
          />
        )}
      </div>
    </ICMShell>
  );
};

// =============================================================
// TAB 1 — Basic Info
// =============================================================
function BasicInfoTab({
  person,
  profile,
  showSsn,
  setShowSsn,
}: {
  person: ReturnType<typeof getPerson> & {};
  profile: ProfileData;
  showSsn: boolean;
  setShowSsn: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <Section title="Personal Information">
        <KvGrid
          rows={[
            ["First Name", person!.firstName, true],
            ["Middle Name", profile.middleName ?? "—"],
            ["Last Name", person!.lastName, true],
            ["Preferred Name", profile.preferredName ?? "—"],
            ["Date of Birth", `${person!.dob}  ·  ${person!.age}y`, true],
            ["Gender", person!.gender === "M" ? "Male" : "Female"],
            ["Pronouns", profile.pronouns ?? "—"],
            ["Race / Ethnicity", profile.raceEthnicity?.join(", ") ?? "—"],
            ["Primary Language", profile.primaryLanguage],
            ["Secondary Language", profile.secondaryLanguage ?? "—"],
            ["Communication Needs", profile.communicationNeeds ?? "—"],
          ]}
        />
      </Section>

      <Section title="Address & Location">
        <KvGrid
          rows={[
            ["Street", profile.street ?? "—"],
            ["City", profile.city ?? "—"],
            ["State", profile.state ?? "—"],
            ["ZIP", profile.zip ?? "—"],
            ["County", person!.county, true],
            ["Living Situation", profile.livingSituation ?? "—"],
          ]}
        />
      </Section>

      <Section title="Identification">
        <KvGrid
          rows={[
            [
              "SSN",
              <span className="flex items-center gap-2" key="ssn">
                <span className="font-mono">{showSsn ? "123-45-6789" : profile.ssn ?? "XXX-XX-XXXX"}</span>
                <button
                  onClick={() => setShowSsn(!showSsn)}
                  className="text-icm-text-faint hover:text-icm-text"
                >
                  {showSsn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </span>,
            ],
            ["Medicaid ID", profile.medicaidId ?? "—"],
            ["Medicare ID", profile.medicareId ?? "—"],
            ["State ID", profile.stateId ?? "—"],
            ["LTSS ID", profile.ltssId ?? "—"],
            ["Date of Admission", person!.admittedOn, true],
            ["Referral Source", profile.referralSource ?? "—"],
          ]}
        />
      </Section>

      <Section title="Contact">
        <KvGrid
          rows={[
            ["Primary Phone", profile.primaryPhone ?? "—", true],
            ["Secondary Phone", profile.secondaryPhone ?? "—"],
            ["Email", profile.email ?? "—"],
            ["Preferred Contact", profile.preferredContact ?? "—"],
          ]}
        />
      </Section>
    </div>
  );
}

// =============================================================
// TAB 2 — Medical Info
// =============================================================
function MedicalInfoTab({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Diagnoses">
        <DataTable
          columns={["Code", "Description", "Type", "Added", "By"]}
          rows={profile.diagnoses.map((d) => [
            <span key="c" className="font-mono text-icm-text">{d.code}</span>,
            d.description,
            d.primary ? (
              <span className="px-1.5 py-0.5 rounded bg-icm-accent-soft text-icm-accent text-[10px] font-mono font-semibold">Primary</span>
            ) : (
              <span className="text-icm-text-dim text-[11px]">Secondary</span>
            ),
            d.addedOn,
            d.addedBy,
          ])}
          emptyText="No diagnoses recorded. Primary diagnosis is required for Care Plan."
          addLabel="Add diagnosis"
        />
      </Section>

      <Section title="Medications">
        <DataTable
          columns={["Name", "Dosage", "Frequency", "Prescriber", "Start", "Status"]}
          rows={profile.medications.map((m) => [
            <span key="n" className="font-semibold">{m.name}</span>,
            m.dosage,
            m.frequency,
            m.prescriber,
            m.startDate,
            <MedStatusBadge key="s" status={m.status} />,
          ])}
          emptyText="No medications recorded."
          addLabel="Add medication"
        />
        <p className="text-[11px] text-icm-text-faint mt-2 font-geist">
          Medication records here are reference only. Administration is managed in the eMAR module.
        </p>
      </Section>

      <Section title="Allergies">
        <DataTable
          columns={["Allergen", "Reaction", "Severity", "Identified"]}
          rows={profile.allergies.map((a) => [
            <span key="a" className="font-semibold">{a.allergen}</span>,
            a.reaction,
            <SeverityBadge key="s" severity={a.severity} />,
            a.identifiedOn,
          ])}
          emptyText="No allergies recorded."
          addLabel="Add allergy"
        />
      </Section>

      <Section title="Health Screenings">
        <div className="rounded-lg border border-icm-border bg-icm-bg p-3 space-y-2">
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="HRST / Risk Screening Score">
              <input
                defaultValue={profile.hrstScore ?? ""}
                className="modal-input w-24"
                placeholder="—"
              />
            </Field>
            <Field label="Score date">
              <input defaultValue={profile.hrstScoredOn ?? ""} className="modal-input w-32" />
            </Field>
            <Field label="Source">
              <select className="modal-input w-44" defaultValue={profile.hrstSource ?? "Manual entry"}>
                <option>Manual entry</option>
                <option>From Intellectability</option>
                <option>From HRST</option>
              </select>
            </Field>
          </div>
          {(profile.hrstScore ?? 0) >= 3 && (
            <div className="rounded-lg border border-icm-amber/30 bg-icm-amber-soft p-2.5 text-[11.5px] font-geist text-icm-text flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-icm-amber" />
              Score of {profile.hrstScore} requires nursing review per state guidelines. AI created a follow-up task.
            </div>
          )}
          <p className="text-[11px] italic text-icm-text-faint">
            Integration with Intellectability coming soon — scores will auto-populate from the linked assessment.
          </p>
        </div>
      </Section>

      <Section title="Healthcare Providers">
        <DataTable
          columns={["Provider", "Specialty", "Phone", "Last Visit", "Next Appt"]}
          rows={profile.providers.map((p) => [
            <span key="n" className="font-semibold">{p.name}</span>,
            p.specialty,
            <span key="p" className="font-mono text-[11px]">{p.phone}</span>,
            p.lastVisit ?? "—",
            p.nextAppointment ?? "—",
          ])}
          emptyText="No providers added."
          addLabel="Add provider"
        />
      </Section>

      <Section title="Insurance">
        <DataTable
          columns={["Type", "Provider", "Policy #", "Effective", "Expiration"]}
          rows={profile.insurance.map((i) => [
            <span
              key="t"
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono",
                i.type === "Medicaid"
                  ? "bg-icm-accent-soft text-icm-accent"
                  : "bg-icm-bg text-icm-text-dim",
              )}
            >
              {i.type}
            </span>,
            i.provider,
            <span key="p" className="font-mono text-[11px]">{i.policyNumber}</span>,
            i.effectiveDate,
            i.expirationDate ?? "—",
          ])}
          emptyText="No insurance on file."
          addLabel="Add insurance"
        />
      </Section>
    </div>
  );
}

// =============================================================
// TAB 3 — Monitors & Baselines
// =============================================================
function MonitorsTab({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Vital Sign Baselines">
        <DataTable
          columns={["Measurement", "Baseline", "Normal Range", "Last Measured", "Notes"]}
          rows={profile.vitalBaselines.map((v) => [
            <span key="m" className="font-semibold">{v.measurement}</span>,
            v.baseline,
            <span key="r" className="text-[11px] text-icm-text-dim">{v.normalRange}</span>,
            v.lastMeasured ?? "—",
            v.notes ?? "—",
          ])}
          emptyText="No baselines recorded."
          addLabel="Add measurement"
        />
      </Section>

      <Section title="Monitoring Instructions">
        <div className="space-y-3">
          <Field label="Health monitoring notes">
            <textarea
              defaultValue={profile.healthMonitoringNotes}
              placeholder="Special monitoring requirements, medical equipment, positioning needs, etc."
              className="modal-input min-h-[72px]"
            />
          </Field>
          <Field label="Behavioral monitoring notes">
            <textarea
              defaultValue={profile.behavioralMonitoringNotes}
              placeholder="Behavioral baselines, triggers, de-escalation strategies, etc."
              className="modal-input min-h-[72px]"
            />
          </Field>
          <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-2.5 text-[11.5px] font-geist text-icm-text flex items-start gap-2">
            <Sparkle className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
            <span>
              AI will surface monitoring content detected in ambient sessions or contact notes here as suggestions.
            </span>
          </div>
        </div>
      </Section>

      <Section title="Measurement History">
        <div className="rounded-lg border border-icm-border bg-icm-bg p-6 text-center">
          <p className="text-[12px] text-icm-text-dim font-geist">
            No measurement history yet. Recorded vitals will appear here as a chronological log with trend lines.
          </p>
        </div>
      </Section>
    </div>
  );
}

// =============================================================
// TAB 4 — Court Involvement
// =============================================================
function CourtTab({ profile }: { profile: ProfileData }) {
  const isGuardianship =
    profile.legalStatus === "Guardianship" || profile.legalStatus === "Power of Attorney";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Section title="Court Details">
          <KvGrid
            rows={[
              ["Court", profile.court ?? "—"],
              ["Attorney", profile.attorney ?? "—"],
              ["Last Court Date", profile.lastCourtDate ?? "—"],
              ["Next Court Date", profile.nextCourtDate ?? "—"],
              ["Next Report Date", profile.nextReportDate ?? "—"],
              ["Forensic Involvement", profile.forensicInvolvement ? "Yes" : "No"],
              ["Legal Status", profile.legalStatus ?? "None"],
            ]}
          />
          {isGuardianship && (
            <div className="mt-4 pt-4 border-t border-icm-border">
              <KvGrid
                rows={[
                  ["Guardian / POA Name", profile.guardianName ?? "—"],
                  ["Relationship", profile.guardianRelationship ?? "—"],
                  ["Phone", profile.guardianPhone ?? "—"],
                  ["Address", profile.guardianAddress ?? "—"],
                  ["Guardianship Type", profile.guardianshipType ?? "—"],
                ]}
              />
            </div>
          )}
        </Section>
      </div>
      <div className="space-y-4">
        <Section title="Providers">
          {profile.providers.length === 0 ? (
            <Empty text="Manage in Medical tab." />
          ) : (
            <ul className="space-y-1.5 text-[12px] font-geist">
              {profile.providers.map((p) => (
                <li key={p.name} className="flex items-center justify-between">
                  <span className="text-icm-text">{p.name}</span>
                  <span className="text-icm-text-dim text-[11px]">{p.specialty}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Pharmacies">
          <DataTable
            compact
            columns={["Pharmacy", "Phone"]}
            rows={profile.pharmacies.map((ph) => [
              <span key="n" className="flex items-center gap-1.5">
                {ph.primary && <Star className="w-3 h-3 text-icm-amber fill-icm-amber" />}
                {ph.name}
              </span>,
              <span key="p" className="font-mono text-[11px]">{ph.phone}</span>,
            ])}
            emptyText="No pharmacies."
            addLabel="Add pharmacy"
          />
        </Section>
      </div>
    </div>
  );
}

// =============================================================
// TAB 5 — Program
// =============================================================
function ProgramTab({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Current Programs">
        <DataTable
          columns={["Program", "Service Category", "Start", "Status", "Case Manager"]}
          rows={profile.enrollments.map((e) => [
            <span key="p" className="font-semibold">{e.program}</span>,
            e.serviceCategory,
            e.startDate,
            <ProgramStatusBadge key="s" status={e.status} />,
            e.caseManager,
          ])}
          emptyText="Not enrolled in any program yet."
          addLabel="Enroll in program"
        />
      </Section>

      <Section title="Service Categories">
        {profile.enrollments.map((e) => (
          <div
            key={e.serviceCategory}
            className="rounded-lg border border-icm-border bg-icm-bg p-3 mb-2 last:mb-0"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-icm-text font-geist">{e.serviceCategory}</p>
              <span className="text-[11px] font-mono text-icm-text-dim">3 of 4 visits this year</span>
            </div>
            <p className="text-[11.5px] text-icm-text-dim mt-0.5">
              Required visits: 4 per year (quarterly) · Required forms: Quarterly monitoring, Annual ISP
            </p>
            <div className="h-1.5 rounded-full bg-icm-border mt-2 overflow-hidden">
              <div className="h-full bg-icm-accent" style={{ width: "75%" }} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Funding Streams">
        <div className="space-y-2">
          {profile.funding.map((f) => {
            const pct = f.authorizedUnits === 0 ? 0 : (f.usedUnits / f.authorizedUnits) * 100;
            const tone = pct >= 90 ? "bg-icm-red" : pct >= 75 ? "bg-icm-amber" : "bg-icm-green";
            return (
              <div
                key={f.authorizationNumber}
                className="rounded-lg border border-icm-border bg-icm-bg p-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-icm-text">{f.type}</p>
                    <p className="text-[11px] font-mono text-icm-text-dim">
                      Auth #{f.authorizationNumber} · {f.period}
                    </p>
                  </div>
                  <span className="text-[11.5px] font-mono text-icm-text">
                    {f.usedUnits} / {f.authorizedUnits} units used
                  </span>
                </div>
                <div className="h-2 rounded-full bg-icm-border mt-2 overflow-hidden">
                  <div className={cn("h-full", tone)} style={{ width: `${pct}%` }} />
                </div>
                {pct >= 85 && (
                  <p className="text-[11.5px] text-icm-amber mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {Math.round(pct)}% used. Consider requesting an authorization increase.
                  </p>
                )}
              </div>
            );
          })}
          {profile.funding.length === 0 && <Empty text="No funding streams configured." />}
        </div>
      </Section>
    </div>
  );
}

// =============================================================
// TAB 6 — Contacts
// =============================================================
function ContactsTab({ profile }: { profile: ProfileData }) {
  const stale = profile.professionalContacts.filter((c) => c.lastContacted && monthsAgo(c.lastContacted) >= 3);
  return (
    <div className="space-y-4">
      <Section title="Emergency Contacts">
        <div className="space-y-2">
          {profile.emergencyContacts.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-icm-border bg-icm-bg p-3 flex items-center gap-3"
            >
              {c.priority === 1 && <Star className="w-4 h-4 text-icm-amber fill-icm-amber shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-icm-text">{c.name}</p>
                <p className="text-[11.5px] text-icm-text-dim">
                  {c.relationship} · <span className="font-mono">{c.primaryPhone}</span>
                  {c.notes && ` · ${c.notes}`}
                </p>
              </div>
              <button className="text-icm-text-faint hover:text-icm-text">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {profile.emergencyContacts.length === 0 && <Empty text="No emergency contacts." />}
          <button className="mt-1 h-8 px-3 rounded-lg border border-dashed border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add contact
          </button>
        </div>
      </Section>

      <Section title="Support Circle">
        <DataTable
          columns={["Name", "Role", "Phone", "Involvement"]}
          rows={profile.supportCircle.map((s) => [
            <span key="n" className="font-semibold">{s.name}</span>,
            s.role,
            <span key="p" className="font-mono text-[11px]">{s.phone ?? "—"}</span>,
            <span
              key="i"
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono",
                s.involvement === "High"
                  ? "bg-icm-green-soft text-icm-green"
                  : s.involvement === "Medium"
                    ? "bg-icm-amber-soft text-icm-amber"
                    : "bg-icm-bg text-icm-text-dim",
              )}
            >
              {s.involvement}
            </span>,
          ])}
          emptyText="No support circle members yet."
          addLabel="Add member"
        />
      </Section>

      <Section title="Professional Contacts">
        <DataTable
          columns={["Contact", "Organization", "Role", "Phone", "Last Contacted"]}
          rows={profile.professionalContacts.map((p) => [
            <span key="n" className="font-semibold">{p.name}</span>,
            p.organization,
            p.role,
            <span key="p" className="font-mono text-[11px]">{p.phone}</span>,
            <span
              key="l"
              className={cn(
                "text-[11px]",
                p.lastContacted && monthsAgo(p.lastContacted) >= 3
                  ? "text-icm-amber font-semibold"
                  : "text-icm-text-dim",
              )}
            >
              {p.lastContacted ?? "—"}
            </span>,
          ])}
          emptyText="No professional contacts yet."
          addLabel="Add contact"
        />
        {stale.length > 0 && (
          <div className="mt-3 rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[11.5px] font-geist text-icm-text flex items-start gap-2">
            <Sparkle className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
            <span>
              {stale.length} professional contact{stale.length === 1 ? "" : "s"} with no recorded
              contact in 90+ days. Consider reaching out to stay updated on service delivery.
            </span>
          </div>
        )}
      </Section>
    </div>
  );
}

// =============================================================
// TAB 7 — Documents
// =============================================================
function DocumentsTab({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Document Library">
        <div className="rounded-lg border border-icm-border bg-icm-panel p-3 mb-3 flex flex-wrap items-center gap-2">
          <select className="modal-input w-44">
            <option>All types</option>
            <option>Consent Forms</option>
            <option>DNR</option>
            <option>Guardianship Papers</option>
            <option>Insurance Cards</option>
            <option>Medical Records</option>
            <option>Legal Documents</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input placeholder="Search documents…" className="modal-input pl-7" />
          </div>
          <button className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90 flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" /> Upload document
          </button>
        </div>
        {profile.documents.length === 0 ? (
          <div className="rounded-lg border border-icm-border bg-icm-bg p-8 text-center">
            <FileText className="w-8 h-8 text-icm-text-faint mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-icm-text">No documents uploaded</p>
            <p className="text-[11.5px] text-icm-text-dim mt-1">
              Upload intake paperwork, insurance cards, and consent forms here.
            </p>
          </div>
        ) : (
          <DataTable
            columns={["Document", "Type", "Uploaded By", "Upload Date", "Expiration"]}
            rows={profile.documents.map((d) => [
              <span key="n" className="font-semibold">{d.name}</span>,
              d.type,
              d.uploadedBy,
              d.uploadDate,
              d.expirationDate ? (
                <ExpirationBadge date={d.expirationDate} />
              ) : (
                <span className="text-icm-text-dim">—</span>
              ),
            ])}
            emptyText=""
          />
        )}
      </Section>

      <Section title="AI Document Processing">
        <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[12px] font-geist text-icm-text flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-icm-accent mt-0.5" />
          <span>
            Upload documents and AI will extract key information automatically. Supported: insurance
            cards, Medicaid verification letters, assessment reports, guardianship orders.
          </span>
        </div>
      </Section>
    </div>
  );
}

// =============================================================
// TAB 8 — Administrative
// =============================================================
function AdminTab({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Case Assignment">
        <KvGrid
          rows={[
            ["Assigned Case Manager", profile.caseManager, true],
            ["Secondary Case Manager", profile.secondaryCaseManager ?? "—"],
            ["Supervisor", profile.supervisor ?? "—"],
            ["Program Coordinator", profile.programCoordinator ?? "—"],
          ]}
        />
      </Section>

      <Section title="Caseload Weighting">
        <KvGrid
          rows={[
            ["Caseload weight", profile.caseloadWeight?.toString() ?? "—"],
            ["Complexity level", profile.complexity ?? "Standard"],
          ]}
        />
      </Section>

      <Section title="Intake & Discharge">
        <KvGrid
          rows={[
            ["Referral date", profile.referralDate ?? "—"],
            ["Admission type", profile.admissionType ?? "—"],
            ["Previous agency", profile.previousAgency ?? "—"],
            ["Discharge date", profile.dischargeDate ?? "—"],
            ["Discharge type", profile.dischargeType ?? "—"],
            ["Discharge reason", profile.dischargeReason ?? "—"],
          ]}
        />
      </Section>

      <Section title="Compliance & Quality">
        <KvGrid
          rows={[
            ["Last chart review", profile.lastChartReview ?? "—"],
            ["Next chart review due", profile.nextChartReviewDue ?? "—"],
          ]}
        />
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <ComplianceChip label="PCP" status="Out of compliance" tone="red" />
          <ComplianceChip label="Monitoring" status="Due in 7 days" tone="amber" />
          <ComplianceChip label="MA" status="Active" tone="green" />
          <ComplianceChip label="Visits" status="Overdue" tone="red" />
        </div>
      </Section>

      <Section title="Notes & Special Instructions">
        <Field label="Special instructions">
          <textarea
            defaultValue=""
            placeholder="Visible across modules and in the sticky header."
            className="modal-input min-h-[60px]"
          />
        </Field>
        <Field label="Internal notes (not visible to individual or family)">
          <textarea
            defaultValue={profile.internalNotes ?? ""}
            className="modal-input min-h-[80px]"
          />
        </Field>
      </Section>

      <Section title="Profile Change History">
        {profile.changeHistory.length === 0 ? (
          <Empty text="No changes recorded." />
        ) : (
          <ul className="text-[11.5px] font-geist text-icm-text-dim space-y-1.5">
            {profile.changeHistory.map((c, i) => (
              <li key={i} className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-icm-text-faint">{c.date}</span>
                <span>·</span>
                <span className="text-icm-text">{c.user}</span>
                <span>·</span>
                <span>{c.field}:</span>
                <span className="text-icm-text-faint line-through">{c.oldValue}</span>
                <span>→</span>
                <span className="text-icm-text">{c.newValue}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// =============================================================
// Reusable bits
// =============================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-manrope font-bold text-[13.5px] text-icm-text tracking-tight">{title}</h3>
        <button className="text-[11px] font-geist text-icm-accent hover:underline flex items-center gap-1">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      {children}
      <style>{`.modal-input { width:100%; height:32px; padding:0 8px; border-radius:8px; border:1px solid hsl(var(--icm-border)); background:white; font-size:12px; color:hsl(var(--icm-text)); font-family: inherit; }
      textarea.modal-input { padding:8px; height:auto; }`}</style>
    </section>
  );
}

function KvGrid({ rows }: { rows: [string, React.ReactNode, boolean?][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
      {rows.map(([label, value, required], i) => (
        <div key={i} className="flex items-baseline gap-3 py-1.5 border-b border-icm-border/40 last:border-b-0">
          <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist w-1/3 text-right shrink-0">
            {label}
            {required && <span className="text-icm-red ml-0.5">*</span>}
          </span>
          <span className="text-[12.5px] text-icm-text font-geist flex-1 break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyText,
  addLabel,
  compact,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyText: string;
  addLabel?: string;
  compact?: boolean;
}) {
  return (
    <div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-icm-border bg-icm-bg p-4 text-center">
          <p className="text-[12px] text-icm-text-dim font-geist">{emptyText}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "text-left px-3 font-semibold text-icm-text-dim text-[10.5px] uppercase tracking-wider",
                      compact ? "py-1.5" : "py-2",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-icm-bg/50">
                  {r.map((cell, j) => (
                    <td key={j} className={cn("px-3 text-icm-text", compact ? "py-1.5" : "py-2")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {addLabel && (
        <button className="mt-2 h-8 px-3 rounded-lg border border-dashed border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-icm-text-dim font-geist">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg p-4 text-center">
      <p className="text-[12px] text-icm-text-dim font-geist">{text}</p>
    </div>
  );
}

function MedStatusBadge({ status }: { status: ProfileData["medications"][number]["status"] }) {
  const cls =
    status === "Active"
      ? "bg-icm-green-soft text-icm-green"
      : status === "Discontinued"
        ? "bg-icm-bg text-icm-text-dim"
        : "bg-icm-accent-soft text-icm-accent";
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", cls)}>{status}</span>;
}

function SeverityBadge({ severity }: { severity: ProfileData["allergies"][number]["severity"] }) {
  const cls =
    severity === "Life-threatening" || severity === "Severe"
      ? "bg-icm-red-soft text-icm-red"
      : severity === "Moderate"
        ? "bg-icm-amber-soft text-icm-amber"
        : "bg-icm-bg text-icm-text-dim";
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", cls)}>
      {severity}
    </span>
  );
}

function ProgramStatusBadge({ status }: { status: ProfileData["enrollments"][number]["status"] }) {
  const map = {
    Active: "bg-icm-green-soft text-icm-green",
    Pending: "bg-icm-amber-soft text-icm-amber",
    Closed: "bg-icm-bg text-icm-text-dim",
    "On Hold": "bg-icm-amber-soft text-icm-amber",
  } as const;
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", map[status])}>
      {status}
    </span>
  );
}

function ComplianceChip({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone: "red" | "amber" | "green";
}) {
  const cls = {
    red: "bg-icm-red-soft text-icm-red border-icm-red/20",
    amber: "bg-icm-amber-soft text-icm-amber border-icm-amber/20",
    green: "bg-icm-green-soft text-icm-green border-icm-green/20",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-2.5", cls)}>
      <p className="text-[10px] uppercase tracking-wider font-mono font-bold opacity-80">{label}</p>
      <p className="text-[11.5px] font-semibold mt-0.5">{status}</p>
    </div>
  );
}

function ExpirationBadge({ date }: { date: string }) {
  const days = daysUntil(date);
  let cls = "bg-icm-green-soft text-icm-green";
  let label = date;
  if (days < 0) {
    cls = "bg-icm-red-soft text-icm-red font-bold";
    label = "EXPIRED";
  } else if (days < 30) {
    cls = "bg-icm-red-soft text-icm-red";
  } else if (days < 90) {
    cls = "bg-icm-amber-soft text-icm-amber";
  }
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", cls)}>{label}</span>;
}

function InlineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-icm-bg border border-icm-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist font-medium">
        {label}
      </p>
      <p className="text-[12px] text-icm-text font-geist mt-0.5 truncate">{value}</p>
    </div>
  );
}

function DropdownItem({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 text-[12px] font-geist hover:bg-icm-bg flex items-center justify-between",
        active ? "text-icm-accent font-semibold" : "text-icm-text",
      )}
    >
      {label}
      {active && <span className="w-1.5 h-1.5 rounded-full bg-icm-accent" />}
    </button>
  );
}

function CompletenessFooter({
  tc,
  onJump,
}: {
  tc: ReturnType<typeof tabCompleteness>[number];
  onJump: (label: string) => void;
}) {
  const pct = tc.total === 0 ? 100 : Math.round((tc.filled / tc.total) * 100);
  const complete = tc.missing.length === 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap",
        complete ? "border-icm-green/20 bg-icm-green-soft" : "border-icm-amber/20 bg-icm-amber-soft",
      )}
    >
      <div className="flex items-center gap-2.5 text-[12px] font-geist text-icm-text">
        {complete ? (
          <CheckCircle2 className="w-4 h-4 text-icm-green" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-icm-amber" />
        )}
        <span className="font-semibold">
          {tc.label} · {pct}% complete
        </span>
        {!complete && (
          <span className="text-icm-text-dim">
            · Missing: {tc.missing.join(", ")}
          </span>
        )}
      </div>
      {!complete && (
        <button
          onClick={() => onJump(tc.missing[0])}
          className="text-[11px] font-geist font-semibold text-icm-text hover:underline"
        >
          Upload intake paperwork — AI can fill some fields →
        </button>
      )}
    </div>
  );
}

// =============================================================
// AI panel
// =============================================================
function ProfileAIPanel({ pct }: { pct: number }) {
  return (
    <aside className="w-[320px] shrink-0 border-l border-icm-border bg-icm-panel p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[12px] font-semibold text-icm-text font-geist">Profile assistant</span>
      </div>

      <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-3">
        <p className="text-[11px] font-mono font-bold tracking-wider text-icm-accent">PROFILE STATUS</p>
        <p className="text-[12px] text-icm-text mt-1 font-geist">
          Profile is <span className="font-bold">{pct}% complete</span>. The more complete the profile,
          the better AI performs across every module.
        </p>
      </div>

      <PanelSection tone="red" title="URGENT">
        Profile is {pct}% complete. Missing emergency contact phone — required for compliance.
      </PanelSection>
      <PanelSection tone="accent" title="INSIGHT">
        Joseph's HRST score has not been updated since admission in 2022. Annual update recommended.
      </PanelSection>
      <PanelSection tone="accent" title="INSIGHT">
        Primary diagnosis is F70 (Mild intellectual disability). 2 secondary diagnoses have been
        mentioned in recent notes but not added to the profile.
      </PanelSection>
      <PanelSection tone="green" title="GOOD NEWS">
        Joseph's Medicaid ID is verified and active. All insurance records are current.
      </PanelSection>
    </aside>
  );
}

function PanelSection({
  tone,
  title,
  children,
}: {
  tone: "red" | "accent" | "green";
  title: string;
  children: React.ReactNode;
}) {
  const map = {
    red: "border-icm-red/20 bg-icm-red-soft",
    accent: "border-icm-accent/20 bg-icm-accent-soft",
    green: "border-icm-green/20 bg-icm-green-soft",
  } as const;
  const titleColor = {
    red: "text-icm-red",
    accent: "text-icm-accent",
    green: "text-icm-green",
  }[tone];
  return (
    <div className={cn("mt-3 rounded-xl border p-3", map[tone])}>
      <p className={cn("text-[10px] font-mono font-bold tracking-wider", titleColor)}>{title}</p>
      <p className="text-[11.5px] font-geist text-icm-text mt-1 leading-relaxed">{children}</p>
    </div>
  );
}

// helpers
function daysUntil(mdy: string): number {
  const [m, d, y] = mdy.split("/").map(Number);
  if (!m || !d || !y) return Infinity;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function monthsAgo(mdy: string): number {
  const [m, d, y] = mdy.split("/").map(Number);
  if (!m || !d || !y) return 0;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  return (today.getFullYear() - target.getFullYear()) * 12 + (today.getMonth() - target.getMonth());
}

export default PersonProfile;
