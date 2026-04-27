// Mock Eligibility Verification data — structured to be replaceable by real API.

export type MAStatus =
  | "MA Eligible — Active"
  | "MA Eligible — Renewal Pending"
  | "MA Eligible — Pending Approval"
  | "MA Ineligible — Suspended"
  | "MA Ineligible — Terminated"
  | "MA Ineligible — Not Found"
  | "Unknown — Verification Needed";

export type MAType = "Waiver Related" | "SSI Related" | "Medicare/Medicaid Dual" | "Spend-Down" | "Other";

export type RecordStatus = "Active" | "Pending" | "Inactive" | "Draft";

export interface FundingSource {
  id: string;
  type: "Medicare" | "State funding" | "County funding" | "Private insurance" | "Self-pay" | "Other";
  policyNumber?: string;
  effectiveDate?: string;
  renewalDate?: string;
  status?: string;
  notes?: string;
}

export interface EligibilityVerification {
  id: string;
  personId: string;
  maStatus: MAStatus;
  maNumber?: string;
  maType?: MAType;
  ssiOrNoRedetermination?: boolean;
  verificationDate?: string;
  effectiveDate?: string;
  applicationDate?: string;
  renewalDate?: string;
  redeterminationDate?: string;
  documentType?: string;
  documentName?: string;
  documentUploadedOn?: string;
  notes?: string;
  recordStatus: RecordStatus;
  updatedBy: string;
  updatedOn: string;
  fundingSources?: FundingSource[];
  aiFields?: Partial<Record<keyof EligibilityVerification, string>>;
}

const JOSEPH = "joseph-brown";

export const eligibilityRecords: EligibilityVerification[] = [
  {
    id: "96",
    personId: JOSEPH,
    maStatus: "MA Eligible — Active",
    maNumber: "12345678978",
    maType: "Waiver Related",
    ssiOrNoRedetermination: false,
    verificationDate: "08/01/2023",
    effectiveDate: "08/01/2023",
    applicationDate: "07/15/2022",
    renewalDate: "08/01/2023",
    redeterminationDate: "08/01/2024", // overdue (mock)
    documentType: "MA Verification Letter",
    documentName: "MA_Verification_08012023.pdf",
    documentUploadedOn: "08/01/2023",
    notes: "Initial verification on file. Continuous coverage since 09/01/2022.",
    recordStatus: "Active",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "08/01/2023",
  },
];

export function getEligibilityForPerson(personId: string): EligibilityVerification[] {
  return eligibilityRecords.filter(r => r.personId === personId);
}

export function getEligibilityRecord(id: string): EligibilityVerification | undefined {
  return eligibilityRecords.find(r => r.id === id);
}

// Returns current/most recent verification for a person.
export function getCurrentEligibility(personId: string): EligibilityVerification | undefined {
  const list = getEligibilityForPerson(personId);
  return list[0];
}

export function buildAIPreFilledEligibility(personId: string): EligibilityVerification {
  return {
    id: "new",
    personId,
    maStatus: "Unknown — Verification Needed",
    maNumber: "12345678978",
    maType: "Waiver Related",
    verificationDate: new Date().toLocaleDateString("en-US"),
    recordStatus: "Draft",
    updatedBy: "Babar Nawaz CM",
    updatedOn: new Date().toLocaleDateString("en-US"),
    aiFields: {
      maNumber: "Individual profile",
      maType: "Individual profile",
      verificationDate: "Today",
    },
  };
}

// Compliance helpers — mock "today" is 04/27/2026 (matches ambient session).
const MOCK_TODAY = new Date(2026, 3, 27);

export function daysUntil(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const [m, d, y] = dateStr.split("/").map(Number);
  if (!m || !d || !y) return undefined;
  const target = new Date(y, m - 1, d);
  const ms = target.getTime() - MOCK_TODAY.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export type ComplianceTone = "green" | "amber" | "red";

export function complianceToneFor(days?: number): ComplianceTone {
  if (days === undefined) return "red";
  if (days < 30) return "red";
  if (days < 60) return "amber";
  return "green";
}
