// Inbound lead intake — used by the Leads module (formerly "Outreach").
// Persisted in localStorage under "icm.leads". A seeded set is merged in
// when storage is empty so the demo always has rows to show.

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Converted"
  | "Lost";

export interface LeadDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Lead {
  id: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  convertedAt?: string;
  convertedToPersonId?: string;

  // Referral source
  referralSource: string; // e.g. "Hospital discharge planner", "Family", "Self"
  referralOrg: string;
  referrerName: string;
  referrerRole: string;
  referrerPhone: string;
  referrerEmail: string;
  referralDate: string;
  referralReason: string;

  // Individual demographics (mirrors PersonProfile)
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

  // Identifiers
  medicaidId: string;
  ssnLast4: string;
  bddsId: string;
  mrn: string;

  // Address
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  residenceType: string;

  // Contact
  phone: string;
  email: string;
  preferredContact: "phone" | "email" | "text" | "mail" | "";

  // Guardian / legal
  hasGuardian: boolean;
  guardianName: string;
  guardianRelationship: string;
  guardianAuthority: string;
  guardianPhone: string;
  guardianEmail: string;

  // Emergency contacts
  emergencyName1: string;
  emergencyPhone1: string;
  emergencyRelationship1: string;
  emergencyName2: string;
  emergencyPhone2: string;
  emergencyRelationship2: string;

  // Insurance
  insurancePrimary: string;
  insurancePrimaryId: string;
  insurancePrimaryGroup: string;
  insuranceSecondary: string;
  insuranceSecondaryId: string;
  medicareNumber: string;

  // Clinical / presenting
  primaryDiagnosis: string;
  secondaryDiagnoses: string;
  allergies: string;
  currentMedications: string;
  currentSupports: string;
  presentingConcerns: string;

  // Program interest
  requestedServices: string[];
  desiredStartDate: string;
  fundingSource: string;

  // Internal
  assignedTo: string;
  notes: string;

  // Uploaded documents (file payloads are not persisted, only metadata)
  documents: LeadDocument[];
}

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Converted",
  "Lost",
];

export const leadStatusStyles: Record<LeadStatus, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Contacted: "bg-amber-50 text-amber-700 border-amber-200",
  Qualified: "bg-violet-50 text-violet-700 border-violet-200",
  Converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-slate-100 text-slate-600 border-slate-200",
};

export const REFERRAL_SOURCES = [
  "Hospital discharge planner",
  "Primary care physician",
  "School / IEP team",
  "State / county agency",
  "Family member",
  "Self-referral",
  "Community organization",
  "Other provider",
];

export const REQUESTED_SERVICES = [
  "Targeted Case Management",
  "Community Integration & Habilitation",
  "Family Supports",
  "Behavioral Health",
  "Aging & Long-Term Services",
  "Children's Services",
  "Respite",
  "Day Services",
];

export const FUNDING_SOURCES = [
  "HCBS Community Integration Waiver",
  "HCBS Family Supports Waiver",
  "Aging & Disability Waiver (PathWays)",
  "State Plan Medicaid",
  "Private Pay",
  "Private Insurance",
  "Pending eligibility",
];

const STORAGE_KEY = "icm.leads";

export function emptyLead(): Lead {
  const id = `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  return {
    id,
    status: "New",
    createdAt: now,
    updatedAt: now,
    referralSource: "",
    referralOrg: "",
    referrerName: "",
    referrerRole: "",
    referrerPhone: "",
    referrerEmail: "",
    referralDate: now.slice(0, 10),
    referralReason: "",
    firstName: "",
    middleName: "",
    lastName: "",
    preferredName: "",
    dob: "",
    gender: "",
    pronouns: "",
    primaryLanguage: "English",
    needsInterpreter: false,
    race: "",
    ethnicity: "",
    maritalStatus: "Single",
    medicaidId: "",
    ssnLast4: "",
    bddsId: "",
    mrn: "",
    street: "",
    city: "",
    state: "IN",
    zip: "",
    county: "",
    residenceType: "Family Home",
    phone: "",
    email: "",
    preferredContact: "phone",
    hasGuardian: false,
    guardianName: "",
    guardianRelationship: "",
    guardianAuthority: "",
    guardianPhone: "",
    guardianEmail: "",
    emergencyName1: "",
    emergencyPhone1: "",
    emergencyRelationship1: "",
    emergencyName2: "",
    emergencyPhone2: "",
    emergencyRelationship2: "",
    insurancePrimary: "",
    insurancePrimaryId: "",
    insurancePrimaryGroup: "",
    insuranceSecondary: "",
    insuranceSecondaryId: "",
    medicareNumber: "",
    primaryDiagnosis: "",
    secondaryDiagnoses: "",
    allergies: "",
    currentMedications: "",
    currentSupports: "",
    presentingConcerns: "",
    requestedServices: [],
    desiredStartDate: "",
    fundingSource: "",
    assignedTo: "Kathy Reynolds (Care Manager)",
    notes: "",
    documents: [],
  };
}

const SEEDS: Lead[] = [
  {
    ...emptyLead(),
    id: "lead-seed-1",
    status: "New",
    createdAt: "2026-05-15T14:20:00Z",
    updatedAt: "2026-05-15T14:20:00Z",
    referralSource: "Hospital discharge planner",
    referralOrg: "Riley Children's Health",
    referrerName: "Anita Mahoney, RN",
    referrerRole: "Discharge Planner",
    referrerPhone: "(317) 555-0182",
    referrerEmail: "amahoney@rileychildrens.org",
    referralDate: "2026-05-15",
    referralReason:
      "12-year-old with cerebral palsy discharging home. Family needs help arranging in-home supports and waiver enrollment.",
    firstName: "Mateo",
    lastName: "Alvarez",
    preferredName: "Mateo",
    dob: "2013-09-12",
    gender: "M",
    pronouns: "he/him",
    race: "Hispanic / Latino",
    ethnicity: "Hispanic",
    medicaidId: "IN-MA-554120",
    street: "1842 Madison Ave",
    city: "Indianapolis",
    state: "IN",
    zip: "46225",
    county: "Marion",
    residenceType: "Family Home",
    phone: "(317) 555-2294",
    email: "rosa.alvarez@example.com",
    preferredContact: "phone",
    hasGuardian: true,
    guardianName: "Rosa Alvarez",
    guardianRelationship: "Mother",
    guardianAuthority: "Parent of minor",
    guardianPhone: "(317) 555-2294",
    guardianEmail: "rosa.alvarez@example.com",
    emergencyName1: "Rosa Alvarez",
    emergencyPhone1: "(317) 555-2294",
    emergencyRelationship1: "Mother",
    insurancePrimary: "Indiana Medicaid (Anthem MCO)",
    insurancePrimaryId: "IN-MA-554120",
    primaryDiagnosis: "Cerebral palsy, spastic quadriplegic (G80.0)",
    allergies: "Penicillin",
    currentMedications: "Baclofen 10mg TID, Levetiracetam 500mg BID",
    presentingConcerns:
      "Requires G-tube feeding, full assistance with ADLs, seizure precautions.",
    requestedServices: [
      "Targeted Case Management",
      "Community Integration & Habilitation",
      "Respite",
    ],
    desiredStartDate: "2026-06-01",
    fundingSource: "HCBS Community Integration Waiver",
    notes:
      "Hospital is targeting discharge within 10 days. Prioritize intake.",
    documents: [
      {
        id: "doc-seed-1a",
        name: "Discharge_Summary_Riley.pdf",
        size: 184_320,
        type: "application/pdf",
        uploadedAt: "2026-05-15T14:22:00Z",
      },
      {
        id: "doc-seed-1b",
        name: "Medicaid_Card_Mateo.jpg",
        size: 92_140,
        type: "image/jpeg",
        uploadedAt: "2026-05-15T14:23:00Z",
      },
    ],
  },
  {
    ...emptyLead(),
    id: "lead-seed-2",
    status: "Contacted",
    createdAt: "2026-05-10T16:00:00Z",
    updatedAt: "2026-05-18T11:05:00Z",
    referralSource: "State / county agency",
    referralOrg: "Indiana BDDS — District 5",
    referrerName: "DeShawn Pritchard",
    referrerRole: "BDDS Service Coordinator",
    referrerPhone: "(317) 555-6611",
    referrerEmail: "dpritchard@fssa.in.gov",
    referralDate: "2026-05-10",
    referralReason:
      "Family Supports Waiver slot offered. Family selected our agency as TCM provider.",
    firstName: "Hannah",
    lastName: "Beckmann",
    dob: "2001-02-18",
    gender: "F",
    pronouns: "she/her",
    medicaidId: "IN-MA-441229",
    bddsId: "BDDS-2026-04421",
    street: "504 N Elm St",
    city: "Bloomington",
    state: "IN",
    zip: "47404",
    county: "Monroe",
    residenceType: "Family Home",
    phone: "(812) 555-0091",
    email: "beckmann.family@example.com",
    preferredContact: "email",
    hasGuardian: true,
    guardianName: "Karen Beckmann",
    guardianRelationship: "Mother / Guardian",
    guardianAuthority: "Plenary guardian",
    guardianPhone: "(812) 555-0091",
    guardianEmail: "beckmann.family@example.com",
    emergencyName1: "Karen Beckmann",
    emergencyPhone1: "(812) 555-0091",
    emergencyRelationship1: "Mother",
    insurancePrimary: "Indiana Medicaid (MDwise MCO)",
    insurancePrimaryId: "IN-MA-441229",
    primaryDiagnosis: "Autism spectrum disorder, level 2 (F84.0)",
    secondaryDiagnoses: "Generalized anxiety disorder (F41.1)",
    currentMedications: "Sertraline 50mg daily",
    presentingConcerns:
      "Needs community access supports, vocational planning, and behavioral coaching.",
    requestedServices: [
      "Targeted Case Management",
      "Family Supports",
      "Behavioral Health",
    ],
    desiredStartDate: "2026-06-15",
    fundingSource: "HCBS Family Supports Waiver",
    notes: "Intake call completed 5/18. Awaiting signed consents.",
    documents: [
      {
        id: "doc-seed-2a",
        name: "BDDS_Notice_of_Action.pdf",
        size: 124_500,
        type: "application/pdf",
        uploadedAt: "2026-05-10T16:01:00Z",
      },
    ],
  },
  {
    ...emptyLead(),
    id: "lead-seed-3",
    status: "Qualified",
    createdAt: "2026-04-28T09:30:00Z",
    updatedAt: "2026-05-19T13:40:00Z",
    referralSource: "Primary care physician",
    referralOrg: "Eskenazi Health Primary Care",
    referrerName: "Dr. Priya Natarajan",
    referrerRole: "PCP",
    referrerPhone: "(317) 555-7700",
    referrerEmail: "pnatarajan@eskenazi.org",
    referralDate: "2026-04-28",
    referralReason:
      "67yo with early-onset dementia and Down syndrome. Caregiver burnout — needs respite + case management.",
    firstName: "Theodore",
    lastName: "Whitlock",
    preferredName: "Teddy",
    dob: "1959-03-04",
    gender: "M",
    pronouns: "he/him",
    medicaidId: "IN-MA-118822",
    street: "22 Oakridge Ln",
    city: "Carmel",
    state: "IN",
    zip: "46032",
    county: "Hamilton",
    residenceType: "Sibling's Home",
    phone: "(317) 555-4410",
    email: "lwhitlock@example.com",
    preferredContact: "phone",
    hasGuardian: true,
    guardianName: "Laura Whitlock",
    guardianRelationship: "Sister / POA",
    guardianAuthority: "Healthcare POA",
    guardianPhone: "(317) 555-4410",
    guardianEmail: "lwhitlock@example.com",
    emergencyName1: "Laura Whitlock",
    emergencyPhone1: "(317) 555-4410",
    emergencyRelationship1: "Sister",
    insurancePrimary: "Medicare Part A & B",
    medicareNumber: "1AB2-CD3-EF45",
    insuranceSecondary: "Indiana Medicaid",
    insuranceSecondaryId: "IN-MA-118822",
    primaryDiagnosis: "Down syndrome (Q90.9)",
    secondaryDiagnoses: "Alzheimer's disease, early onset (G30.0)",
    allergies: "Sulfa drugs",
    currentMedications: "Donepezil 10mg HS, Levothyroxine 75mcg daily",
    presentingConcerns:
      "Increasing confusion, occasional wandering. Sister works full-time and needs daytime supports.",
    requestedServices: [
      "Targeted Case Management",
      "Aging & Long-Term Services",
      "Day Services",
      "Respite",
    ],
    desiredStartDate: "2026-06-01",
    fundingSource: "Aging & Disability Waiver (PathWays)",
    notes:
      "Eligibility confirmed. Care plan draft started. Ready to start services pending signed agreement.",
    documents: [
      {
        id: "doc-seed-3a",
        name: "PCP_Referral_Letter.pdf",
        size: 76_220,
        type: "application/pdf",
        uploadedAt: "2026-04-28T09:32:00Z",
      },
      {
        id: "doc-seed-3b",
        name: "Eligibility_Determination.pdf",
        size: 142_800,
        type: "application/pdf",
        uploadedAt: "2026-05-12T10:15:00Z",
      },
      {
        id: "doc-seed-3c",
        name: "POA_Documentation.pdf",
        size: 210_350,
        type: "application/pdf",
        uploadedAt: "2026-04-28T09:35:00Z",
      },
    ],
  },
];

function loadFromStorage(): Lead[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Lead[];
  } catch {
    return null;
  }
}

function saveToStorage(leads: Lead[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    /* ignore quota */
  }
}

export function getLeads(): Lead[] {
  const stored = loadFromStorage();
  if (stored && stored.length) return stored;
  saveToStorage(SEEDS);
  return SEEDS;
}

export function getLead(id: string): Lead | undefined {
  return getLeads().find((l) => l.id === id);
}

export function saveLead(lead: Lead): Lead {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === lead.id);
  const next = { ...lead, updatedAt: new Date().toISOString() };
  if (idx >= 0) leads[idx] = next;
  else leads.unshift(next);
  saveToStorage(leads);
  return next;
}

export function deleteLead(id: string) {
  const leads = getLeads().filter((l) => l.id !== id);
  saveToStorage(leads);
}

export function markLeadConverted(id: string, personId: string) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx < 0) return;
  leads[idx] = {
    ...leads[idx],
    status: "Converted",
    convertedAt: new Date().toISOString(),
    convertedToPersonId: personId,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(leads);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
