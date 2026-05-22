import { useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  Printer,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Pill,
  Stethoscope,
  ShieldCheck,
  Users,
  Building2,
  Scale,
  FileText,
  Activity,
  CalendarClock,
  HeartPulse,
  Briefcase,
  ClipboardList,
} from "lucide-react";

import { getPerson } from "@/data/people";
import { getProfile } from "@/data/profiles";
import { getVisitSummariesForPerson } from "@/data/visitSummaries";
import { getProgressNotesForPerson } from "@/data/progressNotes";
import { getIncidentsForPerson } from "@/data/incidents";
import { getPlansForPerson } from "@/data/carePlans";
import { getDocumentsForIndividual } from "@/data/documents";
import { cn } from "@/lib/utils";

const PersonFaceSheet = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const profile = person ? getProfile(person.id) : null;

  const activity = useMemo(() => {
    if (!person) return null;
    const visits = getVisitSummariesForPerson(person.id);
    const notes = getProgressNotesForPerson(person.id);
    const incidents = getIncidentsForPerson(person.id);
    const plans = getPlansForPerson(person.id);
    const docs = getDocumentsForIndividual(person.id);
    const sortDesc = <T extends { date?: string; visitDate?: string; incidentDate?: string; updatedOn?: string }>(
      arr: T[],
      key: keyof T,
    ) => [...arr].sort((a, b) => new Date(String(b[key] ?? "")).getTime() - new Date(String(a[key] ?? "")).getTime());
    return {
      lastVisit: sortDesc(visits, "visitDate")[0],
      lastNote: sortDesc(notes, "date")[0],
      lastIncident: sortDesc(incidents, "incidentDate")[0],
      currentPlan: plans.find((p) => p.status === "In Progress" || p.status === "Approved") ?? plans[0],
      planCount: plans.length,
      noteCount: notes.length,
      visitCount: visits.length,
      incidentCount: incidents.length,
      docsCount: (docs.documents?.length ?? 0),
      recentDocs: (docs.documents ?? []).slice(0, 4),
    };
  }, [person]);

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
  const secondaryDx = profile.diagnoses.filter((d) => !d.primary);
  const severeAllergies = profile.allergies.filter(
    (a) => a.severity === "Severe" || a.severity === "Life-threatening",
  );
  const otherAllergies = profile.allergies.filter(
    (a) => a.severity !== "Severe" && a.severity !== "Life-threatening",
  );
  const activeProgram = profile.enrollments.find((e) => e.status === "Active");
  const primaryPharmacy = profile.pharmacies.find((p) => p.primary) ?? profile.pharmacies[0];
  const activeMeds = profile.medications.filter((m) => m.status === "Active");
  const prnMeds = profile.medications.filter((m) => m.status === "As Needed");

  const fullName = [person.firstName, profile.middleName, person.lastName].filter(Boolean).join(" ");

  return (
    <ICMShell title="Face Sheet" showAIPanel={false}>
      <div className="space-y-4 max-w-[1000px] mx-auto">
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
        <div className="flex items-center justify-between print:hidden">
          <p className="text-[11px] font-mono uppercase tracking-wider text-icm-text-faint">
            Comprehensive snapshot · Pulled from individual profile
          </p>
          <button
            onClick={() => window.print()}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>

        {/* Sheet */}
        <article className="rounded-xl border border-icm-border bg-icm-panel p-7 print:border-0 print:shadow-none print:p-0">
          {/* Header */}
          <header className="flex items-start gap-5 pb-5 border-b border-icm-border">
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt={`${person.firstName} ${person.lastName}`}
                width={88}
                height={88}
                loading="lazy"
                className="w-22 h-22 rounded-2xl object-cover border border-icm-border shrink-0"
                style={{ width: 88, height: 88 }}
              />
            ) : (
              <div className="w-22 h-22 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center font-mono text-[24px] font-bold text-icm-text-dim shrink-0" style={{ width: 88, height: 88 }}>
                {person.firstName[0]}
                {person.lastName[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-manrope font-extrabold text-[24px] text-icm-text tracking-tight leading-tight">
                {person.lastName}, {person.firstName}
                {(person.nickname || profile.preferredName) && (
                  <span className="font-medium text-icm-text-dim"> &ldquo;{person.nickname ?? profile.preferredName}&rdquo;</span>
                )}
              </h1>
              <p className="text-[12.5px] text-icm-text-dim font-geist mt-1">
                {fullName} · {person.gender === "M" ? "Male" : "Female"}
                {profile.pronouns && ` (${profile.pronouns})`} · {person.age}y · DOB{" "}
                <span className="font-mono text-icm-text">{person.dob}</span>
              </p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11.5px] font-geist text-icm-text-dim">
                <KV label="MA #" value={profile.medicaidId} />
                <KV label="State ID" value={profile.stateId} />
                <KV label="SSN" value={profile.ssn} />
                <KV label="LTSS ID" value={profile.ltssId} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className={cn(
                "inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider",
                person.status === "Active" && "bg-icm-green-soft text-icm-green",
                person.status === "Pending" && "bg-icm-amber-soft text-icm-amber",
                person.status === "Discharged" && "bg-icm-bg text-icm-text-dim",
              )}>
                {person.status}
              </span>
              <p className="text-[10px] text-icm-text-faint font-mono mt-2">
                Generated {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[10px] text-icm-text-faint font-mono">ID #{person.id}</p>
            </div>
          </header>

          {/* Critical alerts */}
          {(severeAllergies.length > 0 || person.aiFlag?.tone === "urgent") && (
            <div className="mt-4 space-y-2">
              {severeAllergies.map((a) => (
                <div key={a.allergen} className="rounded-lg border-2 border-icm-red bg-icm-red-soft p-2.5 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-icm-red shrink-0" />
                  <div className="flex-1">
                    <span className="text-[10.5px] font-mono font-bold text-icm-red uppercase tracking-wider mr-2">
                      {a.severity} Allergy
                    </span>
                    <span className="text-[13px] font-manrope font-bold text-icm-red">
                      {a.allergen} — {a.reaction}
                    </span>
                  </div>
                </div>
              ))}
              {person.aiFlag?.tone === "urgent" && (
                <div className="rounded-lg border-2 border-icm-amber bg-icm-amber-soft p-2.5 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0" />
                  <div className="flex-1">
                    <span className="text-[10.5px] font-mono font-bold text-icm-amber uppercase tracking-wider mr-2">Active Flag</span>
                    <span className="text-[13px] font-manrope font-bold text-icm-amber">{person.aiFlag.label}</span>
                    {person.aiFlag.detail && (
                      <span className="text-[12px] text-icm-text-dim ml-1.5">— {person.aiFlag.detail}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* At-a-glance stats */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Stat label="Risk Score" value={person.riskScore ?? "—"} accent={
              (person.riskScore ?? 0) >= 60 ? "red" : (person.riskScore ?? 0) >= 35 ? "amber" : "green"
            } />
            <Stat label="HRST" value={profile.hrstScore ?? "—"} />
            <Stat label="Complexity" value={profile.complexity ?? "—"} />
            <Stat label="Caseload Wt." value={profile.caseloadWeight?.toFixed(1) ?? "—"} />
          </div>

          {/* Section: Demographics & Contact */}
          <Section icon={<Users className="w-3.5 h-3.5" />} title="Demographics & Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Preferred Name" value={profile.preferredName ?? person.nickname ?? "—"} />
              <Row label="Pronouns" value={profile.pronouns ?? "—"} />
              <Row label="Race / Ethnicity" value={profile.raceEthnicity?.join(", ") ?? "—"} />
              <Row label="Primary Language" value={profile.primaryLanguage} />
              {profile.secondaryLanguage && <Row label="Secondary Lang." value={profile.secondaryLanguage} />}
              <Row label="Communication" value={profile.communicationNeeds ?? "—"} />
              <Row label="Living Situation" value={profile.livingSituation ?? "—"} />
              <Row label="Referral Source" value={profile.referralSource ?? "—"} />
              <Row label="Admitted On" value={person.admittedOn} mono />
              <Row label="County" value={person.county} />
            </div>
            <div className="mt-3 pt-3 border-t border-icm-border-soft grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row
                label="Address"
                value={
                  profile.street
                    ? <span className="inline-flex items-start gap-1.5"><MapPin className="w-3 h-3 mt-0.5 text-icm-text-faint" />{profile.street}, {profile.city}, {profile.state} {profile.zip}</span>
                    : "—"
                }
              />
              <Row
                label="Primary Phone"
                value={profile.primaryPhone
                  ? <span className="inline-flex items-center gap-1.5 font-mono"><Phone className="w-3 h-3 text-icm-text-faint" />{profile.primaryPhone}</span>
                  : "—"}
              />
              {profile.secondaryPhone && (
                <Row label="Secondary Phone" value={<span className="font-mono">{profile.secondaryPhone}</span>} />
              )}
              <Row
                label="Email"
                value={profile.email
                  ? <span className="inline-flex items-center gap-1.5"><Mail className="w-3 h-3 text-icm-text-faint" />{profile.email}</span>
                  : "—"}
              />
              <Row label="Preferred Contact" value={profile.preferredContact ?? "—"} />
            </div>
          </Section>

          {/* Section: Insurance */}
          <Section icon={<ShieldCheck className="w-3.5 h-3.5" />} title="Insurance Information">
            {profile.insurance.length === 0 ? (
              <Empty>No insurance on file.</Empty>
            ) : (
              <Table
                cols={["Type", "Provider", "Policy #", "Group #", "Effective", "Expires"]}
                rows={profile.insurance.map((i) => [
                  <Pill2 key="t">{i.type}</Pill2>,
                  i.provider,
                  <span key="p" className="font-mono">{i.policyNumber}</span>,
                  i.groupNumber ?? "—",
                  <span key="e" className="font-mono">{i.effectiveDate}</span>,
                  i.expirationDate ? <span key="x" className="font-mono">{i.expirationDate}</span> : "—",
                ])}
              />
            )}
          </Section>

          {/* Section: Medical */}
          <Section icon={<HeartPulse className="w-3.5 h-3.5" />} title="Medical Information">
            <SubHeading>Diagnoses</SubHeading>
            {primaryDx ? (
              <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-2.5 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-icm-accent-soft text-icm-accent text-[10px] font-mono font-bold uppercase tracking-wider">Primary</span>
                  <span className="font-mono text-[12.5px] text-icm-text font-semibold">{primaryDx.code}</span>
                  <span className="text-[12.5px] text-icm-text">{primaryDx.description}</span>
                </div>
                <p className="text-[11px] text-icm-text-faint mt-1 ml-1">Added {primaryDx.addedOn} by {primaryDx.addedBy}</p>
              </div>
            ) : <Empty>No primary diagnosis on file.</Empty>}
            {secondaryDx.length > 0 && (
              <ul className="space-y-1 text-[12.5px] font-geist">
                {secondaryDx.map((d) => (
                  <li key={d.code} className="flex items-baseline gap-2">
                    <span className="font-mono text-icm-text-dim w-16 shrink-0">{d.code}</span>
                    <span className="text-icm-text flex-1">{d.description}</span>
                    <span className="text-[10.5px] text-icm-text-faint font-mono">added {d.addedOn}</span>
                  </li>
                ))}
              </ul>
            )}

            <SubHeading className="mt-4">
              <Pill className="w-3 h-3 inline mr-1" />Medications
              <span className="ml-1.5 text-icm-text-faint font-normal">({activeMeds.length} active{prnMeds.length ? `, ${prnMeds.length} PRN` : ""})</span>
            </SubHeading>
            {profile.medications.length === 0 ? (
              <Empty>No medications recorded.</Empty>
            ) : (
              <Table
                cols={["Medication", "Dosage", "Frequency", "Status", "Prescriber", "Since"]}
                rows={profile.medications.map((m) => [
                  <span key="n" className="font-semibold">{m.name}</span>,
                  <span key="d" className="font-mono">{m.dosage}</span>,
                  m.frequency,
                  <Pill2 key="s" tone={m.status === "Active" ? "green" : m.status === "As Needed" ? "amber" : "muted"}>{m.status}</Pill2>,
                  m.prescriber,
                  <span key="x" className="font-mono text-icm-text-faint">{m.startDate}</span>,
                ])}
              />
            )}

            <SubHeading className="mt-4">Allergies</SubHeading>
            {profile.allergies.length === 0 ? (
              <Empty>None recorded.</Empty>
            ) : (
              <ul className="space-y-1 text-[12.5px] font-geist">
                {[...severeAllergies, ...otherAllergies].map((a) => (
                  <li key={a.allergen} className="flex items-center gap-2">
                    <Pill2 tone={a.severity === "Severe" || a.severity === "Life-threatening" ? "red" : "amber"}>
                      {a.severity}
                    </Pill2>
                    <span className="text-icm-text font-semibold">{a.allergen}</span>
                    <span className="text-icm-text-dim">— {a.reaction}</span>
                    <span className="ml-auto text-[10.5px] text-icm-text-faint font-mono">id {a.identifiedOn}</span>
                  </li>
                ))}
              </ul>
            )}

            <SubHeading className="mt-4">Vital Baselines</SubHeading>
            <Table
              cols={["Measurement", "Baseline", "Normal Range", "Last Measured", "By"]}
              rows={profile.vitalBaselines.map((v) => [
                v.measurement,
                <span key="b" className="font-mono">{v.baseline}</span>,
                <span key="r" className="text-icm-text-faint">{v.normalRange}</span>,
                v.lastMeasured ? <span key="l" className="font-mono">{v.lastMeasured}</span> : "—",
                v.measuredBy ?? "—",
              ])}
            />
          </Section>

          {/* Section: Providers & Pharmacy */}
          <Section icon={<Stethoscope className="w-3.5 h-3.5" />} title="Healthcare Providers & Pharmacy">
            {profile.providers.length === 0 ? (
              <Empty>No providers on file.</Empty>
            ) : (
              <Table
                cols={["Provider", "Specialty", "Phone", "Last Visit", "Next Appt."]}
                rows={profile.providers.map((p) => [
                  <span key="n" className="font-semibold">{p.name}</span>,
                  p.specialty,
                  <span key="p" className="font-mono">{p.phone}</span>,
                  p.lastVisit ? <span key="l" className="font-mono">{p.lastVisit}</span> : "—",
                  p.nextAppointment ? <span key="x" className="font-mono">{p.nextAppointment}</span> : "—",
                ])}
              />
            )}
            {primaryPharmacy && (
              <div className="mt-3 pt-3 border-t border-icm-border-soft grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
                <Row label="Primary Pharmacy" value={primaryPharmacy.name} />
                <Row label="Pharmacy Phone" value={<span className="font-mono">{primaryPharmacy.phone}</span>} />
                {primaryPharmacy.address && <Row label="Pharmacy Address" value={primaryPharmacy.address} />}
              </div>
            )}
          </Section>

          {/* Section: Contacts */}
          <Section icon={<Phone className="w-3.5 h-3.5" />} title="Emergency Contacts & Support Circle">
            <SubHeading>Emergency Contacts</SubHeading>
            {profile.emergencyContacts.length === 0 ? (
              <Empty>No emergency contacts on file.</Empty>
            ) : (
              <Table
                cols={["Priority", "Name", "Relationship", "Primary Phone", "Secondary", "Notes"]}
                rows={profile.emergencyContacts.map((c) => [
                  <span key="p" className="font-mono text-icm-text-faint">#{c.priority ?? "—"}</span>,
                  <span key="n" className="font-semibold">{c.name}</span>,
                  c.relationship,
                  <span key="x" className="font-mono">{c.primaryPhone}</span>,
                  c.secondaryPhone ? <span key="s" className="font-mono">{c.secondaryPhone}</span> : "—",
                  <span key="o" className="text-icm-text-dim">{c.notes ?? "—"}</span>,
                ])}
              />
            )}

            {profile.supportCircle.length > 0 && (
              <>
                <SubHeading className="mt-4">Support Circle</SubHeading>
                <Table
                  cols={["Name", "Role", "Phone", "Involvement"]}
                  rows={profile.supportCircle.map((s) => [
                    <span key="n" className="font-semibold">{s.name}</span>,
                    s.role,
                    s.phone ? <span key="p" className="font-mono">{s.phone}</span> : "—",
                    <Pill2 key="i" tone={s.involvement === "High" ? "green" : s.involvement === "Medium" ? "amber" : "muted"}>{s.involvement}</Pill2>,
                  ])}
                />
              </>
            )}

            {profile.professionalContacts.length > 0 && (
              <>
                <SubHeading className="mt-4">Professional Contacts</SubHeading>
                <Table
                  cols={["Name", "Organization", "Role", "Phone", "Last Contact"]}
                  rows={profile.professionalContacts.map((c) => [
                    <span key="n" className="font-semibold">{c.name}</span>,
                    c.organization,
                    c.role,
                    <span key="p" className="font-mono">{c.phone}</span>,
                    c.lastContacted ? <span key="l" className="font-mono">{c.lastContacted}</span> : "—",
                  ])}
                />
              </>
            )}
          </Section>

          {/* Section: Program & Funding */}
          <Section icon={<Briefcase className="w-3.5 h-3.5" />} title="Program Enrollment & Funding">
            {activeProgram && (
              <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-2.5 mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                <KV label="Program" value={activeProgram.program} />
                <KV label="Service" value={activeProgram.serviceCategory} />
                <KV label="Start" value={activeProgram.startDate} />
                <KV label="Case Mgr" value={activeProgram.caseManager} />
              </div>
            )}
            {profile.funding.length > 0 && (
              <Table
                cols={["Type", "Auth #", "Period", "Authorized", "Used", "Status"]}
                rows={profile.funding.map((f) => [
                  f.type,
                  <span key="a" className="font-mono">{f.authorizationNumber}</span>,
                  f.period,
                  <span key="u" className="font-mono">{f.authorizedUnits} units</span>,
                  <span key="x" className="font-mono">{f.usedUnits} units</span>,
                  <Pill2 key="s" tone={f.status === "Active" ? "green" : f.status === "Pending" ? "amber" : "muted"}>{f.status}</Pill2>,
                ])}
              />
            )}
          </Section>

          {/* Section: Legal / Guardianship */}
          {(profile.legalStatus || profile.guardianName || profile.court || profile.nextCourtDate) && (
            <Section icon={<Scale className="w-3.5 h-3.5" />} title="Legal & Guardianship">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
                <Row label="Legal Status" value={profile.legalStatus ?? "—"} />
                <Row label="Guardianship Type" value={profile.guardianshipType ?? "—"} />
                <Row label="Guardian" value={profile.guardianName ?? "—"} />
                <Row label="Relationship" value={profile.guardianRelationship ?? "—"} />
                <Row label="Guardian Phone" value={profile.guardianPhone ? <span className="font-mono">{profile.guardianPhone}</span> : "—"} />
                <Row label="Attorney" value={profile.attorney ?? "—"} />
                <Row label="Court" value={profile.court ?? "—"} />
                <Row label="Last Court Date" value={profile.lastCourtDate ? <span className="font-mono">{profile.lastCourtDate}</span> : "—"} />
                <Row label="Next Court Date" value={profile.nextCourtDate ? <span className="font-mono">{profile.nextCourtDate}</span> : "—"} />
                <Row label="Forensic Involvement" value={profile.forensicInvolvement ? "Yes" : "No"} />
              </div>
            </Section>
          )}

          {/* Section: Recent Activity */}
          <Section icon={<Activity className="w-3.5 h-3.5" />} title="Recent Activity & History">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <Stat label="Visits" value={activity?.visitCount ?? 0} />
              <Stat label="Progress Notes" value={activity?.noteCount ?? 0} />
              <Stat label="Incidents" value={activity?.incidentCount ?? 0} />
              <Stat label="Documents" value={activity?.docsCount ?? 0} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActivityCard
                icon={<CalendarClock className="w-3.5 h-3.5" />}
                title="Last Visit"
                empty={!activity?.lastVisit}
              >
                {activity?.lastVisit && (
                  <>
                    <p className="text-[12.5px] font-semibold text-icm-text">
                      {activity.lastVisit.visitDate}{activity.lastVisit.startTime && ` · ${activity.lastVisit.startTime}`}
                    </p>
                    <p className="text-[11.5px] text-icm-text-dim">{activity.lastVisit.location ?? "Location not specified"}</p>
                    {activity.lastVisit.purposeOfSupport && (
                      <p className="text-[11.5px] text-icm-text-dim mt-1 line-clamp-2">{activity.lastVisit.purposeOfSupport}</p>
                    )}
                    {activity.lastVisit.nextVisitDate && (
                      <p className="text-[10.5px] font-mono text-icm-accent mt-1.5">Next visit: {activity.lastVisit.nextVisitDate}</p>
                    )}
                  </>
                )}
              </ActivityCard>

              <ActivityCard
                icon={<ClipboardList className="w-3.5 h-3.5" />}
                title="Last Progress Note"
                empty={!activity?.lastNote}
              >
                {activity?.lastNote && (
                  <>
                    <p className="text-[12.5px] font-semibold text-icm-text">
                      {activity.lastNote.date} · {activity.lastNote.activityType}
                    </p>
                    {activity.lastNote.contactType && (
                      <p className="text-[11.5px] text-icm-text-dim">{activity.lastNote.contactType} · {activity.lastNote.status}</p>
                    )}
                    {activity.lastNote.purposeOfActivity && (
                      <p className="text-[11.5px] text-icm-text-dim mt-1 line-clamp-2">{activity.lastNote.purposeOfActivity}</p>
                    )}
                  </>
                )}
              </ActivityCard>

              <ActivityCard
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                title="Last Incident"
                empty={!activity?.lastIncident}
              >
                {activity?.lastIncident && (
                  <>
                    <p className="text-[12.5px] font-semibold text-icm-text">
                      {activity.lastIncident.incidentDate} · {activity.lastIncident.classification}
                    </p>
                    <p className="text-[11.5px] text-icm-text-dim">{activity.lastIncident.incidentTypes.join(", ")}</p>
                    <p className="text-[10.5px] font-mono text-icm-text-faint mt-1">Status: {activity.lastIncident.status}</p>
                  </>
                )}
              </ActivityCard>

              <ActivityCard
                icon={<FileText className="w-3.5 h-3.5" />}
                title="Active Care Plan"
                empty={!activity?.currentPlan}
              >
                {activity?.currentPlan && (
                  <>
                    <p className="text-[12.5px] font-semibold text-icm-text">
                      Plan #{activity.currentPlan.id} · {activity.currentPlan.status}
                    </p>
                    <p className="text-[11.5px] text-icm-text-dim">
                      {activity.currentPlan.goals.length} goal{activity.currentPlan.goals.length === 1 ? "" : "s"}
                      {activity.currentPlan.effectiveDate && ` · effective ${activity.currentPlan.effectiveDate}`}
                    </p>
                    {activity.currentPlan.reviewDate && (
                      <p className="text-[10.5px] font-mono text-icm-accent mt-1">Review due: {activity.currentPlan.reviewDate}</p>
                    )}
                  </>
                )}
              </ActivityCard>
            </div>

            <div className="mt-3 pt-3 border-t border-icm-border-soft grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-[11.5px] font-geist">
              <KV label="Last Chart Review" value={profile.lastChartReview} />
              <KV label="Next Review Due" value={profile.nextChartReviewDue} />
              <KV label="Referral Date" value={profile.referralDate} />
              <KV label="Admission Type" value={profile.admissionType} />
            </div>
          </Section>

          {/* Section: Documents */}
          {activity && activity.recentDocs.length > 0 && (
            <Section icon={<FileText className="w-3.5 h-3.5" />} title="Recent Documents">
              <Table
                cols={["Document", "Type", "Uploaded", "By"]}
                rows={activity.recentDocs.map((d: any) => [
                  <span key="n" className="font-semibold">{d.name}</span>,
                  d.type ?? "—",
                  <span key="u" className="font-mono">{d.uploadedAt ?? d.uploadDate ?? "—"}</span>,
                  d.uploadedBy ?? "—",
                ])}
              />
            </Section>
          )}

          {/* Section: Care Team */}
          <Section icon={<Building2 className="w-3.5 h-3.5" />} title="Care Team & Administrative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Case Manager" value={profile.caseManager} />
              {profile.secondaryCaseManager && <Row label="Secondary CM" value={profile.secondaryCaseManager} />}
              {profile.supervisor && <Row label="Supervisor" value={profile.supervisor} />}
              {profile.programCoordinator && <Row label="Program Coord." value={profile.programCoordinator} />}
              <Row label="Complexity" value={profile.complexity ?? "—"} />
              <Row label="Caseload Weight" value={profile.caseloadWeight?.toFixed(1) ?? "—"} />
            </div>
          </Section>

          {/* Special Instructions */}
          {person.specialInstructions && (
            <div className="mt-5 pt-4 border-t border-icm-border bg-icm-amber-soft/30 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-icm-amber font-mono font-bold mb-1">
                Special Instructions
              </p>
              <p className="text-[13px] text-icm-text font-geist">{person.specialInstructions}</p>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-6 pt-4 border-t border-icm-border flex items-center justify-between text-[10px] font-mono text-icm-text-faint">
            <span>CaseManagement.ai · Comprehensive Face Sheet</span>
            <span>Confidential — for authorized use only</span>
            <span>ID #{person.id}</span>
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

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "red" | "amber" | "green" }) {
  const accentClass =
    accent === "red" ? "text-icm-red" : accent === "amber" ? "text-icm-amber" : accent === "green" ? "text-icm-green" : "text-icm-text";
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg/40 px-2.5 py-2">
      <p className="text-[9.5px] uppercase tracking-wider text-icm-text-faint font-mono">{label}</p>
      <p className={cn("text-[15px] font-manrope font-bold mt-0.5 truncate", accentClass)}>{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-icm-text-dim italic">{children}</p>;
}

function Pill2({ children, tone = "muted" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "muted" | "accent" }) {
  const map = {
    green: "bg-icm-green-soft text-icm-green",
    amber: "bg-icm-amber-soft text-icm-amber",
    red: "bg-icm-red-soft text-icm-red",
    accent: "bg-icm-accent-soft text-icm-accent",
    muted: "bg-icm-bg text-icm-text-dim",
  };
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider", map[tone])}>{children}</span>;
}

function Table({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-icm-border">
      <table className="w-full text-[12px] font-geist">
        <thead>
          <tr className="bg-icm-bg/60 text-icm-text-faint">
            {cols.map((c) => (
              <th key={c} className="text-left font-mono font-semibold uppercase tracking-wider text-[10px] px-2.5 py-1.5">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-icm-border-soft">
              {r.map((cell, j) => (
                <td key={j} className="px-2.5 py-1.5 align-top text-icm-text">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityCard({ icon, title, empty, children }: { icon: React.ReactNode; title: string; empty?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg/30 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-icm-accent">{icon}</span>
        <p className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-mono font-semibold">{title}</p>
      </div>
      {empty ? <p className="text-[11.5px] text-icm-text-dim italic">No records on file.</p> : children}
    </div>
  );
}

export default PersonFaceSheet;
