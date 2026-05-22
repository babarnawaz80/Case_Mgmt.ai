import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  X,
  Save,
  ArrowLeft,
  User2,
  Phone,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import {
  emptyLead,
  getLead,
  saveLead,
  formatBytes,
  REFERRAL_SOURCES,
  REQUESTED_SERVICES,
  FUNDING_SOURCES,
  LEAD_STATUSES,
  type Lead,
  type LeadDocument,
} from "@/data/leads";

const COUNTIES = [
  "Adams","Allen","Bartholomew","Boone","Brown","Carroll","Clark","Clay","Clinton",
  "Dearborn","Delaware","Elkhart","Fayette","Floyd","Fulton","Grant","Hamilton","Hancock",
  "Hendricks","Henry","Howard","Jackson","Jasper","Jefferson","Johnson","Knox","Kosciusko",
  "Lake","La Porte","Madison","Marion","Marshall","Miami","Monroe","Montgomery","Morgan",
  "Noble","Owen","Parke","Porter","Putnam","Randolph","Ripley","Rush","Scott","Shelby",
  "St. Joseph","Steuben","Tippecanoe","Vanderburgh","Vermillion","Vigo","Wabash","Warrick",
  "Washington","Wayne","Wells","White","Whitley",
];

export default function LeadForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [lead, setLead] = useState<Lead>(() => {
    if (id) {
      const found = getLead(id);
      if (found) return found;
    }
    return emptyLead();
  });

  useEffect(() => {
    if (id) {
      const found = getLead(id);
      if (found) setLead(found);
    }
  }, [id]);

  function update<K extends keyof Lead>(key: K, value: Lead[K]) {
    setLead((l) => ({ ...l, [key]: value }));
  }

  function toggleService(s: string) {
    setLead((l) => ({
      ...l,
      requestedServices: l.requestedServices.includes(s)
        ? l.requestedServices.filter((x) => x !== s)
        : [...l.requestedServices, s],
    }));
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    const next: LeadDocument[] = Array.from(files).map((f) => ({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
    }));
    setLead((l) => ({ ...l, documents: [...next, ...l.documents] }));
  }

  function removeDoc(docId: string) {
    setLead((l) => ({ ...l, documents: l.documents.filter((d) => d.id !== docId) }));
  }

  const canSave = useMemo(
    () => Boolean(lead.firstName && lead.lastName && lead.referralSource),
    [lead.firstName, lead.lastName, lead.referralSource]
  );

  function onSave() {
    if (!canSave) {
      toast.error("Missing required fields", {
        description: "First name, last name, and referral source are required.",
      });
      return;
    }
    const saved = saveLead(lead);
    toast.success(isEdit ? "Lead updated" : "Lead saved", {
      description: `${saved.firstName} ${saved.lastName} · ${saved.status}`,
    });
    navigate(`/leads/${saved.id}`);
  }

  return (
    <ICMShell title={isEdit ? "Edit Lead" : "New Lead"} showAIPanel={false}>
      <div className="space-y-5 max-w-5xl mx-auto pb-12">
        <Breadcrumbs
          backTo="/leads"
          backLabel="Leads"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Leads", to: "/leads" },
            { label: isEdit ? "Edit Lead" : "New Lead" },
          ]}
        />

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              {isEdit ? "Edit Lead" : "New Lead"}
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Capture the inbound referral and the prospective individual's full
              profile. Required fields are marked
              <span className="text-destructive"> *</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/leads")}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button onClick={onSave} disabled={!canSave}>
              <Save className="w-4 h-4 mr-1.5" /> Save Lead
            </Button>
          </div>
        </div>

        {/* Referral source */}
        <Card icon={FileSearch} title="Referral source" subtitle="Where this lead came from">
          <Grid>
            <Field label="Referral source" required>
              <Select value={lead.referralSource} onValueChange={(v) => update("referralSource", v)}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Referring organization">
              <Input value={lead.referralOrg} onChange={(e) => update("referralOrg", e.target.value)} />
            </Field>
            <Field label="Referrer name">
              <Input value={lead.referrerName} onChange={(e) => update("referrerName", e.target.value)} />
            </Field>
            <Field label="Referrer role / title">
              <Input value={lead.referrerRole} onChange={(e) => update("referrerRole", e.target.value)} />
            </Field>
            <Field label="Referrer phone">
              <Input value={lead.referrerPhone} onChange={(e) => update("referrerPhone", e.target.value)} />
            </Field>
            <Field label="Referrer email">
              <Input type="email" value={lead.referrerEmail} onChange={(e) => update("referrerEmail", e.target.value)} />
            </Field>
            <Field label="Referral date">
              <Input type="date" value={lead.referralDate} onChange={(e) => update("referralDate", e.target.value)} />
            </Field>
            <Field label="Lead status">
              <Select value={lead.status} onValueChange={(v) => update("status", v as Lead["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reason for referral" full>
              <Textarea
                rows={3}
                value={lead.referralReason}
                onChange={(e) => update("referralReason", e.target.value)}
                placeholder="Why is this individual being referred? Any urgency?"
              />
            </Field>
          </Grid>
        </Card>

        {/* Demographics */}
        <Card icon={User2} title="Individual demographics" subtitle="Same fields as the individual profile">
          <Grid>
            <Field label="First name" required>
              <Input value={lead.firstName} onChange={(e) => update("firstName", e.target.value)} />
            </Field>
            <Field label="Middle name">
              <Input value={lead.middleName} onChange={(e) => update("middleName", e.target.value)} />
            </Field>
            <Field label="Last name" required>
              <Input value={lead.lastName} onChange={(e) => update("lastName", e.target.value)} />
            </Field>
            <Field label="Preferred name">
              <Input value={lead.preferredName} onChange={(e) => update("preferredName", e.target.value)} />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={lead.dob} onChange={(e) => update("dob", e.target.value)} />
            </Field>
            <Field label="Gender">
              <Select value={lead.gender} onValueChange={(v) => update("gender", v as Lead["gender"])}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="X">Non-binary / Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pronouns">
              <Input value={lead.pronouns} onChange={(e) => update("pronouns", e.target.value)} />
            </Field>
            <Field label="Primary language">
              <Input value={lead.primaryLanguage} onChange={(e) => update("primaryLanguage", e.target.value)} />
            </Field>
            <Field label="Race">
              <Input value={lead.race} onChange={(e) => update("race", e.target.value)} />
            </Field>
            <Field label="Ethnicity">
              <Input value={lead.ethnicity} onChange={(e) => update("ethnicity", e.target.value)} />
            </Field>
            <Field label="Marital status">
              <Input value={lead.maritalStatus} onChange={(e) => update("maritalStatus", e.target.value)} />
            </Field>
            <Field label="Needs interpreter">
              <label className="flex items-center gap-2 h-10">
                <Checkbox
                  checked={lead.needsInterpreter}
                  onCheckedChange={(v) => update("needsInterpreter", Boolean(v))}
                />
                <span className="text-sm text-icm-text-dim">Interpreter required</span>
              </label>
            </Field>
          </Grid>
        </Card>

        {/* Identifiers + Address + Contact */}
        <Card icon={Phone} title="Identifiers, address & contact">
          <Grid>
            <Field label="Medicaid / State ID">
              <Input value={lead.medicaidId} onChange={(e) => update("medicaidId", e.target.value)} />
            </Field>
            <Field label="SSN (last 4)">
              <Input value={lead.ssnLast4} onChange={(e) => update("ssnLast4", e.target.value)} maxLength={4} />
            </Field>
            <Field label="BDDS ID">
              <Input value={lead.bddsId} onChange={(e) => update("bddsId", e.target.value)} />
            </Field>
            <Field label="MRN">
              <Input value={lead.mrn} onChange={(e) => update("mrn", e.target.value)} />
            </Field>
            <Field label="Street" full>
              <Input value={lead.street} onChange={(e) => update("street", e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={lead.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="State">
              <Input value={lead.state} onChange={(e) => update("state", e.target.value)} maxLength={2} />
            </Field>
            <Field label="ZIP">
              <Input value={lead.zip} onChange={(e) => update("zip", e.target.value)} />
            </Field>
            <Field label="County">
              <Select value={lead.county} onValueChange={(v) => update("county", v)}>
                <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Residence type">
              <Input value={lead.residenceType} onChange={(e) => update("residenceType", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={lead.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={lead.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Preferred contact">
              <Select value={lead.preferredContact} onValueChange={(v) => update("preferredContact", v as Lead["preferredContact"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="mail">Mail</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Grid>
        </Card>

        {/* Guardian + Emergency */}
        <Card icon={ShieldCheck} title="Guardian & emergency contacts">
          <label className="flex items-center gap-2 mb-3">
            <Checkbox checked={lead.hasGuardian} onCheckedChange={(v) => update("hasGuardian", Boolean(v))} />
            <span className="text-sm">Individual has a legal guardian / POA</span>
          </label>
          {lead.hasGuardian && (
            <Grid>
              <Field label="Guardian name">
                <Input value={lead.guardianName} onChange={(e) => update("guardianName", e.target.value)} />
              </Field>
              <Field label="Relationship">
                <Input value={lead.guardianRelationship} onChange={(e) => update("guardianRelationship", e.target.value)} />
              </Field>
              <Field label="Authority">
                <Input value={lead.guardianAuthority} onChange={(e) => update("guardianAuthority", e.target.value)} placeholder="Plenary, Healthcare POA, etc." />
              </Field>
              <Field label="Guardian phone">
                <Input value={lead.guardianPhone} onChange={(e) => update("guardianPhone", e.target.value)} />
              </Field>
              <Field label="Guardian email" full>
                <Input type="email" value={lead.guardianEmail} onChange={(e) => update("guardianEmail", e.target.value)} />
              </Field>
            </Grid>
          )}
          <div className="h-px bg-icm-border my-4" />
          <Grid>
            <Field label="Emergency contact 1 — name">
              <Input value={lead.emergencyName1} onChange={(e) => update("emergencyName1", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={lead.emergencyPhone1} onChange={(e) => update("emergencyPhone1", e.target.value)} />
            </Field>
            <Field label="Relationship">
              <Input value={lead.emergencyRelationship1} onChange={(e) => update("emergencyRelationship1", e.target.value)} />
            </Field>
            <Field label="Emergency contact 2 — name">
              <Input value={lead.emergencyName2} onChange={(e) => update("emergencyName2", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={lead.emergencyPhone2} onChange={(e) => update("emergencyPhone2", e.target.value)} />
            </Field>
            <Field label="Relationship">
              <Input value={lead.emergencyRelationship2} onChange={(e) => update("emergencyRelationship2", e.target.value)} />
            </Field>
          </Grid>
        </Card>

        {/* Insurance */}
        <Card icon={ShieldCheck} title="Insurance">
          <Grid>
            <Field label="Primary insurance">
              <Input value={lead.insurancePrimary} onChange={(e) => update("insurancePrimary", e.target.value)} />
            </Field>
            <Field label="Primary policy / ID">
              <Input value={lead.insurancePrimaryId} onChange={(e) => update("insurancePrimaryId", e.target.value)} />
            </Field>
            <Field label="Group #">
              <Input value={lead.insurancePrimaryGroup} onChange={(e) => update("insurancePrimaryGroup", e.target.value)} />
            </Field>
            <Field label="Secondary insurance">
              <Input value={lead.insuranceSecondary} onChange={(e) => update("insuranceSecondary", e.target.value)} />
            </Field>
            <Field label="Secondary ID">
              <Input value={lead.insuranceSecondaryId} onChange={(e) => update("insuranceSecondaryId", e.target.value)} />
            </Field>
            <Field label="Medicare number">
              <Input value={lead.medicareNumber} onChange={(e) => update("medicareNumber", e.target.value)} />
            </Field>
          </Grid>
        </Card>

        {/* Clinical */}
        <Card icon={Stethoscope} title="Clinical & presenting concerns">
          <Grid>
            <Field label="Primary diagnosis" full>
              <Input value={lead.primaryDiagnosis} onChange={(e) => update("primaryDiagnosis", e.target.value)} />
            </Field>
            <Field label="Secondary diagnoses" full>
              <Textarea rows={2} value={lead.secondaryDiagnoses} onChange={(e) => update("secondaryDiagnoses", e.target.value)} />
            </Field>
            <Field label="Allergies" full>
              <Textarea rows={2} value={lead.allergies} onChange={(e) => update("allergies", e.target.value)} />
            </Field>
            <Field label="Current medications" full>
              <Textarea rows={3} value={lead.currentMedications} onChange={(e) => update("currentMedications", e.target.value)} />
            </Field>
            <Field label="Current supports & services" full>
              <Textarea rows={3} value={lead.currentSupports} onChange={(e) => update("currentSupports", e.target.value)} />
            </Field>
            <Field label="Presenting concerns / needs" full>
              <Textarea rows={4} value={lead.presentingConcerns} onChange={(e) => update("presentingConcerns", e.target.value)} />
            </Field>
          </Grid>
        </Card>

        {/* Services requested */}
        <Card icon={ClipboardList} title="Services & funding requested">
          <div className="space-y-3">
            <Label className="text-xs font-medium text-icm-text-dim">Requested services</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {REQUESTED_SERVICES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-icm-border cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={lead.requestedServices.includes(s)}
                    onCheckedChange={() => toggleService(s)}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <Grid className="mt-4">
            <Field label="Desired start date">
              <Input type="date" value={lead.desiredStartDate} onChange={(e) => update("desiredStartDate", e.target.value)} />
            </Field>
            <Field label="Funding source">
              <Select value={lead.fundingSource} onValueChange={(v) => update("fundingSource", v)}>
                <SelectTrigger><SelectValue placeholder="Select funding" /></SelectTrigger>
                <SelectContent>
                  {FUNDING_SOURCES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assigned to">
              <Input value={lead.assignedTo} onChange={(e) => update("assignedTo", e.target.value)} />
            </Field>
            <Field label="Internal notes" full>
              <Textarea rows={3} value={lead.notes} onChange={(e) => update("notes", e.target.value)} />
            </Field>
          </Grid>
        </Card>

        {/* Documents */}
        <Card icon={FileText} title="Supporting documents" subtitle="Discharge summaries, referrals, IDs, eligibility letters, etc.">
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-icm-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <div className="text-sm font-medium">Click to upload or drag files here</div>
            <div className="text-xs text-muted-foreground">
              PDF, JPG, PNG, DOCX — multiple files supported
            </div>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
          {lead.documents.length > 0 && (
            <ul className="mt-4 space-y-2">
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
                      {formatBytes(d.size)} · {new Date(d.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDoc(d.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Sticky save */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/leads")}>Cancel</Button>
          <Button onClick={onSave} disabled={!canSave}>
            <Save className="w-4 h-4 mr-1.5" /> Save Lead
          </Button>
        </div>
      </div>
    </ICMShell>
  );
}

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-icm-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-icm-text">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Grid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>{children}</div>;
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2 lg:col-span-3" : ""}>
      <Label className="text-xs font-medium text-icm-text-dim mb-1.5 block">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
