import { useMemo, useState } from "react";
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
  Stethoscope,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { people as SEED_PEOPLE } from "@/data/people";

const COUNTIES = [
  "Adams","Allen","Bartholomew","Benton","Blackford","Boone","Brown","Carroll","Cass","Clark",
  "Clay","Clinton","Crawford","Daviess","Dearborn","Decatur","DeKalb","Delaware","Dubois","Elkhart",
  "Fayette","Floyd","Fountain","Franklin","Fulton","Gibson","Grant","Greene","Hamilton","Hancock",
  "Harrison","Hendricks","Henry","Howard","Huntington","Jackson","Jasper","Jay","Jefferson","Jennings",
  "Johnson","Knox","Kosciusko","Lake","Lawrence","Madison","Marion","Marshall",
  "Martin","Miami","Monroe","Montgomery","Morgan","Newton","Noble","Ohio","Orange","Owen",
  "Parke","Perry","Pike","Porter","Posey","Pulaski","Putnam","Randolph","Ripley","Rush",
  "Scott","Shelby","Spencer","Starke","Steuben","Sullivan","Tippecanoe","Tipton",
  "Union","Vermillion","Vigo","Wabash","Warren","Warrick","Washington","Wayne","Wells",
  "White","Whitley",
];

const PROGRAM_REGIONS = [
  "Region 1 - Northwest", "Region 2 - North Central", "Region 3 - Northeast",
  "Region 4 - West Central", "Region 5 - Central / Metro", "Region 6 - East",
  "Region 7 - South Central", "Region 8 - Southwest",
];

const PROGRAMS = [
  { id: "hcbs-community", label: "HCBS Community Integration Waiver" },
  { id: "hcbs-family", label: "HCBS Family Supports Waiver" },
  { id: "aging", label: "Aging & Disability Waiver (PathWays)" },
  { id: "state-plan", label: "State Plan Medicaid" },
  { id: "tcm", label: "Targeted Case Management" },
];

const SERVICE_LINES = [
  "Targeted Case Management",
  "Community Integration & Habilitation",
  "Family Supports",
  "Behavioral Health",
  "Aging & Long-Term Services",
  "Children's Services",
];

const MONITORING_SCHEDULES = [
  { id: "monthly", label: "Monthly contact (state minimum)" },
  { id: "quarterly-visit", label: "Quarterly in-home visit" },
  { id: "biannual-review", label: "Semi-annual plan review" },
  { id: "annual-recert", label: "Annual recertification" },
];

const STAFF = {
  coordinators: [
    "Kathy Reynolds (Care Manager)",
    "Marcus Lee (Care Manager)",
    "Priya Shah (Care Manager)",
    "James O'Connor (Care Manager)",
  ],
  supervisors: [
    "Diane Carter (Supervisor)",
    "Robert Nguyen (Supervisor)",
    "Elena Vasquez (Regional Supervisor)",
  ],
};

const STEPS = [
  { key: "demographics", label: "Demographics", icon: User2 },
  { key: "identifiers", label: "Identifiers", icon: IdCard },
  { key: "address", label: "Address & County", icon: MapPin },
  { key: "contact", label: "Contact & Guardian", icon: Phone },
  { key: "consent", label: "Consent & Emergency", icon: ShieldCheck },
  { key: "eligibility", label: "Program Eligibility", icon: Stethoscope },
  { key: "enrollment", label: "Program Enrollment", icon: ClipboardList },
  { key: "review", label: "Review & Tasks", icon: CheckCircle2 },
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

  programs: string[];
  waiverEffectiveDate: string;

  // Enrollment (6.2)
  programStartDate: string;
  supportCoordinator: string;
  supervisor: string;
  serviceLine: string;
  authorizationNumber: string;
  monitoringSchedules: string[];
  programRegion: string;
  notes: string;
  duplicateAcknowledged: boolean;
}

const EMPTY: IntakeData = {
  firstName: "", middleName: "", lastName: "", preferredName: "",
  dob: "", gender: "", pronouns: "", primaryLanguage: "English", needsInterpreter: false,
  race: "", ethnicity: "", maritalStatus: "Single",
  medicaidId: "", ssnLast4: "", bddsId: "", mrn: `MRN-${Math.floor(10000 + Math.random() * 89999)}`,
  street: "", city: "", state: "", zip: "", county: "", residenceType: "Family Home",
  phone: "", email: "", preferredContact: "phone",
  hasGuardian: false, guardianName: "", guardianRelationship: "", guardianAuthority: "", guardianPhone: "", guardianEmail: "",
  consentHIPAA: false, consentServices: false, consentPhoto: false, consentInfoSharing: false, consentSignedDate: "",
  emergencyName1: "", emergencyPhone1: "", emergencyRelationship1: "",
  emergencyName2: "", emergencyPhone2: "", emergencyRelationship2: "",
  eligibilityStatus: "", primaryDiagnosis: "", diagnosisOnsetBefore22: false, lonScore: "", eligibilityLetterFile: null,
  programs: [], waiverEffectiveDate: "",
  programStartDate: "", supportCoordinator: "", supervisor: "", serviceLine: "",
  authorizationNumber: "", monitoringSchedules: ["monthly", "quarterly-visit"],
  programRegion: "", notes: "", duplicateAcknowledged: false,
};

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function generateInitialTasks(data: IntakeData, participantId: string) {
  const today = new Date();
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const owner = data.supportCoordinator || STAFF.coordinators[0];
  const supervisor = data.supervisor || STAFF.supervisors[0];
  const base = (offsetDays: number) => isoDate(addDays(today, offsetDays));

  return [
    {
      id: `task-${Date.now()}-1`,
      title: "Complete initial assessment",
      participantId, participantName: fullName,
      owner, supervisor,
      dueDate: base(7),
      escalationDays: 3,
      reminders: ["3 days before due", "1 day before due"],
      status: "open",
      category: "Assessment",
    },
    {
      id: `task-${Date.now()}-2`,
      title: "Create person-centered plan",
      participantId, participantName: fullName,
      owner, supervisor,
      dueDate: base(30),
      escalationDays: 5,
      reminders: ["7 days before due", "2 days before due"],
      status: "open",
      category: "Planning",
    },
    {
      id: `task-${Date.now()}-3`,
      title: "Schedule first in-home visit",
      participantId, participantName: fullName,
      owner, supervisor,
      dueDate: base(14),
      escalationDays: 2,
      reminders: ["3 days before due"],
      status: "open",
      category: "Visit",
    },
    {
      id: `task-${Date.now()}-4`,
      title: "Obtain guardian signature & attestation",
      participantId, participantName: fullName,
      owner, supervisor,
      dueDate: base(10),
      escalationDays: 3,
      reminders: ["2 days before due"],
      status: data.hasGuardian ? "open" : "skipped",
      category: "Consent",
    },
    {
      id: `task-${Date.now()}-5`,
      title: "Complete monthly monitoring contact",
      participantId, participantName: fullName,
      owner, supervisor,
      dueDate: base(30),
      escalationDays: 5,
      reminders: ["7 days before due"],
      status: "open",
      category: "Monitoring",
      recurring: "monthly",
    },
    {
      id: `task-${Date.now()}-6`,
      title: "Supervisor review of intake & initial plan",
      participantId, participantName: fullName,
      owner: supervisor, supervisor,
      dueDate: base(35),
      escalationDays: 3,
      reminders: ["3 days before due"],
      status: "open",
      category: "Supervisor Review",
    },
  ];
}

export default function NewParticipantIntake() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>(EMPTY);

  function update<K extends keyof IntakeData>(key: K, value: IntakeData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggleProgram(id: string) {
    setData((d) => ({
      ...d,
      programs: d.programs.includes(id) ? d.programs.filter((w) => w !== id) : [...d.programs, id],
    }));
  }

  function toggleMonitoring(id: string) {
    setData((d) => ({
      ...d,
      monitoringSchedules: d.monitoringSchedules.includes(id)
        ? d.monitoringSchedules.filter((w) => w !== id)
        : [...d.monitoringSchedules, id],
    }));
  }

  // Duplicate / participant matching
  const duplicates = useMemo(() => {
    const fn = data.firstName.trim().toLowerCase();
    const ln = data.lastName.trim().toLowerCase();
    const dob = data.dob;
    const mid = data.medicaidId.trim();
    if (!fn && !ln && !dob && !mid) return [] as Array<{ id: string; name: string; reason: string; meta: string }>;

    const fromSeed = SEED_PEOPLE.map((p) => {
      const reasons: string[] = [];
      if (fn && p.firstName.toLowerCase() === fn && ln && p.lastName.toLowerCase() === ln) reasons.push("Name match");
      else if (fn && ln && p.firstName.toLowerCase().startsWith(fn) && p.lastName.toLowerCase().startsWith(ln)) reasons.push("Partial name match");
      if (dob && p.dob && (p.dob === dob || normalizeDob(p.dob) === dob)) reasons.push("DOB match");
      return reasons.length ? {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        reason: reasons.join(" · "),
        meta: `${p.county} County · DOB ${p.dob}`,
      } : null;
    }).filter(Boolean) as Array<{ id: string; name: string; reason: string; meta: string }>;

    const intakes: Array<any> = JSON.parse(localStorage.getItem("icm.intakes") ?? "[]");
    const fromIntakes = intakes.map((p) => {
      const reasons: string[] = [];
      if (fn && p.firstName?.toLowerCase() === fn && ln && p.lastName?.toLowerCase() === ln) reasons.push("Name match");
      if (dob && p.dob === dob) reasons.push("DOB match");
      if (mid && p.medicaidId && p.medicaidId === mid) reasons.push("State ID match");
      return reasons.length ? {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        reason: reasons.join(" · "),
        meta: `Intake from ${new Date(p.createdAt).toLocaleDateString()}`,
      } : null;
    }).filter(Boolean) as Array<{ id: string; name: string; reason: string; meta: string }>;

    return [...fromIntakes, ...fromSeed].slice(0, 4);
  }, [data.firstName, data.lastName, data.dob, data.medicaidId]);

  function submit() {
    const stored = JSON.parse(localStorage.getItem("icm.intakes") ?? "[]");
    const id = `new-${Date.now()}`;
    stored.unshift({ id, ...data, createdAt: new Date().toISOString() });
    localStorage.setItem("icm.intakes", JSON.stringify(stored));

    // Generate and persist initial tasks (6.3)
    const tasks = generateInitialTasks(data, id);
    const existing = JSON.parse(localStorage.getItem("icm.tasks") ?? "[]");
    localStorage.setItem("icm.tasks", JSON.stringify([...tasks, ...existing]));

    // Audit
    const audit = JSON.parse(localStorage.getItem("icm.audit") ?? "[]");
    audit.unshift({
      id: `aud-${Date.now()}`,
      ts: new Date().toISOString(),
      actor: data.supportCoordinator || "Kathy (Care Manager)",
      action: "Created participant record + enrolled in program",
      target: `${data.firstName} ${data.lastName}`,
      category: "create",
      details: `Programs: ${data.programs.join(", ")} · Supervisor: ${data.supervisor}`,
    });
    audit.unshift({
      id: `aud-${Date.now()+1}`,
      ts: new Date().toISOString(),
      actor: "System",
      action: `Generated ${tasks.length} initial tasks`,
      target: `${data.firstName} ${data.lastName}`,
      category: "ai",
      details: tasks.map(t => t.title).join("; "),
    });
    localStorage.setItem("icm.audit", JSON.stringify(audit));

    toast.success(`${data.firstName} ${data.lastName} enrolled`, {
      description: `${tasks.length} initial tasks created · routed to ${data.supervisor || "supervisor"} for review`,
    });
    navigate("/people");
  }

  const stepKey = STEPS[step].key;
  const hasUnacknowledgedDup = duplicates.length > 0 && !data.duplicateAcknowledged;
  const canNext = (() => {
    if (stepKey === "demographics") return Boolean(data.firstName && data.lastName && data.dob && data.gender && !hasUnacknowledgedDup);
    if (stepKey === "identifiers") return data.medicaidId.length > 0;
    if (stepKey === "address") return Boolean(data.street && data.city && data.zip && data.county);
    if (stepKey === "contact") return Boolean(data.phone || data.email);
    if (stepKey === "consent") return Boolean(data.consentHIPAA && data.consentServices && data.consentSignedDate);
    if (stepKey === "eligibility") return Boolean(data.eligibilityStatus && data.programs.length > 0);
    if (stepKey === "enrollment") return Boolean(
      data.programStartDate && data.supportCoordinator && data.supervisor &&
      data.serviceLine && data.monitoringSchedules.length > 0
    );
    return true;
  })();

  const previewTasks = useMemo(() => generateInitialTasks(data, "preview"), [data.firstName, data.lastName, data.supportCoordinator, data.supervisor, data.hasGuardian]);

  return (
    <ICMShell>
      <Breadcrumbs items={[{ label: "People Supported", to: "/people" }, { label: "New Participant Intake" }]} />

      <div className="max-w-5xl mx-auto py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">New Participant Intake</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Required fields are marked
              <span className="text-destructive"> *</span>
              {" "}· All actions are logged to the audit trail.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            AI will draft initial assessment + tasks from this intake
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

              {/* Duplicate / participant match panel */}
              {duplicates.length > 0 && (
                <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        Possible duplicate{duplicates.length > 1 ? "s" : ""} found ({duplicates.length})
                      </p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Review existing records before creating a new participant.
                      </p>
                      <div className="mt-3 space-y-2">
                        {duplicates.map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-card border border-amber-200">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{d.name}</p>
                              <p className="text-[11px] text-muted-foreground">{d.meta}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">{d.reason}</span>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/people/${d.id}`)}>Open</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs text-amber-900">
                        <Checkbox
                          checked={data.duplicateAcknowledged}
                          onCheckedChange={(v) => update("duplicateAcknowledged", Boolean(v))}
                        />
                        I have reviewed the matches above and confirm this is a new participant.
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </Section>
          )}

          {stepKey === "identifiers" && (
            <Section title="Identifiers">
              <Grid>
                <Field label="State / Medicaid ID" required hint="Primary state-issued participant identifier">
                  <Input value={data.medicaidId} onChange={(e) => update("medicaidId", e.target.value)} maxLength={20} placeholder="100000000000" />
                </Field>
                <Field label="SSN (last 4)" hint="Stored encrypted; only last 4 shown">
                  <Input value={data.ssnLast4} onChange={(e) => update("ssnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
                </Field>
                <Field label="Secondary State ID" hint="Optional — program-specific identifier">
                  <Input value={data.bddsId} onChange={(e) => update("bddsId", e.target.value)} placeholder="ID-12345" />
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
                  <Input value={data.state} onChange={(e) => update("state", e.target.value)} placeholder="2-letter code" maxLength={2} />
                </Field>
                <Field label="ZIP" required>
                  <Input value={data.zip} onChange={(e) => update("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} />
                </Field>
                <Field label="County" required hint="County of residence">
                  <Select value={data.county} onValueChange={(v) => update("county", v)}>
                    <SelectTrigger><SelectValue placeholder="Select county…" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <Input value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 555-0100" />
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
            <Section title="Program Eligibility">
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
                <Field label="Level of Need score" hint="Standardized acuity score">
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
                  Program / Waiver Eligibility <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {PROGRAMS.map((w) => {
                    const on = data.programs.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleProgram(w.id)}
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

          {stepKey === "enrollment" && (
            <Section title="Program Enrollment">
              <p className="text-xs text-muted-foreground mb-4">
                Enrollment configuration is <span className="font-medium text-foreground">configurable</span> per state/program by an Administrator.
                Fields below reflect the active configuration.
              </p>
              <Grid>
                <Field label="Program Start Date" required>
                  <Input type="date" value={data.programStartDate} onChange={(e) => update("programStartDate", e.target.value)} />
                </Field>
                <Field label="Service Line" required>
                  <Select value={data.serviceLine} onValueChange={(v) => update("serviceLine", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_LINES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Assigned Support Coordinator (Care Manager)" required>
                  <Select value={data.supportCoordinator} onValueChange={(v) => update("supportCoordinator", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {STAFF.coordinators.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Assigned Supervisor" required>
                  <Select value={data.supervisor} onValueChange={(v) => update("supervisor", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {STAFF.supervisors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Service Authorization #" hint="If applicable — link to authorization">
                  <Input value={data.authorizationNumber} onChange={(e) => update("authorizationNumber", e.target.value)} placeholder="AUTH-2026-00123" />
                </Field>
                <Field label="Program Region">
                  <Select value={data.programRegion} onValueChange={(v) => update("programRegion", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {PROGRAM_REGIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </Grid>

              <div className="mt-6">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Required Monitoring Schedule <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {MONITORING_SCHEDULES.map((m) => {
                    const on = data.monitoringSchedules.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMonitoring(m.id)}
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
                        <span className="text-sm">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <Field label="Intake notes / additional context" colSpan={2}>
                  <Textarea rows={3} value={data.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything else the supervisor or AI should know…" />
                </Field>
              </div>
            </Section>
          )}

          {stepKey === "review" && (
            <Section title="Review & Initial Tasks">
              <p className="text-sm text-muted-foreground mb-4">
                Verify the information below. Submitting creates the participant record, opens the assessment workflow,
                generates initial tasks, and routes for supervisor review.
              </p>
              <ReviewBlock title="Demographics">
                <KV k="Name" v={`${data.firstName} ${data.middleName} ${data.lastName}`} />
                <KV k="DOB" v={data.dob} />
                <KV k="Gender" v={data.gender} />
                <KV k="Language" v={`${data.primaryLanguage}${data.needsInterpreter ? " (interpreter required)" : ""}`} />
              </ReviewBlock>
              <ReviewBlock title="Identifiers">
                <KV k="State / Medicaid ID" v={data.medicaidId} />
                <KV k="Secondary State ID" v={data.bddsId || "—"} />
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
              <ReviewBlock title="Eligibility & Programs">
                <KV k="Status" v={data.eligibilityStatus} />
                <KV k="Programs" v={data.programs.map((id) => PROGRAMS.find((w) => w.id === id)?.label).filter(Boolean).join(", ") || "—"} />
                <KV k="LON" v={data.lonScore || "—"} />
                <KV k="Eligibility doc" v={data.eligibilityLetterFile ?? "Not uploaded"} />
              </ReviewBlock>
              <ReviewBlock title="Enrollment">
                <KV k="Start Date" v={data.programStartDate} />
                <KV k="Service Line" v={data.serviceLine} />
                <KV k="Support Coordinator" v={data.supportCoordinator} />
                <KV k="Supervisor" v={data.supervisor} />
                <KV k="Authorization #" v={data.authorizationNumber || "—"} />
                <KV k="Region" v={data.programRegion || "—"} />
                <KV k="Monitoring" v={data.monitoringSchedules.map(id => MONITORING_SCHEDULES.find(m => m.id === id)?.label).filter(Boolean).join("; ") || "—"} />
              </ReviewBlock>

              {/* Initial tasks preview (6.3) */}
              <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Initial Tasks to be Generated ({previewTasks.filter(t => t.status !== "skipped").length})</p>
                </div>
                <div className="space-y-2">
                  {previewTasks.map((t) => (
                    <div key={t.id} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border",
                      t.status === "skipped" && "opacity-50"
                    )}>
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CalendarClock className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.title}
                          {t.status === "skipped" && <span className="ml-2 text-[10px] text-muted-foreground">(skipped — no guardian)</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Owner: {t.owner} · Supervisor visibility: {t.supervisor} · Escalates after {t.escalationDays}d overdue
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-foreground">Due</p>
                        <p className="text-xs font-medium">{t.dueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Reminders are sent based on task category. Overdue items escalate to the assigned supervisor.
                </p>
              </div>
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
            {hasUnacknowledgedDup && (
              <span className="ml-3 text-amber-700 font-medium">Acknowledge duplicate matches to continue</span>
            )}
          </div>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} className="bg-gradient-to-r from-primary to-icm-accent">
              <Check className="w-4 h-4 mr-1" />
              Submit Intake & Generate Tasks
            </Button>
          )}
        </div>
      </div>
    </ICMShell>
  );
}

/* ---------- helpers ---------- */

function normalizeDob(s: string) {
  // accept MM/DD/YYYY → YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [m, d, y] = s.split("/");
    return `${y}-${m}-${d}`;
  }
  return s;
}

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
