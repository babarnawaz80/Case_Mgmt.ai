import { useNavigate, useParams } from "react-router-dom";
import { useRef, useState } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  Printer, AlertTriangle, Phone, Mail, MapPin,
  ShieldCheck, Users, Building2, FileText, Activity,
  HeartPulse, ClipboardList, Loader2, UserCheck,
  Calendar, BookOpen, Stethoscope, Siren, Scale,
  MessageSquare, CheckSquare, ClipboardCheck, Layers,
  Star, Download,
} from "lucide-react";
import { useIndividual, calcAge, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useProgressNotes } from "@/hooks/useProgressNotes";
import {
  useContactNotes,
  useCarePlans,
  useMonitoringForms,
  useVisitSummaries,
  useIncidentReports,
  useServiceAuthorizations,
  useEligibilityVerifications,
  useReferrals,
} from "@/hooks/useFirestore";
import { cn } from "@/lib/utils";
import { AuthorCell } from "@/components/icm/AuthorCell";
import { useAuth } from "@/contexts/AuthContext";
import { OrgPrintHeader } from "@/components/icm/OrgPrintHeader";
import { useDiagnoses, useMedications, useAllergies } from "@/hooks/useMedicalRecords";

const PersonFaceSheet = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { userProfile } = useAuth();
  const { individual, loading } = useIndividual(id);

  // Live collection data
  const { notes }          = useProgressNotes(id);
  const { data: contacts } = useContactNotes(id);
  const { data: carePlans } = useCarePlans(id);
  const { data: monForms }  = useMonitoringForms(id);
  const { data: visits }    = useVisitSummaries(id);
  const { data: incidents } = useIncidentReports(id);
  const { data: serviceAuths } = useServiceAuthorizations(id);
  const { data: eligVerifs } = useEligibilityVerifications(id);
  const { data: referrals }  = useReferrals(id);

  const { diagnoses: fsDiagnoses } = useDiagnoses(id);
  const { medications: fsMedications } = useMedications(id);
  const { allergies: fsAllergies } = useAllergies(id);

  const fsSevereAllergies = fsAllergies.filter(
    (a) => a.severity === "severe" || a.severity === "life-threatening"
  );
  const fsPrimaryDiagnosis = fsDiagnoses.find((d) => d.diagnosis_type === "primary");
  const fsSecondaryDiagnoses = fsDiagnoses.filter((d) => d.diagnosis_type === "secondary");
  const fsActiveMeds = fsMedications.filter((m) => m.is_active);

  const age            = individual ? calcAge(individual.dob) : null;
  const riskClass      = individual ? riskAvatarClass(individual.risk_score) : "";
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

  // Derived values
  const lastNote        = notes[0] ?? null;
  const lastContact     = contacts[0] ?? null;
  const lastVisit       = visits[0] ?? null;
  const lastMonForm     = monForms[0] ?? null;
  const lastIncident    = incidents[0] ?? null;
  const activePlan      = carePlans.find((p) => p.status === "active") ?? carePlans[0] ?? null;
  const activeAuth      = serviceAuths.find((a) => a.status === "active") ?? serviceAuths[0] ?? null;
  const latestElig      = eligVerifs[0] ?? null;
  const openIncidents   = incidents.filter((i) => i.status !== "closed" && i.status !== "resolved").length;
  const highRisk        = (individual.risk_score ?? 0) >= 60;

  const displayName = (name?: string, uid?: string): string => {
    const val = name ?? uid;
    if (!val) return "—";
    if (/^[A-Za-z0-9]{20,}$/.test(val) && !val.includes(" ")) return "Assigned";
    return val;
  };

  // Build full address from split or combined fields
  const fullAddress = individual.address_street
    ? [
        individual.address_street,
        [individual.address_city, individual.address_state, individual.address_zip].filter(Boolean).join(", "),
      ].filter(Boolean).join(", ")
    : individual.address ?? null;

  async function handleSavePdf() {
    if (!articleRef.current || !individual) return;
    setGeneratingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const el = articleRef.current;
      // Temporarily expand the element so html2canvas captures the full page
      const originalMaxHeight = el.style.maxHeight;
      el.style.maxHeight = "none";

      const canvas = await html2canvas(el, {
        scale: 2,               // 2× for crisp text
        useCORS: true,          // allow org logo images
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1000,      // fixed width for consistent output
      });

      el.style.maxHeight = originalMaxHeight;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const contentW = pageW - margin * 2;
      const imgH = (canvas.height * contentW) / canvas.width;

      // If taller than one page, split across pages
      let yPos = margin;
      let remainingH = imgH;
      let sourceY = 0;

      while (remainingH > 0) {
        const sliceH = Math.min(remainingH, pageH - margin * 2);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil((sliceH * canvas.width) / contentW);
        const ctx = sliceCanvas.getContext("2d");
        ctx?.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
        const sliceData = sliceCanvas.toDataURL("image/png");

        pdf.addImage(sliceData, "PNG", margin, yPos, contentW, sliceH);
        remainingH -= sliceH;
        sourceY += sliceCanvas.height;

        if (remainingH > 0) {
          pdf.addPage();
          yPos = margin;
        }
      }

      const filename = `FaceSheet_${individual.last_name}_${individual.first_name}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("[FaceSheet PDF]", err);
      // Fallback to browser print dialog
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  }

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
            Comprehensive snapshot · Pulled live from individual record
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePdf}
              disabled={generatingPdf}
              className="h-9 px-3 rounded-xl bg-icm-accent text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-60"
            >
              {generatingPdf
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                : <><Download className="w-3.5 h-3.5" /> Save PDF</>
              }
            </button>
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        <article ref={articleRef} className="rounded-xl border border-icm-border bg-icm-panel p-6 sm:p-8 print:border-0 print:shadow-none print:p-0 space-y-0">
          {/* Org letterhead */}
          {userProfile?.organizationId && (
            <OrgPrintHeader
              orgId={userProfile.organizationId}
              individualName={`${individual.first_name} ${individual.last_name}`}
              individualPhotoUrl={individual.photo_url ?? undefined}
              documentTitle="Face Sheet"
            />
          )}

          {/* ── Header ─────────────────────────────────────────────────── */}
          <header className="flex items-start gap-5 pb-6 border-b border-icm-border">
            {/* Avatar or photo */}
            {individual.photo_url ? (
              <img
                src={individual.photo_url}
                alt={`${individual.first_name} ${individual.last_name}`}
                className="rounded-2xl object-cover shrink-0 border-2 border-icm-border"
                style={{ width: 88, height: 88 }}
              />
            ) : (
              <div
                className={`rounded-2xl border-2 flex items-center justify-center font-mono text-[24px] font-bold ${riskClass} shrink-0`}
                style={{ width: 88, height: 88 }}
              >
                {personInitials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="font-manrope font-extrabold text-[24px] text-icm-text tracking-tight leading-tight">
                {individual.last_name}, {individual.first_name}
                {individual.preferred_name && (
                  <span className="font-medium text-icm-text-dim"> &ldquo;{individual.preferred_name}&rdquo;</span>
                )}
              </h1>
              <p className="text-[12.5px] text-icm-text-dim font-geist mt-0.5">
                {individual.gender ?? "—"} · {age !== null ? `${age}y` : "—"} · DOB{" "}
                <span className="font-mono text-icm-text">{individual.dob ?? "—"}</span>
              </p>
              <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11.5px] font-geist text-icm-text-dim">
                <KV label="MA #" value={individual.medicaid_id ?? individual.ma_id ?? "—"} />
                <KV label="LTSS ID" value={individual.ltss_id ?? "—"} />
                <KV label="Case #" value={individual.case_number ?? "—"} />
                <KV label="County" value={individual.county ?? "—"} />
                <KV label="Program" value={individual.program ?? "—"} />
                <KV label="Waiver" value={individual.waiver_type ?? "—"} />
                <KV label="Level of Care" value={individual.level_of_care ?? "—"} />
                <KV label="Funding" value={individual.funding_stream ?? "—"} />
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={cn(
                "inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider",
                individual.enrollment_status === "active"    && "bg-icm-green-soft text-icm-green",
                individual.enrollment_status === "pending"   && "bg-icm-amber-soft text-icm-amber",
                individual.enrollment_status === "discharged" && "bg-icm-bg text-icm-text-dim",
              )}>
                {individual.enrollment_status}
              </span>
              <p className="text-[10px] text-icm-text-faint font-mono mt-2">
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[10px] text-icm-text-faint font-mono">ID #{individual.id.slice(0, 8)}</p>
            </div>
          </header>

          {/* ── Allergy Alert ───────────────────────────────────────────── */}
          {fsSevereAllergies.length > 0 && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 mt-5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800 text-[13px]">ALLERGY ALERT</p>
                  {fsSevereAllergies.map((a) => (
                    <p key={a.id} className="text-red-700 text-[12px] mt-0.5">
                      <span className="font-bold">{a.allergen}</span> ({a.severity}) — {a.reaction}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── High Risk Alert ─────────────────────────────────────────── */}
          {highRisk && (
            <div className="mt-5">
              <div className="rounded-lg border-2 border-icm-red bg-icm-red-soft p-2.5 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-icm-red shrink-0" />
                <span className="text-[10.5px] font-mono font-bold text-icm-red uppercase tracking-wider mr-2">High Risk</span>
                <span className="text-[13px] font-manrope font-bold text-icm-red">
                  Risk Score {individual.risk_score} — Requires elevated monitoring
                </span>
              </div>
            </div>
          )}

          {/* ── Special Instructions ────────────────────────────────────── */}
          {(individual.special_instructions || individual.specialInstructions) && (
            <div className="mt-5">
              <div className="rounded-lg border-2 border-icm-amber bg-icm-amber-soft p-3 flex items-start gap-2.5">
                <Star className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10.5px] font-mono font-bold text-icm-amber uppercase tracking-wider mb-1">Special Instructions</p>
                  <p className="text-[12.5px] font-geist text-icm-text">
                    {individual.special_instructions ?? individual.specialInstructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Stats strip ─────────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Stat
              label="Risk Score"
              value={individual.risk_score ?? "—"}
              accent={(individual.risk_score ?? 0) >= 60 ? "red" : (individual.risk_score ?? 0) >= 35 ? "amber" : "green"}
            />
            <Stat label="Progress Notes"   value={notes.length} />
            <Stat label="Contact Notes"    value={contacts.length} />
            <Stat label="Visit Summaries"  value={visits.length} />
            <Stat label="Monitoring Forms" value={monForms.length} />
            <Stat label="Open Tasks"       value={individual.open_tasks ?? 0} />
            <Stat label="Open Incidents"   value={openIncidents} accent={openIncidents > 0 ? "red" : undefined} />
            <Stat
              label="MA Status"
              value={individual.ma_status ?? latestElig?.verification_status ?? "—"}
              accent={
                (individual.ma_status ?? latestElig?.verification_status) === "active" ||
                (individual.ma_status ?? latestElig?.verification_status) === "verified" ? "green" : undefined
              }
            />
          </div>

          {/* ── Section 1: Demographics ─────────────────────────────────── */}
          <Section icon={<Users className="w-3.5 h-3.5" />} title="Demographics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Full Name"         value={`${individual.last_name}, ${individual.first_name}`} />
              <Row label="Preferred Name"    value={individual.preferred_name ?? "—"} />
              <Row label="Date of Birth"     value={individual.dob ?? "—"} mono />
              <Row label="Age"               value={age !== null ? `${age} years` : "—"} />
              <Row label="Gender"            value={individual.gender ?? "—"} />
              <Row label="Race / Ethnicity"  value={individual.race_ethnicity ?? "—"} />
              <Row label="Primary Language"  value={individual.primary_language ?? "—"} />
              <Row label="Secondary Language" value={individual.secondary_language ?? "—"} />
              <Row label="Marital Status"    value={individual.marital_status ?? "—"} />
              <Row label="Religion"          value={individual.religion ?? "—"} />
              <Row
                label="Living Situation"
                value={
                  (individual.living_situation || individual.living_situation) ? (
                    <span className={cn(
                      "inline-flex items-center gap-1.5",
                      (individual.living_situation === "Homeless" || individual.living_situation === "Other") && "text-icm-amber font-semibold"
                    )}>
                      {(individual.living_situation === "Homeless" || individual.living_situation === "Other") && <AlertTriangle className="w-3 h-3" />}
                      {individual.living_situation}
                    </span>
                  ) : "—"
                }
              />
              {individual.communication_notes && (
                <Row label="Communication Notes" value={individual.communication_notes} />
              )}
            </div>
          </Section>

          {/* ── Section 2: Contact Information ──────────────────────────── */}
          <Section icon={<Phone className="w-3.5 h-3.5" />} title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row
                label="Home Phone"
                value={
                  (individual.phone_home ?? individual.phone) ? (
                    <a href={`tel:${individual.phone_home ?? individual.phone}`} className="inline-flex items-center gap-1.5 font-mono text-icm-accent hover:underline">
                      <Phone className="w-3 h-3" />
                      {individual.phone_home ?? individual.phone}
                    </a>
                  ) : "—"
                }
              />
              <Row
                label="Cell Phone"
                value={
                  individual.phone_cell ? (
                    <a href={`tel:${individual.phone_cell}`} className="inline-flex items-center gap-1.5 font-mono text-icm-accent hover:underline">
                      <Phone className="w-3 h-3" />
                      {individual.phone_cell}
                    </a>
                  ) : "—"
                }
              />
              <Row
                label="Email"
                value={
                  individual.email ? (
                    <a href={`mailto:${individual.email}`} className="inline-flex items-center gap-1.5 text-icm-accent hover:underline">
                      <Mail className="w-3 h-3" />
                      {individual.email}
                    </a>
                  ) : "—"
                }
              />
              <Row
                label="Address"
                value={
                  fullAddress ? (
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 mt-0.5 text-icm-text-faint shrink-0" />
                      {fullAddress}
                    </span>
                  ) : "—"
                }
              />
              {individual.address_city && (
                <>
                  <Row label="City"  value={individual.address_city ?? "—"} />
                  <Row label="State" value={individual.address_state ?? "—"} />
                  <Row label="ZIP"   value={individual.address_zip ?? "—"} mono />
                </>
              )}
              <Row label="County" value={individual.county ?? "—"} />
            </div>
          </Section>

          {/* ── Section 3: Emergency Contact & Legal Guardian ───────────── */}
          <Section icon={<Siren className="w-3.5 h-3.5" />} title="Emergency Contact & Guardian">
            <SubHeading>Emergency Contact</SubHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 mb-4">
              <Row label="Name"         value={individual.emergency_contact_name ?? "—"} />
              <Row label="Relationship" value={individual.emergency_contact_relation ?? "—"} />
              <Row
                label="Phone"
                value={
                  individual.emergency_contact_phone ? (
                    <a href={`tel:${individual.emergency_contact_phone}`} className="inline-flex items-center gap-1.5 font-mono text-icm-accent hover:underline">
                      <Phone className="w-3 h-3" /> {individual.emergency_contact_phone}
                    </a>
                  ) : "—"
                }
              />
              <Row
                label="Alt Phone"
                value={
                  individual.emergency_contact_phone2 ? (
                    <a href={`tel:${individual.emergency_contact_phone2}`} className="inline-flex items-center gap-1.5 font-mono text-icm-accent hover:underline">
                      <Phone className="w-3 h-3" /> {individual.emergency_contact_phone2}
                    </a>
                  ) : "—"
                }
              />
              <Row label="Email" value={individual.emergency_contact_email ?? "—"} />
            </div>

            <SubHeading>Guardian / POA</SubHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Guardian Name"     value={individual.guardian_name ?? "—"} />
              <Row label="Relationship"      value={individual.guardian_relationship ?? "—"} />
              <Row
                label="Guardian Phone"
                value={
                  individual.guardian_phone ? (
                    <a href={`tel:${individual.guardian_phone}`} className="inline-flex items-center gap-1.5 font-mono text-icm-accent hover:underline">
                      <Phone className="w-3 h-3" /> {individual.guardian_phone}
                    </a>
                  ) : "—"
                }
              />
              <Row label="Guardian Email" value={individual.guardian_email ?? "—"} />
              <Row label="POA Name"       value={individual.poa_name ?? "—"} />
              <Row
                label="POA Phone"
                value={
                  individual.poa_phone ? (
                    <a href={`tel:${individual.poa_phone}`} className="inline-flex items-center gap-1.5 font-mono text-icm-accent hover:underline">
                      <Phone className="w-3 h-3" /> {individual.poa_phone}
                    </a>
                  ) : "—"
                }
              />
              <Row label="Legal Status" value={individual.legal_status ?? "—"} />
            </div>
          </Section>

          {/* ── Section 4: Insurance & Medicaid ─────────────────────────── */}
          <Section icon={<ShieldCheck className="w-3.5 h-3.5" />} title="Insurance & Medicaid">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Medicaid ID"       value={individual.medicaid_id ?? individual.ma_id ?? "—"} mono />
              <Row label="MA Type"           value={individual.ma_type ?? "—"} />
              <Row label="MA Status"         value={individual.ma_status ?? latestElig?.verification_status ?? "—"} />
              <Row label="MA Effective Date" value={individual.ma_effective_date ?? "—"} mono />
              <Row label="MA Redet. Date"    value={individual.ma_redetermination_date ?? "—"} mono />
              <Row label="LTSS ID"           value={individual.ltss_id ?? "—"} mono />
              <Row label="Secondary Insurance" value={individual.secondary_insurance_name ?? "—"} />
              <Row label="Secondary Ins. ID"   value={individual.secondary_insurance_id ?? "—"} mono />
              <Row label="Level of Care"     value={individual.level_of_care ?? "—"} />
              <Row label="Funding Stream"    value={individual.funding_stream ?? "—"} />
            </div>
            {latestElig && (
              <div className="mt-3 rounded-lg border border-icm-border bg-icm-bg/40 p-3">
                <p className="text-[10.5px] font-mono font-semibold text-icm-text-faint uppercase tracking-wider mb-1">Latest Eligibility Verification</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-[12px] font-geist">
                  <span className="text-icm-text-dim">Status: <span className="text-icm-text font-semibold">{latestElig.verification_status ?? "—"}</span></span>
                  <span className="text-icm-text-dim">Date: <span className="text-icm-text font-mono">{latestElig.verification_date ?? "—"}</span></span>
                  {latestElig.next_verification_date && (
                    <span className="text-icm-text-dim">Next Due: <span className="text-icm-text font-mono">{latestElig.next_verification_date}</span></span>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* ── Section 5: Clinical / Medical ───────────────────────────── */}
          <Section icon={<HeartPulse className="w-3.5 h-3.5" />} title="Clinical Information">
            <SubHeading>Diagnoses</SubHeading>
            {fsPrimaryDiagnosis ? (
              <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-2.5 mb-2 space-y-1">
                <div>
                  <span className="text-[10px] font-mono font-semibold text-icm-text-faint uppercase tracking-wider">Primary — </span>
                  <span className="text-[11px] font-mono text-icm-accent">{fsPrimaryDiagnosis.icd10_code}</span>
                  <span className="text-[12.5px] text-icm-text ml-1.5">{fsPrimaryDiagnosis.icd10_description}</span>
                </div>
                {fsSecondaryDiagnoses.length > 0 && (
                  <p className="text-[11px] text-icm-text-dim">
                    + {fsSecondaryDiagnoses.length} secondary{" "}
                    {fsSecondaryDiagnoses.length === 1 ? "diagnosis" : "diagnoses"}
                  </p>
                )}
              </div>
            ) : (individual.primary_diagnosis ?? individual.diagnosis) ? (
              <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-2.5 mb-2 space-y-1">
                <div>
                  <span className="text-[10px] font-mono font-semibold text-icm-text-faint uppercase tracking-wider">Primary — </span>
                  <span className="text-[12.5px] text-icm-text">{individual.primary_diagnosis ?? individual.diagnosis}</span>
                </div>
                {individual.icd10_codes && (
                  <p className="text-[11px] font-mono text-icm-text-dim">ICD-10: {individual.icd10_codes}</p>
                )}
                {individual.secondary_diagnoses && (
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-icm-text-faint uppercase tracking-wider">Secondary — </span>
                    <span className="text-[12px] text-icm-text">{individual.secondary_diagnoses}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11.5px] text-amber-700 font-geist">No primary diagnosis recorded.</p>
            )}

            <SubHeading>Medications</SubHeading>
            {fsActiveMeds.length > 0 ? (
              <div className="space-y-1 mb-2">
                {fsActiveMeds.slice(0, 5).map((m) => (
                  <p key={m.id} className="text-[12px] font-geist text-icm-text">
                    <span className="font-semibold">{m.medication_name}</span>
                    {m.brand_name ? ` (${m.brand_name})` : ""}{" "}
                    {m.dosage} — {m.frequency}
                  </p>
                ))}
                {fsActiveMeds.length > 5 && (
                  <p className="text-[11.5px] text-icm-accent font-geist">
                    + {fsActiveMeds.length - 5} more medications
                  </p>
                )}
              </div>
            ) : individual.medications ? (
              <p className="text-[12px] text-icm-text font-geist mb-2">{individual.medications}</p>
            ) : (
              <Empty>No current medications</Empty>
            )}

            <SubHeading>Allergies</SubHeading>
            {fsAllergies.length > 0 ? (
              <div className="space-y-1 mb-3">
                {fsAllergies.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      a.severity === "life-threatening" ? "bg-red-100 text-red-700" :
                      a.severity === "severe"           ? "bg-orange-100 text-orange-700" :
                      a.severity === "moderate"         ? "bg-amber-100 text-amber-700" :
                                                          "bg-gray-100 text-gray-600"
                    }`}>{a.severity.toUpperCase()}</span>
                    <span className="text-[12px] text-icm-text">{a.allergen}: {a.reaction}</span>
                  </div>
                ))}
              </div>
            ) : individual.allergies ? (
              <p className="text-[12px] text-icm-text font-geist mb-3">{individual.allergies}</p>
            ) : (
              <p className="text-[12px] text-green-700 font-geist mb-3">No known allergies</p>
            )}

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Primary Physician" value={individual.primary_physician_name ?? "—"} />
              <Row
                label="Physician Phone"
                value={
                  individual.primary_physician_phone ? (
                    <a href={`tel:${individual.primary_physician_phone}`} className="inline-flex items-center gap-1.5 font-mono text-icm-accent hover:underline">
                      <Phone className="w-3 h-3" /> {individual.primary_physician_phone}
                    </a>
                  ) : "—"
                }
              />
              <Row label="Hospital Preference" value={individual.hospital_preference ?? "—"} />
            </div>
            {individual.medical_notes && (
              <div className="mt-2.5 rounded-lg border border-icm-border bg-icm-bg/40 p-2.5">
                <p className="text-[10.5px] font-mono font-semibold text-icm-text-faint uppercase tracking-wider mb-1">Medical Notes</p>
                <p className="text-[12.5px] text-icm-text font-geist">{individual.medical_notes}</p>
              </div>
            )}
          </Section>

          {/* ── Section 6: Program & Enrollment ────────────────────────── */}
          <Section icon={<Layers className="w-3.5 h-3.5" />} title="Program & Enrollment">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Program"           value={individual.program ?? "—"} />
              <Row label="Program Type"      value={individual.program_type ?? "—"} />
              <Row label="Waiver Type"       value={individual.waiver_type ?? "—"} />
              <Row label="Service Category"  value={individual.service_category ?? "—"} />
              <Row label="Case Number"       value={individual.case_number ?? "—"} mono />
              <Row label="Funding Stream"    value={individual.funding_stream ?? "—"} />
              <Row label="Enrollment Status" value={individual.enrollment_status ?? "—"} />
              <Row label="Admission Date"    value={individual.admission_date ?? "—"} mono />
              <Row label="Referral Date"     value={individual.referral_date ?? "—"} mono />
              <Row label="Referral Source"   value={individual.referral_source ?? "—"} />
              {individual.discharge_date && (
                <Row label="Discharge Date" value={individual.discharge_date} mono />
              )}
            </div>
          </Section>

          {/* ── Section 7: ISP & Care Planning ──────────────────────────── */}
          <Section icon={<BookOpen className="w-3.5 h-3.5" />} title="ISP & Care Planning">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 mb-4">
              <Row label="ISP Due Date"         value={individual.isp_due_date ?? individual.next_isp_date ?? "—"} mono />
              <Row label="Last Annual Plan"     value={individual.last_annual_plan_date ?? "—"} mono />
              <Row label="PCP Due Date"         value={individual.pcp_due_date ?? "—"} mono />
              <Row label="PCP Status"           value={individual.pcp_status ?? "—"} />
              <Row label="Next ISP Date"        value={individual.next_isp_date ?? "—"} mono />
              <Row label="Monitoring Compliance" value={individual.monitoring_compliance_pct ? `${individual.monitoring_compliance_pct}%` : "—"} />
            </div>

            {activePlan && (
              <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-3.5 h-3.5 text-icm-accent" />
                  <p className="text-[10.5px] font-mono font-semibold text-icm-text-faint uppercase tracking-wider">
                    Active Care Plan
                  </p>
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                    activePlan.status === "active" ? "bg-icm-green-soft text-icm-green" : "bg-icm-bg text-icm-text-dim"
                  )}>
                    {activePlan.status}
                  </span>
                </div>
                <p className="text-[13px] font-manrope font-semibold text-icm-text">{activePlan.title}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1.5 text-[11.5px] font-geist text-icm-text-dim">
                  {activePlan.effective_date && <span>Effective: <span className="font-mono text-icm-text">{activePlan.effective_date}</span></span>}
                  {activePlan.review_date && <span>Review: <span className="font-mono text-icm-text">{activePlan.review_date}</span></span>}
                  {activePlan.author_name && <span>Author: {activePlan.author_name}</span>}
                </div>
                {activePlan.goals && activePlan.goals.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10.5px] font-mono font-semibold text-icm-text-faint uppercase tracking-wider">Goals ({activePlan.goals.length})</p>
                    {activePlan.goals.slice(0, 3).map((g, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] font-geist">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                          g.progress === "achieved" ? "bg-icm-green" : g.progress === "in_progress" ? "bg-icm-amber" : "bg-icm-text-faint"
                        )} />
                        <span className="text-icm-text">{g.goal ?? "—"}</span>
                        {g.target_date && <span className="text-icm-text-faint font-mono ml-auto shrink-0">{g.target_date}</span>}
                      </div>
                    ))}
                    {activePlan.goals.length > 3 && (
                      <p className="text-[11px] text-icm-text-faint italic">+{activePlan.goals.length - 3} more goals in eChart</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── Section 8: Service Authorizations ───────────────────────── */}
          <Section icon={<CheckSquare className="w-3.5 h-3.5" />} title="Service Authorizations">
            {serviceAuths.length === 0 ? (
              <Empty>No service authorizations on file.</Empty>
            ) : (
              <div className="space-y-2">
                {serviceAuths.slice(0, 5).map((auth, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-icm-border bg-icm-bg/30 text-[12px] font-geist">
                    <span className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0",
                      auth.status === "active" ? "bg-icm-green-soft text-icm-green" : "bg-icm-bg text-icm-text-dim"
                    )}>
                      {auth.status ?? "—"}
                    </span>
                    <span className="text-icm-text flex-1 truncate font-medium">{auth.service_type ?? auth.program ?? "Service Auth"}</span>
                    <span className="text-icm-text-dim font-mono shrink-0">{auth.start_date ?? "—"} – {auth.end_date ?? "—"}</span>
                    {auth.units_authorized && (
                      <span className="text-icm-text-faint shrink-0">{auth.units_authorized} units</span>
                    )}
                  </div>
                ))}
                {serviceAuths.length > 5 && (
                  <p className="text-[11px] text-icm-text-faint italic pl-1">+{serviceAuths.length - 5} more in eChart</p>
                )}
              </div>
            )}
          </Section>

          {/* ── Section 9: Care Team ─────────────────────────────────────── */}
          <Section icon={<Building2 className="w-3.5 h-3.5" />} title="Care Team & Administrative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              <Row label="Case Manager" value={<AuthorCell name={displayName(individual.assigned_case_manager_name, individual.assigned_case_manager)} size="sm" />} />
              <Row label="Supervisor"   value={<AuthorCell name={displayName(individual.assigned_supervisor_name,  individual.assigned_supervisor)}  size="sm" />} />
              <Row label="Program"      value={individual.program ?? "—"} />
              <Row label="County"       value={individual.county ?? "—"} />
            </div>
          </Section>

          {/* ── Section 10: Recent Activity ─────────────────────────────── */}
          <Section icon={<Activity className="w-3.5 h-3.5" />} title="Recent Activity">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <Stat label="Progress Notes"    value={notes.length} />
              <Stat label="Contact Notes"     value={contacts.length} />
              <Stat label="Visit Summaries"   value={visits.length} />
              <Stat label="Monitoring Forms"  value={monForms.length} />
              <Stat label="Open Tasks"        value={individual.open_tasks ?? 0} />
              <Stat label="Open Incidents"    value={openIncidents} accent={openIncidents > 0 ? "red" : undefined} />
              <Stat label="Referrals"         value={referrals.length} />
              <Stat label="Compliance"        value={individual.monitoring_compliance_pct ? `${individual.monitoring_compliance_pct}%` : "—"} />
            </div>

            <div className="space-y-2">
              {/* Last Progress Note */}
              {lastNote && (
                <ActivityCard
                  icon={<ClipboardList className="w-3.5 h-3.5 text-icm-accent" />}
                  label="Last Progress Note"
                  primary={`${lastNote.progressDate ?? ""} · ${lastNote.activityType ?? ""}`}
                  secondary={`${lastNote.contactType ?? ""} · ${lastNote.status ?? ""}`}
                  detail={lastNote.purposeOfActivity}
                />
              )}

              {/* Last Contact Note */}
              {lastContact && (
                <ActivityCard
                  icon={<MessageSquare className="w-3.5 h-3.5 text-icm-accent" />}
                  label="Last Contact Note"
                  primary={lastContact.date ?? lastContact.contact_date ?? ""}
                  secondary={[lastContact.contact_type, lastContact.purpose].filter(Boolean).join(" · ")}
                  detail={lastContact.summary ?? lastContact.notes}
                />
              )}

              {/* Last Visit */}
              {lastVisit && (
                <ActivityCard
                  icon={<Calendar className="w-3.5 h-3.5 text-icm-accent" />}
                  label="Last Visit Summary"
                  primary={lastVisit.visit_date ?? lastVisit.visitDate ?? ""}
                  secondary={[lastVisit.location, lastVisit.purpose_of_support ?? lastVisit.purposeOfSupport].filter(Boolean).join(" · ")}
                  detail={lastVisit.next_steps}
                />
              )}

              {/* Last Monitoring Form */}
              {lastMonForm && (
                <ActivityCard
                  icon={<Stethoscope className="w-3.5 h-3.5 text-icm-accent" />}
                  label="Last Monitoring Form"
                  primary={`${lastMonForm.type ?? ""} · ${lastMonForm.status ?? ""}`}
                  secondary={lastMonForm.submitted_date ? `Submitted: ${lastMonForm.submitted_date}` : lastMonForm.due_date ? `Due: ${lastMonForm.due_date}` : ""}
                />
              )}

              {/* Last Incident */}
              {lastIncident && (
                <ActivityCard
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-icm-red" />}
                  label="Last Incident Report"
                  primary={`${lastIncident.incident_date ?? ""} · ${lastIncident.classification ?? ""}`}
                  secondary={(lastIncident.incident_types ?? []).join(", ")}
                  detail={lastIncident.description}
                  tone="red"
                />
              )}
            </div>
          </Section>

          {/* ── Section 11: Documents placeholder ──────────────────────── */}
          <Section icon={<FileText className="w-3.5 h-3.5" />} title="Managed Documents">
            <Empty>Documents are maintained in the Managed Documents module within this individual's eChart.</Empty>
          </Section>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <footer className="mt-8 pt-4 border-t border-icm-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] font-mono text-icm-text-faint">
            <span>CaseManagement.AI · Comprehensive Face Sheet</span>
            <span className="font-semibold">CONFIDENTIAL — For authorized use only</span>
            <span>ID #{individual.id.slice(0, 8)} · {new Date().toLocaleDateString()}</span>
          </footer>
        </article>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          aside, nav, header, .print\\:hidden { display: none !important; }
          article { page-break-inside: auto; }
          .org-print-header { display: flex !important; }
        }
      `}</style>
    </ICMShell>
  );
};

// ── Reusable building blocks ────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-icm-accent">{icon}</span>
        <h2 className="text-[11px] uppercase tracking-wider text-icm-text font-mono font-bold">{title}</h2>
        <div className="flex-1 h-px bg-icm-border ml-1" />
      </div>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-mono font-semibold mb-1.5">
      {children}
    </p>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 text-[12.5px] font-geist py-0.5">
      <span className="text-icm-text-faint w-36 shrink-0">{label}</span>
      <span className={cn("text-icm-text flex-1 min-w-0 break-words", mono && "font-mono")}>{value}</span>
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
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg/40 px-2.5 py-2">
      <p className="text-[9.5px] uppercase tracking-wider text-icm-text-faint font-mono leading-tight">{label}</p>
      <p className={cn(
        "text-[15px] font-manrope font-bold mt-0.5 truncate",
        accent === "red"   ? "text-icm-red"
        : accent === "amber" ? "text-icm-amber"
        : accent === "green" ? "text-icm-green"
        : "text-icm-text"
      )}>
        {value}
      </p>
    </div>
  );
}

function ActivityCard({
  icon, label, primary, secondary, detail, tone,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary?: string;
  detail?: string;
  tone?: "red";
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3",
      tone === "red" ? "border-icm-red/30 bg-icm-red-soft/30" : "border-icm-border bg-icm-bg/30"
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-mono font-semibold">{label}</p>
      </div>
      {primary && <p className="text-[12.5px] font-semibold text-icm-text font-geist">{primary}</p>}
      {secondary && <p className="text-[11.5px] text-icm-text-dim font-geist">{secondary}</p>}
      {detail && <p className="text-[11.5px] text-icm-text-dim font-geist mt-1 line-clamp-2">{detail}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-icm-text-dim italic mt-1">{children}</p>;
}

export default PersonFaceSheet;
