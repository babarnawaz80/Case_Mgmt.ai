import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  User2,
  IdCard,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  Stethoscope,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const INDIANA_COUNTIES = [
  "Adams","Allen","Bartholomew","Benton","Blackford","Boone","Brown","Carroll","Cass","Clark",
  "Clay","Clinton","Crawford","Daviess","Dearborn","Decatur","DeKalb","Delaware","Dubois","Elkhart",
  "Fayette","Floyd","Fountain","Franklin","Fulton","Gibson","Grant","Greene","Hamilton","Hancock",
  "Harrison","Hendricks","Henry","Howard","Huntington","Jackson","Jasper","Jay","Jefferson","Jennings",
  "Johnson","Knox","Kosciusko","LaGrange","Lake","LaPorte","Lawrence","Madison","Marion","Marshall",
  "Martin","Miami","Monroe","Montgomery","Morgan","Newton","Noble","Ohio","Orange","Owen",
  "Parke","Perry","Pike","Porter","Posey","Pulaski","Putnam","Randolph","Ripley","Rush",
  "St. Joseph","Scott","Shelby","Spencer","Starke","Steuben","Sullivan","Switzerland","Tippecanoe","Tipton",
  "Union","Vanderburgh","Vermillion","Vigo","Wabash","Warren","Warrick","Washington","Wayne","Wells",
  "White","Whitley",
];

const BDDS_DISTRICTS = [
  "District 1 - Gary","District 2 - South Bend","District 3 - Fort Wayne","District 4 - Lafayette",
  "District 5 - Indianapolis","District 6 - Richmond","District 7 - Bloomington","District 8 - Evansville",
];

const WAIVERS = [
  { id: "cih", label: "Community Integration & Habilitation (CIH) Waiver" },
  { id: "fsw", label: "Family Supports Waiver (FSW)" },
  { id: "pathways", label: "PathWays for Aging Waiver" },
  { id: "h&w", label: "Indiana Health Coverage Programs (IHCP)" },
  { id: "tcm", label: "BDDS Targeted Case Management" },
];

const STEPS = [
  { key: "demographics", label: "Demographics", icon: User2 },
  { key: "identifiers", label: "Identifiers", icon: IdCard },
  { key: "address", label: "Address & County", icon: MapPin },
  { key: "contact", label: "Contact & Guardian", icon: Phone },
  { key: "consent", label: "Consent & Emergency", icon: ShieldCheck },
  { key: "eligibility", label: "Program Eligibility", icon: Stethoscope },
  { key: "indiana", label: "Indiana-Specific", icon: FileText },
  { key: "review", label: "Review & Submit", icon: CheckCircle2 },
] as const;

interface IntakeData {
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  dob: string;
  gender: "M" | "F" | "X" | "";
  pronouns: string;
  primaryLanguage: string;
  needsInterpreter: boolean;
  race: string;
  ethnicity: string;
  maritalStatus: string;

  medicaidId: string;
  ssnLast4: string;
  bddsId: string;
  mrn: string;

  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  residenceType: string;

  phone: string;
  email: string;
  preferredContact: "phone" | "email" | "text" | "mail" | "";

  hasGuardian: boolean;
  guardianName: string;
  guardianRelationship: string;
  guardianAuthority: string;
  guardianPhone: string;
  guardianEmail: string;

  consentHIPAA: boolean;
  consentServices: boolean;
  consentPhoto: boolean;
  consentInfoSharing: boolean;
  consentSignedDate: string;

  emergencyName1: string;
  emergencyPhone1: string;
  emergencyRelationship1: string;
  emergencyName2: string;
  emergencyPhone2: string;
  emergencyRelationship2: string;

  eligibilityStatus: "Eligible" | "Pending Review" | "Not Yet Determined" | "";
  primaryDiagnosis: string;
  diagnosisOnsetBefore22: boolean;
  lonScore: string;
  eligibilityLetterFile: string | null;

  waivers: string[];
  waiverEffectiveDate: string;

  bddsDistrict: string;
  assignedBDDSCaseManager: string;
  notes: string;
}

const EMPTY: IntakeData = {
  firstName: "", middleName: "", lastName: "", preferredName: "",
  dob: "", gender: "", pronouns: "", primaryLanguage: "English", needsInterpreter: false,
  race: "", ethnicity: "", maritalStatus: "Single",
  medicaidId: "", ssnLast4: "", bddsId: "", mrn: `MRN-${Math.floor(10000 + Math.random() * 89999)}`,
  street: "", city: "", state: "IN", zip: "", county: "", residenceType: "Family Home",
  phone: "", email: "", preferredContact: "phone",
  hasGuardian: false, guardianName: "", guardianRelationship: "", guardianAuthority: "", guardianPhone: "", guardianEmail: "",
  consentHIPAA: false, consentServices: false, consentPhoto: false, consentInfoSharing: false, consentSignedDate: "",
  emergencyName1: "", emergencyPhone1: "", emergencyRelationship1: "",
  emergencyName2: "", emergencyPhone2: "", emergencyRelationship2: "",
  eligibilityStatus: "", primaryDiagnosis: "", diagnosisOnsetBefore22: false, lonScore: "", eligibilityLetterFile: null,
  waivers: [], waiverEffectiveDate: "",
  bddsDistrict: "", assignedBDDSCaseManager: "", notes: "",
};

export default function NewParticipantIntake() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>(EMPTY);

  function update<K extends keyof IntakeData>(key: K, value: IntakeData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggleWaiver(id: string) {
    setData((d) => ({
      ...d,
      waivers: d.waivers.includes(id) ? d.waivers.filter((w) => w !== id) : [...d.waivers, id],
    }));
  }

  function submit() {
    // Persist for demo
    const stored = JSON.parse(localStorage.getItem("icm.intakes") ?? "[]");
    const id = `new-${Date.now()}`;
    stored.unshift({ id, ...data, createdAt: new Date().toISOString() });
    localStorage.setItem("icm.intakes", JSON.stringify(stored));

    // Write to audit log (best effort — used elsewhere)
    const audit = JSON.parse(localStorage.getItem("icm.audit") ?? "[]");
    audit.unshift({
      id: `aud-${Date.now()}`,
      ts: new Date().toISOString(),
      actor: "Kathy (Care Manager)",
      action: "Created participant intake",
      target: `${data.firstName} ${data.lastName}`,
      category: "edit",
    });
    localStorage.setItem("icm.audit", JSON.stringify(audit));

    toast.success(`${data.firstName} ${data.lastName} enrolled`, {
      description: `MRN ${data.mrn} · ${data.waivers.length} waiver(s) selected`,
    });
    navigate("/people");
  }

  const stepKey = STEPS[step].key;
  const canNext = (() => {
    if (stepKey === "demographics") return data.firstName && data.lastName && data.dob && data.gender;
    if (stepKey === "identifiers") return data.medicaidId.length > 0;
    if (stepKey === "address") return data.street && data.city && data.zip && data.county;
    if (stepKey === "contact") return data.phone || data.email;
    if (stepKey === "consent") return data.consentHIPAA && data.consentServices && data.consentSignedDate;
    if (stepKey === "eligibility") return data.eligibilityStatus && data.waivers.length > 0;
    if (stepKey === "indiana") return data.bddsDistrict;
    return true;
  })();

  return (
    <ICMShell>
      <Breadcrumbs items={[{ label: "People Supported", to: "/people" }, { label: "New Participant Intake" }]} />

      <div className="max-w-5xl mx-auto py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">New Participant Intake</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Indiana BDDS / iCM enrollment — required fields are marked
              <span className="text-destructive"> *</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            AI will draft initial assessment from this intake
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const complete = i < step;
            return (
              <button
                key={s.key}
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  active && "bg-primary text-primary-foreground",
                  complete && "text-primary hover:bg-primary/10",
                  !active && !complete && "text-muted-foreground"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0",
                  active ? "bg-primary-foreground text-primary" :
                  complete ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {complete ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px]">
          {stepKey === "demographics" && (
            <Section title="Demographics">
              <Grid>
                <Field label="First Name" required>
                  <Input value={data.firstName} onChange={(e) => update("firstName", e.target.value)} />
                </Field>
                <Field label="Middle Name">
                  <Input value={data.middleName} onChange={(e) => update("middleName", e.target.value)} />
                </Field>
                <Field label="Last Name" required>
                  <Input value={data.lastName} onChange={(e) => update("lastName", e.target.value)} />
                </Field>
                <Field label="Preferred Name / Nickname">
                  <Input value={data.preferredName} onChange={(e) => update("preferredName", e.target.value)} />
                </Field>
                <Field label="Date of Birth" required>
                  <Input type="date" value={data.dob} onChange={(e) => update("dob", e.target.value)} />
                </Field>
                <Field label="Gender" required>
                  <Select value={data.gender} onValueChange={(v) => update("gender", v as IntakeData["gender"])}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="X">Non-binary / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Pronouns">
                  <Input value={data.pronouns} placeholder="he/him, she/her, they/them" onChange={(e) => update("pronouns", e.target.value)} />
                </Field>
                <Field label="Primary Language">
                  <Input value={data.primaryLanguage} onChange={(e) => update("primaryLanguage", e.target.value)} />
                </Field>
                <Field label="Race">
                  <Select value={data.race} onValueChange={(v) => update("race", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black / African American</SelectItem>
                      <SelectItem value="asian">Asian</SelectItem>
                      <SelectItem value="native">American Indian / Alaska Native</SelectItem>
                      <SelectItem value="pacific">Native Hawaiian / Pacific Islander</SelectItem>
                      <SelectItem value="multi">Two or more races</SelectItem>
                      <SelectItem value="decline">Declined to answer</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Ethnicity">
                  <Select value={data.ethnicity} onValueChange={(v) => update("ethnicity", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hispanic">Hispanic / Latino</SelectItem>
                      <SelectItem value="not-hispanic">Not Hispanic / Latino</SelectItem>
                      <SelectItem value="decline">Declined to answer</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Marital Status">
                  <Select value={data.maritalStatus} onValueChange={(v) => update("maritalStatus", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Single", "Married", "Divorced", "Widowed", "Domestic Partnership"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Grid>
              <div className="flex items-center gap-2 mt-4">
                <Checkbox id="interp" checked={data.needsInterpreter} onCheckedChange={(v) => update("needsInterpreter", Boolean(v))} />
                <Label htmlFor="interp" className="text-sm">Requires interpreter for clinical visits</Label>
              </div>
            </Section>
          )}

          {stepKey === "identifiers" && (
            <Section title="Identifiers">
              <Grid>
                <Field label="Medicaid ID (RID)" required hint="12-digit Recipient ID">
                  <Input value={data.medicaidId} onChange={(e) => update("medicaidId", e.target.value)} maxLength={12} placeholder="100000000000" />
                </Field>
                <Field label="SSN (last 4)" hint="Stored encrypted; only last 4 shown">
                  <Input value={data.ssnLast4} onChange={(e) => update("ssnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
                </Field>
                <Field label="BDDS / State ID" hint="Indiana BDDS participant identifier">
                  <Input value={data.bddsId} onChange={(e) => update("bddsId", e.target.value)} placeholder="BDDS-12345" />
                </Field>
                <Field label="MRN (auto-generated)">
                  <Input value={data.mrn} disabled />
                </Field>
              </Grid>
            </Section>
          )}

          {stepKey === "address" && (
            <Section title="Address & County">
              <Grid>
                <Field label="Street" required colSpan={2}>
                  <Input value={data.street} onChange={(e) => update("street", e.target.value)} />
                </Field>
                <Field label="City" required>
                  <Input value={data.city} onChange={(e) => update("city", e.target.value)} />
                </Field>
                <Field label="State">
                  <Input value={data.state} onChange={(e) => update("state", e.target.value)} />
                </Field>
                <Field label="ZIP" required>
                  <Input value={data.zip} onChange={(e) => update("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} />
                </Field>
                <Field label="County" required hint="Indiana county of residence">
                  <Select value={data.county} onValueChange={(v) => update("county", v)}>
                    <SelectTrigger><SelectValue placeholder="Select county…" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {INDIANA_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Residence Type" colSpan={2}>
                  <Select value={data.residenceType} onValueChange={(v) => update("residenceType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Family Home", "Own Home / Apartment", "Group Home / Waiver Home", "Supported Living", "ICF/IID", "Other"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Grid>
            </Section>
          )}

          {stepKey === "contact" && (
            <Section title="Contact Preferences & Guardian">
              <Grid>
                <Field label="Phone" hint="Mobile preferred">
                  <Input value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(317) 555-0100" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} />
                </Field>
                <Field label="Preferred contact method" colSpan={2}>
                  <RadioGroup
                    value={data.preferredContact}
                    onValueChange={(v) => update("preferredContact", v as IntakeData["preferredContact"])}
                    className="flex gap-4 flex-wrap"
                  >
                    {["phone", "email", "text", "mail"].map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <RadioGroupItem id={`pc-${m}`} value={m} />
                        <Label htmlFor={`pc-${m}`} className="capitalize text-sm">{m}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </Field>
              </Grid>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox id="has-guardian" checked={data.hasGuardian} onCheckedChange={(v) => update("hasGuardian", Boolean(v))} />
                  <Label htmlFor="has-guardian" className="text-sm font-medium">
                    Participant has a guardian, legal representative, or authorized representative
                  </Label>
                </div>
                {data.hasGuardian && (
                  <Grid>
                    <Field label="Guardian / Rep Name">
                      <Input value={data.guardianName} onChange={(e) => update("guardianName", e.target.value)} />
                    </Field>
                    <Field label="Relationship">
                      <Select value={data.guardianRelationship} onValueChange={(v) => update("guardianRelationship", v)}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {["Parent","Spouse","Sibling","Child","Court-appointed guardian","Power of Attorney","Authorized Rep","Other"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Legal Authority">
                      <Select value={data.guardianAuthority} onValueChange={(v) => update("guardianAuthority", v)}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {["Full Guardianship","Limited Guardianship","Healthcare POA","Financial POA","Informal / no legal authority"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Phone">
                      <Input value={data.guardianPhone} onChange={(e) => update("guardianPhone", e.target.value)} />
                    </Field>
                    <Field label="Email" colSpan={2}>
                      <Input type="email" value={data.guardianEmail} onChange={(e) => update("guardianEmail", e.target.value)} />
                    </Field>
                  </Grid>
                )}
              </div>
            </Section>
          )}

          {stepKey === "consent" && (
            <Section title="Consent Status & Emergency Contacts">
              <div className="space-y-2">
                <ConsentRow checked={data.consentHIPAA} onCheck={(v) => update("consentHIPAA", v)}
                  label="HIPAA Notice of Privacy Practices acknowledged" required />
                <ConsentRow checked={data.consentServices} onCheck={(v) => update("consentServices", v)}
                  label="Consent to receive Medicaid waiver services" required />
                <ConsentRow checked={data.consentInfoSharing} onCheck={(v) => update("consentInfoSharing", v)}
                  label="Consent to share information with treating providers" />
                <ConsentRow checked={data.consentPhoto} onCheck={(v) => update("consentPhoto", v)}
                  label="Photo / media release" />
              </div>
              <div className="mt-4 max-w-xs">
                <Field label="Consent signed date" required>
                  <Input type="date" value={data.consentSignedDate} onChange={(e) => update("consentSignedDate", e.target.value)} />
                </Field>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold mb-3">Emergency Contacts</h3>
                <div className="space-y-4">
                  <EmergencyContact
                    n={1}
                    name={data.emergencyName1} phone={data.emergencyPhone1} rel={data.emergencyRelationship1}
                    onChange={(k, v) => {
                      if (k === "name") update("emergencyName1", v);
                      if (k === "phone") update("emergencyPhone1", v);
                      if (k === "rel") update("emergencyRelationship1", v);
                    }}
                  />
                  <EmergencyContact
                    n={2}
                    name={data.emergencyName2} phone={data.emergencyPhone2} rel={data.emergencyRelationship2}
                    onChange={(k, v) => {
                      if (k === "name") update("emergencyName2", v);
                      if (k === "phone") update("emergencyPhone2", v);
                      if (k === "rel") update("emergencyRelationship2", v);
                    }}
                  />
                </div>
              </div>
            </Section>
          )}

          {stepKey === "eligibility" && (
            <Section title="Program Eligibility & Waiver Enrollment">
              <Grid>
                <Field label="Eligibility Status" required>
                  <Select value={data.eligibilityStatus} onValueChange={(v) => update("eligibilityStatus", v as IntakeData["eligibilityStatus"])}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Eligible">Eligible</SelectItem>
                      <SelectItem value="Pending Review">Pending Review</SelectItem>
                      <SelectItem value="Not Yet Determined">Not Yet Determined</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Primary Diagnosis (ICD-10)">
                  <Input value={data.primaryDiagnosis} placeholder="e.g. F71.0 Moderate ID" onChange={(e) => update("primaryDiagnosis", e.target.value)} />
                </Field>
                <Field label="LON / Level of Need score" hint="Indiana ICAP/LON">
                  <Input value={data.lonScore} placeholder="LON 4" onChange={(e) => update("lonScore", e.target.value)} />
                </Field>
                <Field label="Waiver Effective Date">
                  <Input type="date" value={data.waiverEffectiveDate} onChange={(e) => update("waiverEffectiveDate", e.target.value)} />
                </Field>
              </Grid>

              <div className="flex items-center gap-2 mt-2">
                <Checkbox id="onset" checked={data.diagnosisOnsetBefore22} onCheckedChange={(v) => update("diagnosisOnsetBefore22", Boolean(v))} />
                <Label htmlFor="onset" className="text-sm">
                  Diagnosis onset documented before age 22 (DD eligibility requirement)
                </Label>
              </div>

              <div className="mt-6">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Waiver / Program Enrollment <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {WAIVERS.map((w) => {
                    const on = data.waivers.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWaiver(w.id)}
                        className={cn(
                          "flex items-start gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors",
                          on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0",
                          on ? "bg-primary border-primary" : "border-border"
                        )}>
                          {on && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm">{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Eligibility Letter / Supporting Documents
                </Label>
                <label className="mt-2 flex items-center gap-3 px-4 py-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {data.eligibilityLetterFile ?? "Upload eligibility letter (PDF, JPG)"}
                    </p>
                    <p className="text-xs text-muted-foreground">Demo only — file metadata stored locally</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => update("eligibilityLetterFile", e.target.files?.[0]?.name ?? null)}
                  />
                </label>
              </div>
            </Section>
          )}

          {stepKey === "indiana" && (
            <Section title="Indiana-Specific Fields">
              <Grid>
                <Field label="BDDS District" required>
                  <Select value={data.bddsDistrict} onValueChange={(v) => update("bddsDistrict", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {BDDS_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Assigned BDDS Service Coordinator">
                  <Input value={data.assignedBDDSCaseManager} onChange={(e) => update("assignedBDDSCaseManager", e.target.value)} placeholder="e.g. Jennie Thollander" />
                </Field>
                <Field label="Intake notes / additional context" colSpan={2}>
                  <Textarea rows={4} value={data.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything else the supervisor or AI should know…" />
                </Field>
              </Grid>
            </Section>
          )}

          {stepKey === "review" && (
            <Section title="Review & Submit">
              <p className="text-sm text-muted-foreground mb-4">
                Please verify the information below. Submitting creates the participant record, opens the assessment workflow, and writes an audit entry.
              </p>
              <ReviewBlock title="Demographics">
                <KV k="Name" v={`${data.firstName} ${data.middleName} ${data.lastName}`} />
                <KV k="DOB" v={data.dob} />
                <KV k="Gender" v={data.gender} />
                <KV k="Language" v={`${data.primaryLanguage}${data.needsInterpreter ? " (interpreter required)" : ""}`} />
              </ReviewBlock>
              <ReviewBlock title="Identifiers">
                <KV k="Medicaid ID" v={data.medicaidId} />
                <KV k="BDDS ID" v={data.bddsId || "—"} />
                <KV k="MRN" v={data.mrn} />
              </ReviewBlock>
              <ReviewBlock title="Address">
                <KV k="Street" v={data.street} />
                <KV k="City / State / ZIP" v={`${data.city}, ${data.state} ${data.zip}`} />
                <KV k="County" v={data.county} />
              </ReviewBlock>
              <ReviewBlock title="Consent">
                <KV k="HIPAA" v={data.consentHIPAA ? "Acknowledged" : "—"} />
                <KV k="Services" v={data.consentServices ? "Granted" : "—"} />
                <KV k="Signed" v={data.consentSignedDate} />
              </ReviewBlock>
              <ReviewBlock title="Eligibility & Waivers">
                <KV k="Status" v={data.eligibilityStatus} />
                <KV k="Waivers" v={data.waivers.map((id) => WAIVERS.find((w) => w.id === id)?.label).filter(Boolean).join(", ") || "—"} />
                <KV k="LON" v={data.lonScore || "—"} />
                <KV k="Eligibility doc" v={data.eligibilityLetterFile ?? "Not uploaded"} />
              </ReviewBlock>
              <ReviewBlock title="Indiana">
                <KV k="BDDS District" v={data.bddsDistrict} />
                <KV k="BDDS Coordinator" v={data.assignedBDDSCaseManager || "—"} />
              </ReviewBlock>
            </Section>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? navigate("/people") : setStep(step - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <div className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} className="bg-gradient-to-r from-primary to-icm-accent">
              <Check className="w-4 h-4 mr-1" />
              Submit Intake
            </Button>
          )}
        </div>
      </div>
    </ICMShell>
  );
}

/* ---------- helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label, required, hint, colSpan = 1, children,
}: { label: string; required?: boolean; hint?: string; colSpan?: 1 | 2; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", colSpan === 2 && "md:col-span-2")}>
      <Label className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ConsentRow({ checked, onCheck, label, required }: { checked: boolean; onCheck: (v: boolean) => void; label: string; required?: boolean }) {
  return (
    <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheck(Boolean(v))} />
      <span className="text-sm flex-1">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
    </label>
  );
}

function EmergencyContact({ n, name, phone, rel, onChange }: { n: number; name: string; phone: string; rel: string; onChange: (k: "name" | "phone" | "rel", v: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-muted/20">
      <Field label={`Contact ${n} — Name`}>
        <Input value={name} onChange={(e) => onChange("name", e.target.value)} />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => onChange("phone", e.target.value)} />
      </Field>
      <Field label="Relationship">
        <Input value={rel} onChange={(e) => onChange("rel", e.target.value)} placeholder="Mother, Brother, Friend…" />
      </Field>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">{children}</dl>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground font-medium text-right truncate">{v || "—"}</dd>
    </div>
  );
}
