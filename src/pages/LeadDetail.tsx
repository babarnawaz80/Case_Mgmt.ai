import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Pencil,
  PlayCircle,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  User2,
  AlertCircle,
  CheckCircle2,
  Download,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getLead,
  formatBytes,
  leadStatusStyles,
  markLeadConverted,
} from "@/data/leads";
import { cn } from "@/lib/utils";

export default function LeadDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lead, setLead] = useState(() => (id ? getLead(id) : undefined));

  const initials = useMemo(() => {
    if (!lead) return "??";
    return ((lead.firstName[0] ?? "?") + (lead.lastName[0] ?? "")).toUpperCase();
  }, [lead]);

  if (!lead) {
    return (
      <ICMShell title="Lead not found" showAIPanel={false}>
        <Breadcrumbs items={[{ label: "Leads", to: "/leads" }, { label: "Not found" }]} />
        <div className="rounded-xl border border-dashed border-icm-border bg-card p-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-icm-text-dim mb-4">This lead could not be found.</p>
          <Button onClick={() => navigate("/leads")}>Back to Leads</Button>
        </div>
      </ICMShell>
    );
  }

  function startServices() {
    if (!lead) return;
    const personId = `p-lead-${lead.id}`;

    // Persist as a new intake so it shows up in downstream views that read intakes
    try {
      const intakes = JSON.parse(localStorage.getItem("icm.intakes") ?? "[]");
      intakes.unshift({
        id: personId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        dob: lead.dob,
        medicaidId: lead.medicaidId,
        county: lead.county,
        createdAt: new Date().toISOString(),
        source: "Lead conversion",
        leadId: lead.id,
      });
      localStorage.setItem("icm.intakes", JSON.stringify(intakes));
    } catch {
      /* ignore */
    }

    // Audit
    try {
      const audit = JSON.parse(localStorage.getItem("icm.audit") ?? "[]");
      audit.unshift({
        id: `aud-${Date.now()}`,
        ts: new Date().toISOString(),
        actor: lead.assignedTo || "Care Manager",
        action: "Started services — converted lead to active individual",
        target: `${lead.firstName} ${lead.lastName}`,
        category: "create",
        details: `Lead ${lead.id} → caseload (${lead.requestedServices.join(", ") || "services TBD"})`,
      });
      localStorage.setItem("icm.audit", JSON.stringify(audit));
    } catch {
      /* ignore */
    }

    markLeadConverted(lead.id, personId);
    setLead({ ...lead, status: "Converted", convertedToPersonId: personId });

    toast.success(`${lead.firstName} ${lead.lastName} added to your caseload`, {
      description: "Lead converted. Continue intake to finalize enrollment.",
    });

    // Hand off to the full intake wizard to finalize enrollment
    navigate("/people/new");
  }

  const name = `${lead.firstName} ${lead.lastName}`.trim() || "Unnamed lead";
  const age = lead.dob ? calcAge(lead.dob) : null;
  const isConverted = lead.status === "Converted";

  return (
    <ICMShell title={name} showAIPanel={false}>
      <div className="space-y-5 pb-12">
        <Breadcrumbs
          backTo="/leads"
          backLabel="Leads"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Leads", to: "/leads" },
            { label: name },
          ]}
        />

        {/* Header card */}
        <div className="rounded-2xl border border-icm-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-manrope text-2xl font-extrabold text-icm-text tracking-[-0.02em]">
                    {name}
                  </h1>
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-1 rounded-full border",
                      leadStatusStyles[lead.status]
                    )}
                  >
                    {lead.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-x-3 gap-y-1 flex-wrap">
                  {lead.dob && <span>DOB {new Date(lead.dob).toLocaleDateString()}{age !== null && ` · ${age}y`}</span>}
                  {lead.gender && <span>· {genderLabel(lead.gender)}</span>}
                  {lead.county && <span>· {lead.county} County</span>}
                  {lead.medicaidId && <span>· MA {lead.medicaidId}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Referred {new Date(lead.referralDate || lead.createdAt).toLocaleDateString()} by{" "}
                  <span className="text-icm-text font-medium">{lead.referrerName || "—"}</span>
                  {lead.referralOrg && <> · {lead.referralOrg}</>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/leads")}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button variant="outline" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
                <Pencil className="w-4 h-4 mr-1.5" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isConverted}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-60"
                  >
                    <PlayCircle className="w-4 h-4 mr-1.5" />
                    {isConverted ? "Services Started" : "Start Services"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start services for {name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This converts the lead to an <strong>active individual</strong> under
                      your caseload, creates an intake record, and opens the participant
                      intake wizard to finalize enrollment. This action is logged to the
                      audit trail.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={startServices}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Yes, Start Services
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {isConverted && (
            <div className="mt-4 flex items-center gap-2 text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" />
              Services started{lead.convertedAt && ` on ${new Date(lead.convertedAt).toLocaleDateString()}`}.
              {lead.convertedToPersonId && (
                <button
                  onClick={() => navigate("/people")}
                  className="ml-1 underline font-medium"
                >
                  View caseload
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Referral */}
            <Section icon={FileSearch} title="Referral source">
              <Row label="Source" value={lead.referralSource} />
              <Row label="Organization" value={lead.referralOrg} />
              <Row label="Referrer" value={[lead.referrerName, lead.referrerRole].filter(Boolean).join(" · ")} />
              <Row label="Contact" value={[lead.referrerPhone, lead.referrerEmail].filter(Boolean).join(" · ")} />
              <Row label="Referral date" value={lead.referralDate && new Date(lead.referralDate).toLocaleDateString()} />
              <Row label="Reason" value={lead.referralReason} multiline />
            </Section>

            {/* Clinical */}
            <Section icon={Stethoscope} title="Clinical & presenting">
              <Row label="Primary diagnosis" value={lead.primaryDiagnosis} />
              <Row label="Secondary diagnoses" value={lead.secondaryDiagnoses} multiline />
              <Row label="Allergies" value={lead.allergies} multiline />
              <Row label="Current medications" value={lead.currentMedications} multiline />
              <Row label="Current supports" value={lead.currentSupports} multiline />
              <Row label="Presenting concerns" value={lead.presentingConcerns} multiline />
            </Section>

            {/* Services */}
            <Section icon={ClipboardList} title="Services & funding requested">
              <Row
                label="Requested services"
                value={
                  lead.requestedServices.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {lead.requestedServices.map((s) => (
                        <span key={s} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Row label="Desired start date" value={lead.desiredStartDate && new Date(lead.desiredStartDate).toLocaleDateString()} />
              <Row label="Funding source" value={lead.fundingSource} />
              <Row label="Assigned to" value={lead.assignedTo} />
              <Row label="Internal notes" value={lead.notes} multiline />
            </Section>
          </div>

          <div className="space-y-5">
            {/* Demographics */}
            <Section icon={User2} title="Demographics" compact>
              <Row label="Preferred name" value={lead.preferredName} />
              <Row label="Pronouns" value={lead.pronouns} />
              <Row label="Language" value={lead.primaryLanguage + (lead.needsInterpreter ? " · interpreter needed" : "")} />
              <Row label="Race / Ethnicity" value={[lead.race, lead.ethnicity].filter(Boolean).join(" / ")} />
              <Row label="Marital status" value={lead.maritalStatus} />
              <Row label="Medicaid / State ID" value={lead.medicaidId} />
              <Row label="BDDS ID" value={lead.bddsId} />
              <Row label="MRN" value={lead.mrn} />
            </Section>

            {/* Address & contact */}
            <Section icon={MapPin} title="Address & contact" compact>
              <Row
                label="Address"
                value={
                  lead.street
                    ? [
                        lead.street,
                        [lead.city, lead.state].filter(Boolean).join(", "),
                        lead.zip,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : null
                }
              />
              <Row label="Residence" value={lead.residenceType} />
              <Row label="Phone" value={lead.phone} icon={Phone} />
              <Row label="Email" value={lead.email} icon={Mail} />
              <Row label="Preferred contact" value={lead.preferredContact} />
            </Section>

            {/* Guardian / Emergency */}
            <Section icon={ShieldCheck} title="Guardian & emergency" compact>
              {lead.hasGuardian ? (
                <>
                  <Row label="Guardian" value={`${lead.guardianName} (${lead.guardianRelationship})`} />
                  <Row label="Authority" value={lead.guardianAuthority} />
                  <Row label="Phone" value={lead.guardianPhone} />
                  <Row label="Email" value={lead.guardianEmail} />
                </>
              ) : (
                <div className="text-xs text-muted-foreground">No legal guardian on file.</div>
              )}
              {(lead.emergencyName1 || lead.emergencyName2) && (
                <>
                  <div className="h-px bg-icm-border my-2" />
                  {lead.emergencyName1 && (
                    <Row
                      label="Emergency 1"
                      value={`${lead.emergencyName1} (${lead.emergencyRelationship1}) · ${lead.emergencyPhone1}`}
                    />
                  )}
                  {lead.emergencyName2 && (
                    <Row
                      label="Emergency 2"
                      value={`${lead.emergencyName2} (${lead.emergencyRelationship2}) · ${lead.emergencyPhone2}`}
                    />
                  )}
                </>
              )}
            </Section>

            {/* Insurance */}
            <Section icon={ShieldCheck} title="Insurance" compact>
              <Row label="Primary" value={lead.insurancePrimary} />
              <Row label="Primary ID" value={lead.insurancePrimaryId} />
              <Row label="Group #" value={lead.insurancePrimaryGroup} />
              <Row label="Secondary" value={lead.insuranceSecondary} />
              <Row label="Secondary ID" value={lead.insuranceSecondaryId} />
              <Row label="Medicare #" value={lead.medicareNumber} />
            </Section>
          </div>
        </div>

        {/* Documents */}
        <Section icon={FileText} title={`Documents (${lead.documents.length})`}>
          {lead.documents.length === 0 ? (
            <div className="text-xs text-muted-foreground">No documents uploaded yet.</div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lead.documents.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-icm-border bg-card"
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(d.size)} · uploaded {new Date(d.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    title="Download (demo)"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </ICMShell>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={cn("rounded-xl border border-icm-border bg-card shadow-sm", compact ? "p-4" : "p-5")}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-icm-text">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  multiline,
  icon: Icon,
}: {
  label: string;
  value?: React.ReactNode;
  multiline?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const isEmpty =
    value === undefined || value === null || value === "" || (typeof value === "string" && !value.trim());
  return (
    <div className={cn("grid grid-cols-3 gap-3 items-start text-sm")}>
      <div className="text-xs text-muted-foreground pt-0.5">{label}</div>
      <div className={cn("col-span-2 text-icm-text", multiline && "whitespace-pre-wrap")}>
        {isEmpty ? (
          <span className="text-muted-foreground italic text-xs">Not provided</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function genderLabel(g: string) {
  return g === "M" ? "Male" : g === "F" ? "Female" : g === "X" ? "Non-binary" : g;
}
