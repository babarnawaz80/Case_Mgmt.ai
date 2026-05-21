// Mock profile data layered on top of the people seed.
// Used by /people/:id/profile and /people/:id/facesheet.

export type Severity = "Mild" | "Moderate" | "Severe" | "Life-threatening";
export type MedStatus = "Active" | "Discontinued" | "As Needed";

export interface Diagnosis {
  code: string; // ICD-10
  description: string;
  addedOn: string;
  addedBy: string;
  primary?: boolean;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  startDate: string;
  status: MedStatus;
  notes?: string;
}

export interface Allergy {
  allergen: string;
  reaction: string;
  severity: Severity;
  identifiedOn: string;
}

export interface VitalBaseline {
  measurement: string;
  baseline: string;
  normalRange: string;
  lastMeasured?: string;
  measuredBy?: string;
  notes?: string;
}

export interface ProviderRow {
  name: string;
  specialty: string;
  phone: string;
  address?: string;
  lastVisit?: string;
  nextAppointment?: string;
  notes?: string;
}

export interface InsuranceRow {
  type: "Medicaid" | "Medicare" | "Private" | "Other";
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  effectiveDate: string;
  expirationDate?: string;
}

export interface ProgramEnrollment {
  program: string;
  serviceCategory: string;
  startDate: string;
  endDate?: string;
  status: "Active" | "Pending" | "Closed" | "On Hold";
  caseManager: string;
}

export interface FundingStream {
  type: string;
  authorizedUnits: number;
  usedUnits: number;
  period: string;
  authorizationNumber: string;
  status: "Active" | "Pending" | "Expired";
}

export interface ContactRow {
  name: string;
  relationship: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  priority?: number; // emergency contacts only
  notes?: string;
}

export interface SupportCircleRow {
  name: string;
  role: string;
  organization?: string;
  phone?: string;
  email?: string;
  involvement: "High" | "Medium" | "Low";
  notes?: string;
}

export interface ProfessionalContact {
  name: string;
  organization: string;
  role: string;
  phone: string;
  email?: string;
  service?: string;
  lastContacted?: string;
}

export interface DocumentRow {
  name: string;
  type: string;
  uploadedBy: string;
  uploadDate: string;
  expirationDate?: string;
  notes?: string;
}

export interface PharmacyRow {
  name: string;
  phone: string;
  address?: string;
  primary?: boolean;
}

export interface ProfileData {
  // Basic Info
  middleName?: string;
  preferredName?: string;
  pronouns?: string;
  raceEthnicity?: string[];
  primaryLanguage: string;
  secondaryLanguage?: string;
  communicationNeeds?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  livingSituation?: string;
  ssn?: string; // masked
  medicaidId?: string;
  medicareId?: string;
  stateId?: string;
  ltssId?: string;
  referralSource?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  preferredContact?: "Phone" | "Email" | "Text" | "Mail";

  // Medical
  diagnoses: Diagnosis[];
  medications: Medication[];
  allergies: Allergy[];
  hrstScore?: number;
  hrstScoredOn?: string;
  hrstSource?: string;
  providers: ProviderRow[];
  insurance: InsuranceRow[];

  // Monitors & Baselines
  vitalBaselines: VitalBaseline[];
  healthMonitoringNotes?: string;
  behavioralMonitoringNotes?: string;

  // Court Involvement
  court?: string;
  attorney?: string;
  lastCourtDate?: string;
  nextCourtDate?: string;
  nextReportDate?: string;
  forensicInvolvement?: boolean;
  forensicDetails?: string;
  legalStatus?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  guardianshipType?: string;
  pharmacies: PharmacyRow[];

  // Program
  enrollments: ProgramEnrollment[];
  funding: FundingStream[];

  // Contacts
  emergencyContacts: ContactRow[];
  supportCircle: SupportCircleRow[];
  professionalContacts: ProfessionalContact[];

  // Documents
  documents: DocumentRow[];

  // Administrative
  caseManager: string;
  secondaryCaseManager?: string;
  supervisor?: string;
  programCoordinator?: string;
  caseloadWeight?: number;
  complexity?: "Standard" | "Moderate" | "Complex" | "High complexity";
  referralDate?: string;
  admissionType?: string;
  previousAgency?: string;
  dischargeDate?: string;
  dischargeType?: string;
  dischargeReason?: string;
  dischargeSummary?: string;
  lastChartReview?: string;
  nextChartReviewDue?: string;
  internalNotes?: string;
  changeHistory: { date: string; user: string; field: string; oldValue: string; newValue: string }[];
}

const empty: ProfileData = {
  primaryLanguage: "English",
  diagnoses: [],
  medications: [],
  allergies: [],
  providers: [],
  insurance: [],
  vitalBaselines: defaultBaselines(),
  pharmacies: [],
  enrollments: [],
  funding: [],
  emergencyContacts: [],
  supportCircle: [],
  professionalContacts: [],
  documents: [],
  caseManager: "Babar Nawaz CM",
  changeHistory: [],
};

function defaultBaselines(): VitalBaseline[] {
  return [
    { measurement: "Blood Pressure", baseline: "—", normalRange: "90-120 / 60-80 mmHg" },
    { measurement: "Heart Rate", baseline: "—", normalRange: "60-100 bpm" },
    { measurement: "Weight", baseline: "—", normalRange: "—" },
    { measurement: "Height", baseline: "—", normalRange: "—" },
    { measurement: "Blood Glucose", baseline: "—", normalRange: "70-140 mg/dL" },
    { measurement: "Temperature", baseline: "—", normalRange: "97-99°F" },
    { measurement: "Oxygen Saturation", baseline: "—", normalRange: "95-100%" },
  ];
}

const josephProfile: ProfileData = {
  preferredName: "Joe",
  pronouns: "he/him",
  raceEthnicity: ["Black or African American"],
  primaryLanguage: "English",
  communicationNeeds: "Requires interpreter for clinical visits.",
  street: "123 Carroll St",
  city: "Baltimore",
  state: "MD",
  zip: "21201",
  livingSituation: "Family home",
  ssn: "XXX-XX-1234",
  medicaidId: "12345678978",
  stateId: "MD-7741",
  referralSource: "DDA",
  primaryPhone: "410-555-0100",
  email: "joseph.brown@example.org",
  preferredContact: "Phone",

  diagnoses: [
    { code: "F70", description: "Mild intellectual disability", addedOn: "09/01/2022", addedBy: "Babar Nawaz CM", primary: true },
    { code: "F41.1", description: "Generalized anxiety disorder", addedOn: "02/14/2024", addedBy: "Dr. Sarah Chen" },
  ],
  medications: [
    { name: "Sertraline", dosage: "50mg", frequency: "Once daily", prescriber: "Dr. Sarah Chen", startDate: "03/01/2024", status: "Active" },
    { name: "Melatonin", dosage: "3mg", frequency: "At bedtime", prescriber: "Dr. Sarah Chen", startDate: "01/15/2025", status: "As Needed" },
  ],
  allergies: [
    { allergen: "Penicillin", reaction: "Anaphylaxis", severity: "Severe", identifiedOn: "06/12/2018" },
  ],
  hrstScore: 2,
  hrstScoredOn: "09/01/2022",
  hrstSource: "Manual entry",
  providers: [
    { name: "Dr. Sarah Chen", specialty: "Primary Care", phone: "410-555-0202", address: "Johns Hopkins Hospital", lastVisit: "02/14/2026", nextAppointment: "05/14/2026" },
  ],
  insurance: [
    { type: "Medicaid", provider: "Maryland Medicaid", policyNumber: "12345678978", effectiveDate: "09/01/2022" },
  ],

  vitalBaselines: defaultBaselines(),
  healthMonitoringNotes: "",
  behavioralMonitoringNotes: "",

  pharmacies: [
    { name: "CVS Pharmacy", phone: "410-555-0303", address: "456 Main St, Baltimore MD", primary: true },
  ],

  enrollments: [
    { program: "Carroll County", serviceCategory: "Medicaid | Case Management", startDate: "09/01/2022", status: "Active", caseManager: "Babar Nawaz CM" },
  ],
  funding: [
    { type: "Medicaid Waiver", authorizedUnits: 40, usedUnits: 0, period: "Apr 2026", authorizationNumber: "SA-2026-001", status: "Active" },
  ],

  emergencyContacts: [
    { name: "Linda Brown", relationship: "Mother", primaryPhone: "410-555-0101", priority: 1, notes: "Best to call after 5pm" },
  ],
  supportCircle: [
    { name: "Linda Brown", role: "Primary caregiver", phone: "410-555-0101", involvement: "High" },
  ],
  professionalContacts: [
    { name: "Dr. Sarah Chen", organization: "Johns Hopkins", role: "Primary care physician", phone: "410-555-0202", service: "Primary Care", lastContacted: "02/14/2026" },
    { name: "Marcus Reed", organization: "Project HIRE", role: "Employment specialist", phone: "410-555-0404", service: "Employment", lastContacted: "11/02/2025" },
  ],

  documents: [],

  caseManager: "Babar Nawaz CM",
  supervisor: "Kathy Adams",
  caseloadWeight: 1.5,
  complexity: "Moderate",
  referralDate: "08/15/2022",
  admissionType: "New admission",
  lastChartReview: "01/15/2026",
  nextChartReviewDue: "07/15/2026",
  changeHistory: [
    { date: "02/14/2024", user: "Dr. Sarah Chen", field: "Secondary Diagnosis", oldValue: "—", newValue: "F41.1" },
    { date: "03/01/2024", user: "Dr. Sarah Chen", field: "Medications", oldValue: "—", newValue: "Sertraline 50mg" },
  ],
};

const profiles: Record<string, ProfileData> = {
  "1": josephProfile,
};

// ---------------------------------------------------------------------------
// Synthetic profile generator
// Produces a complete, internally-consistent ProfileData record for any person
// in the seed who doesn't have a hand-crafted profile. Deterministic per id.
// ---------------------------------------------------------------------------

import { people, type Person } from "./people";

const DIAG_POOL: Array<Pick<Diagnosis, "code" | "description">> = [
  { code: "F70",    description: "Mild intellectual disability" },
  { code: "F71",    description: "Moderate intellectual disability" },
  { code: "F84.0",  description: "Autism spectrum disorder" },
  { code: "G40.909",description: "Epilepsy, unspecified" },
  { code: "F41.1",  description: "Generalized anxiety disorder" },
  { code: "F33.1",  description: "Major depressive disorder, recurrent, moderate" },
  { code: "I10",    description: "Essential (primary) hypertension" },
  { code: "E11.9",  description: "Type 2 diabetes mellitus without complications" },
  { code: "J44.9",  description: "COPD, unspecified" },
  { code: "M19.90", description: "Osteoarthritis, unspecified site" },
];

const MED_POOL: Array<Pick<Medication, "name" | "dosage" | "frequency">> = [
  { name: "Sertraline",   dosage: "50mg",  frequency: "Once daily" },
  { name: "Levetiracetam",dosage: "500mg", frequency: "Twice daily" },
  { name: "Risperidone",  dosage: "1mg",   frequency: "Twice daily" },
  { name: "Lisinopril",   dosage: "10mg",  frequency: "Once daily" },
  { name: "Metformin",    dosage: "500mg", frequency: "Twice daily with meals" },
  { name: "Albuterol",    dosage: "90mcg", frequency: "As needed" },
  { name: "Melatonin",    dosage: "3mg",   frequency: "At bedtime" },
  { name: "Acetaminophen",dosage: "500mg", frequency: "Every 6 hours PRN" },
];

const PROVIDER_POOL = [
  { name: "Dr. Sarah Chen",     specialty: "Primary Care",  phone: "319-555-0202", address: "University of Iowa Hospitals" },
  { name: "Dr. Marcus Patel",   specialty: "Neurology",     phone: "319-555-0303", address: "Mercy Medical Center" },
  { name: "Dr. Elaine Foster",  specialty: "Psychiatry",    phone: "319-555-0404", address: "Behavioral Health Associates" },
  { name: "Dr. James Whitlock", specialty: "Cardiology",    phone: "319-555-0505", address: "Iowa Heart Center" },
  { name: "Dr. Priya Iyer",     specialty: "Endocrinology", phone: "319-555-0606", address: "Iowa Diabetes Clinic" },
];

const EM_REL = ["Mother", "Father", "Sister", "Brother", "Guardian", "Aunt", "Uncle"];
const CMS = ["Babar Nawaz CM", "Jennie Thollander", "Brenda Smith", "Kathy Adams"];
const CITIES = ["Des Moines", "Cedar Rapids", "Davenport", "Iowa City", "Waterloo", "Ames", "Sioux City"];

function h(seed: string, n: number): number {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return x % n;
}
const pick = <T,>(arr: T[], seed: string, salt = ""): T => arr[h(seed + salt, arr.length)];

function generateProfile(p: Person): ProfileData {
  const seed = p.id;
  const cm = p.serviceContact ?? pick(CMS, seed, "cm");
  const primaryDiag = pick(DIAG_POOL, seed, "d1");
  const secondaryDiag = pick(DIAG_POOL.filter((d) => d.code !== primaryDiag.code), seed, "d2");
  const med1 = pick(MED_POOL, seed, "m1");
  const med2 = pick(MED_POOL.filter((m) => m.name !== med1.name), seed, "m2");
  const provider = pick(PROVIDER_POOL, seed, "prov");

  const allergies: Allergy[] = p.allergies && p.allergies !== "None known"
    ? p.allergies.split(",").map((a) => ({
        allergen: a.trim(),
        reaction: pick(["Hives", "Anaphylaxis", "Swelling", "Rash"], seed, a),
        severity: pick<Severity>(["Moderate", "Severe", "Life-threatening", "Mild"], seed, a),
        identifiedOn: p.admittedOn,
      }))
    : [];

  const baseline = defaultBaselines();
  baseline[0] = { ...baseline[0], baseline: `${110 + h(seed, 30)}/${65 + h(seed + "d", 20)} mmHg`, lastMeasured: p.updatedOn, measuredBy: cm };
  baseline[1] = { ...baseline[1], baseline: `${68 + h(seed, 24)} bpm`, lastMeasured: p.updatedOn, measuredBy: cm };
  baseline[2] = { ...baseline[2], baseline: `${130 + h(seed, 80)} lb`, lastMeasured: p.updatedOn, measuredBy: cm };

  const emName = `${pick(["Linda", "Robert", "Maria", "James", "Patricia", "John"], seed, "em")} ${p.lastName}`;
  const emPhone = `319-555-${String(1000 + h(seed + "ec", 8999)).padStart(4, "0")}`;

  return {
    preferredName: p.nickname,
    pronouns: p.gender === "M" ? "he/him" : "she/her",
    primaryLanguage: "English",
    communicationNeeds: p.specialInstructions,
    street: `${100 + h(seed + "house", 9000)} ${pick(["Maple", "Oak", "Elm", "Cedar", "Pine", "Birch"], seed, "st")} St`,
    city: pick(CITIES, seed, "city"),
    state: "IA",
    zip: String(50000 + h(seed + "zip", 9999)),
    livingSituation: pick(["Family home", "Group home", "Supported living", "Independent apartment"], seed, "ls"),
    ssn: `XXX-XX-${String(1000 + h(seed + "ssn", 8999)).padStart(4, "0")}`,
    medicaidId: `IA${10000000 + h(seed + "mid", 89999999)}`,
    stateId: `IA-${1000 + h(seed + "sid", 8999)}`,
    referralSource: pick(["DHS", "Self-referral", "Family", "Hospital discharge", "School transition"], seed, "ref"),
    primaryPhone: `319-555-${String(2000 + h(seed + "pp", 7999)).padStart(4, "0")}`,
    email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase().replace(/[^a-z]/g, "")}@example.org`,
    preferredContact: pick<"Phone" | "Email" | "Text" | "Mail">(["Phone", "Email", "Text"], seed, "pc"),

    diagnoses: [
      { ...primaryDiag, addedOn: p.admittedOn, addedBy: cm, primary: true },
      { ...secondaryDiag, addedOn: p.updatedOn, addedBy: "Dr. Sarah Chen" },
    ],
    medications: [
      { ...med1, prescriber: "Dr. Sarah Chen", startDate: p.admittedOn, status: "Active" },
      { ...med2, prescriber: "Dr. Sarah Chen", startDate: p.updatedOn, status: h(seed, 4) === 0 ? "As Needed" : "Active" },
    ],
    allergies,
    hrstScore: 1 + h(seed + "hrst", 5),
    hrstScoredOn: p.admittedOn,
    hrstSource: "Manual entry",
    providers: [{ ...provider, lastVisit: p.updatedOn, nextAppointment: p.updatedOn, notes: "Quarterly follow-up scheduled." }],
    insurance: [{ type: "Medicaid", provider: "Iowa Medicaid", policyNumber: `IA${10000000 + h(seed + "pol", 89999999)}`, effectiveDate: p.admittedOn }],

    vitalBaselines: baseline,
    healthMonitoringNotes: "",
    behavioralMonitoringNotes: "",

    pharmacies: [{ name: pick(["CVS Pharmacy", "Walgreens", "Hy-Vee Pharmacy", "Medicap"], seed, "ph"), phone: `319-555-${String(3000 + h(seed + "phn", 6999)).padStart(4, "0")}`, primary: true }],

    enrollments: [{ program: p.county, serviceCategory: "Medicaid | Case Management", startDate: p.admittedOn, status: p.status === "Discharged" ? "Closed" : "Active", caseManager: cm }],
    funding: [{ type: "Medicaid Waiver", authorizedUnits: 40, usedUnits: h(seed + "u", 35), period: "Current quarter", authorizationNumber: `SA-2026-${String(100 + h(seed + "auth", 899)).padStart(3, "0")}`, status: "Active" }],

    emergencyContacts: [{ name: emName, relationship: pick(EM_REL, seed, "rel"), primaryPhone: emPhone, priority: 1, notes: "Best to call after 5pm" }],
    supportCircle: [{ name: emName, role: "Primary caregiver", phone: emPhone, involvement: "High" }],
    professionalContacts: [{ name: provider.name, organization: provider.address ?? "", role: provider.specialty, phone: provider.phone, service: provider.specialty, lastContacted: p.updatedOn }],

    documents: [],

    caseManager: cm,
    supervisor: "Kathy Adams",
    caseloadWeight: 1 + h(seed + "cw", 20) / 10,
    complexity: ((): "Standard" | "Moderate" | "Complex" | "High complexity" => {
      const r = p.riskScore ?? 30;
      if (r >= 70) return "High complexity";
      if (r >= 50) return "Complex";
      if (r >= 30) return "Moderate";
      return "Standard";
    })(),
    referralDate: p.admittedOn,
    admissionType: p.status === "Pending" ? "Intake in progress" : "New admission",
    lastChartReview: p.updatedOn,
    nextChartReviewDue: p.updatedOn,
    changeHistory: [
      { date: p.admittedOn, user: cm, field: "Admission", oldValue: "—", newValue: "Active" },
      { date: p.updatedOn, user: cm, field: "Chart review", oldValue: "—", newValue: "Reviewed" },
    ],
  };
}

export function getProfile(id: string): ProfileData {
  if (profiles[id]) return profiles[id];
  const person = people.find((p) => p.id === id);
  if (!person) return { ...empty, vitalBaselines: defaultBaselines() };
  profiles[id] = generateProfile(person);
  return profiles[id];
}

// Completeness — required fields per tab.
export interface TabCompleteness {
  tab: TabKey;
  label: string;
  total: number;
  filled: number;
  missing: string[];
}

export type TabKey =
  | "basic"
  | "medical"
  | "monitors"
  | "court"
  | "program"
  | "contacts"
  | "documents"
  | "administrative";

export function tabCompleteness(p: ProfileData, baseFirst: string, baseLast: string, baseDob: string): TabCompleteness[] {
  const basicReq: { label: string; ok: boolean }[] = [
    { label: "First Name", ok: !!baseFirst },
    { label: "Last Name", ok: !!baseLast },
    { label: "Date of Birth", ok: !!baseDob },
    { label: "Primary Phone", ok: !!p.primaryPhone },
    { label: "County", ok: true },
    { label: "Date of Admission", ok: true },
  ];
  const medicalReq = [
    { label: "Primary Diagnosis", ok: p.diagnoses.some((d) => d.primary) },
    { label: "Allergies recorded", ok: p.allergies.length > 0 },
    { label: "Insurance information", ok: p.insurance.length > 0 },
  ];
  const monitorsReq = [
    { label: "At least one baseline measurement", ok: p.vitalBaselines.some((v) => v.baseline !== "—" && v.baseline !== "") },
  ];
  const courtReq = [
    { label: "Legal Status", ok: !!p.legalStatus },
  ];
  const programReq = [
    { label: "At least one program enrollment", ok: p.enrollments.length > 0 },
  ];
  const contactsReq = [
    { label: "Emergency contact phone", ok: p.emergencyContacts.some((c) => !!c.primaryPhone) },
  ];
  const documentsReq = [
    { label: "At least one document on file", ok: p.documents.length > 0 },
  ];
  const adminReq = [
    { label: "Assigned Case Manager", ok: !!p.caseManager },
  ];

  const build = (tab: TabKey, label: string, items: { label: string; ok: boolean }[]): TabCompleteness => ({
    tab,
    label,
    total: items.length,
    filled: items.filter((x) => x.ok).length,
    missing: items.filter((x) => !x.ok).map((x) => x.label),
  });

  return [
    build("basic", "Basic Info", basicReq),
    build("medical", "Medical Info", medicalReq),
    build("monitors", "Monitors & Baselines", monitorsReq),
    build("court", "Court Involvement", courtReq),
    build("program", "Program", programReq),
    build("contacts", "Contacts", contactsReq),
    build("documents", "Documents", documentsReq),
    build("administrative", "Administrative", adminReq),
  ];
}

export function overallCompleteness(tabs: TabCompleteness[]) {
  const total = tabs.reduce((s, t) => s + t.total, 0);
  const filled = tabs.reduce((s, t) => s + t.filled, 0);
  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  const missing = tabs.flatMap((t) => t.missing);
  return { total, filled, pct, missing };
}
