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

export function getProfile(id: string): ProfileData {
  return profiles[id] ?? { ...empty, vitalBaselines: defaultBaselines() };
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
