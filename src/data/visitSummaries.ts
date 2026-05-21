// Mock Visit Summary data — structured to be replaceable by real API.

export type VisitStatus = "Draft" | "Submitted" | "Signed";

export interface VisitSignature {
  role: "Case Manager" | "Individual" | "Guardian/Representative";
  name: string;
  signedDate?: string;
  status: "Signed" | "Pending" | "Not required";
}

export interface VisitSummary {
  id: string;
  personId: string;
  visitDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  othersPresent?: string;
  purposeOfSupport?: string;
  annualPlanDate?: string;
  whatIsWorking?: string;
  whatIsNotWorking?: string;
  immediateAction?: string;
  visitSummary?: string;
  nextVisitDate?: string;
  nextVisitTime?: string;
  nextVisitLocation?: string;
  addToCalendar?: boolean;
  createFollowupTask?: boolean;
  status: VisitStatus;
  caseManager: string;
  updatedBy: string;
  updatedOn: string;
  aiPreFilled?: boolean;
  signatures?: VisitSignature[];
  // Tracks which fields were AI-suggested (for the "AI suggested" chip).
  aiFields?: Partial<Record<keyof VisitSummary, string>>; // value = source label
}

const JOSEPH = "joseph-brown";

export const visitSummaries: VisitSummary[] = [
  {
    id: "vs-1124",
    personId: JOSEPH,
    visitDate: "11/24/2024",
    startTime: "10:00",
    endTime: "11:15",
    location: "Carroll County — Joseph's residence",
    othersPresent: "Linda Brown (mother)",
    purposeOfSupport: "Routine quarterly visit",
    whatIsWorking: "Day program engagement remains strong.",
    whatIsNotWorking: "No new concerns reported.",
    immediateAction: "None required.",
    visitSummary: "Joseph in good spirits. Discussed upcoming holiday plans with mother. No service changes needed at this time.",
    nextVisitDate: "02/24/2025",
    nextVisitTime: "10:00",
    addToCalendar: true,
    createFollowupTask: true,
    status: "Submitted",
    caseManager: "Babar Nawaz CM",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "11/26/2024",
    signatures: [
      { role: "Case Manager", name: "Babar Nawaz CM", signedDate: "11/26/2024", status: "Signed" },
      { role: "Individual", name: "Joseph Brown", status: "Pending" },
      { role: "Guardian/Representative", name: "Linda Brown", status: "Not required" },
    ],
  },
  { id: "vs-1125", personId: JOSEPH, visitDate: "11/25/2024", status: "Submitted", caseManager: "Babar Nawaz CM", updatedBy: "Babar Nawaz CM", updatedOn: "11/25/2024" },
  { id: "vs-1121", personId: JOSEPH, visitDate: "11/21/2024", status: "Submitted", caseManager: "Babar Nawaz CM", updatedBy: "Babar Nawaz CM", updatedOn: "11/22/2024" },
  { id: "vs-1117", personId: JOSEPH, visitDate: "11/17/2024", status: "Submitted", caseManager: "Babar Nawaz CM", updatedBy: "Babar Nawaz CM", updatedOn: "11/18/2024" },
  { id: "vs-0529", personId: JOSEPH, visitDate: "05/29/2024", status: "Submitted", caseManager: "Babar Nawaz CM", updatedBy: "Babar Nawaz CM", updatedOn: "06/25/2024" },
  { id: "vs-0418", personId: JOSEPH, visitDate: "04/18/2024", purposeOfSupport: "Need to discuss", status: "Submitted", caseManager: "Demo Case Manager", updatedBy: "Demo Case Manager", updatedOn: "05/24/2024" },
  { id: "vs-1002", personId: JOSEPH, visitDate: "10/02/2023", purposeOfSupport: "Job search", status: "Submitted", caseManager: "Babar Nawaz CM", updatedBy: "Babar Nawaz CM", updatedOn: "10/03/2023" },
];

export function getVisitSummariesForPerson(personId: string): VisitSummary[] {
  const existing = visitSummaries.filter(v => v.personId === personId);
  if (existing.length > 0) return existing;
  return generateVisitsFor(personId);
}

// ---- Synthetic fallback so every individual has visit history ----
function vh(seed: string, n: number): number {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return x % n;
}
function generateVisitsFor(personId: string): VisitSummary[] {
  // 3 quarterly visits going back in time.
  const months = [["04","2026"],["01","2026"],["10","2025"]];
  const cm = ["Babar Nawaz CM","Jennie Thollander","Brenda Smith"][vh(personId, 3)];
  return months.map(([m,y], idx) => ({
    id: `vs-gen-${personId}-${idx}`,
    personId,
    visitDate: `${m}/${10 + vh(personId + m, 18)}/${y}`,
    startTime: "10:00",
    endTime: "11:00",
    location: "Residence",
    othersPresent: idx === 0 ? "Family member present" : "",
    purposeOfSupport: idx === 0 ? "Quarterly check-in" : "Routine monthly visit",
    whatIsWorking: "Stable engagement with day program; no new safety concerns.",
    whatIsNotWorking: idx === 0 ? "Transportation reliability remains an intermittent challenge." : "No new concerns reported.",
    immediateAction: "None required.",
    visitSummary: idx === 0
      ? "Quarterly review completed. Individual reports satisfaction with current supports. Next visit scheduled."
      : "Routine visit. No service changes needed.",
    nextVisitDate: idx === 0 ? `07/${15 + vh(personId, 10)}/2026` : undefined,
    status: idx === 0 ? "Submitted" : "Signed",
    caseManager: cm,
    updatedBy: cm,
    updatedOn: `${m}/${12 + vh(personId + m, 16)}/${y}`,
    signatures: [
      { role: "Case Manager", name: cm, signedDate: `${m}/${12 + vh(personId + m, 16)}/${y}`, status: "Signed" },
      { role: "Individual", name: "—", status: idx === 0 ? "Pending" : "Signed" },
      { role: "Guardian/Representative", name: "—", status: "Not required" },
    ],
  }));
}

export function getVisitSummary(id: string): VisitSummary | undefined {
  return visitSummaries.find(v => v.id === id);
}

// AI pre-filled new visit draft from the 04/27/2026 ambient session.
export function buildAIPreFilledVisit(personId: string): VisitSummary {
  return {
    id: "new",
    personId,
    visitDate: "04/27/2026",
    startTime: "14:00",
    endTime: "14:47",
    location: "Carroll County — Joseph's residence",
    othersPresent: "Linda Brown (mother)",
    purposeOfSupport: "Quarterly check-in and service review",
    annualPlanDate: "08/31/2026",
    whatIsWorking:
      "Joseph is satisfied with his current day program. Engagement with community events has been consistent — 3 events this quarter.",
    whatIsNotWorking:
      "Mother reported behavioral changes at home. Joseph has not yet received employment support despite expressing interest.",
    immediateAction:
      "Behavioral changes reported by primary caregiver. Severity Low-Medium. Recommend monitoring and follow-up with behavioral support team.",
    visitSummary:
      "Discussed quarterly service review. Joseph expressed continued satisfaction with day program. Employment exploration to be added to ISP. Behavioral changes at home to be monitored. Follow-up with behavioral support team planned.",
    nextVisitDate: "07/27/2026",
    nextVisitTime: "14:00",
    nextVisitLocation: "Carroll County — Joseph's residence",
    addToCalendar: true,
    createFollowupTask: true,
    status: "Draft",
    caseManager: "Babar Nawaz CM",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "04/27/2026",
    aiPreFilled: true,
    aiFields: {
      visitDate: "Today",
      startTime: "Ambient session 04/27/2026",
      endTime: "Ambient session 04/27/2026",
      location: "Ambient session 04/27/2026",
      othersPresent: "Ambient session 04/27/2026",
      purposeOfSupport: "Ambient session 04/27/2026",
      annualPlanDate: "Care Plan module",
      whatIsWorking: "Monitoring form 01/26/2026 + ambient session 04/27/2026",
      whatIsNotWorking: "Ambient session 04/27/2026 + risk flag 04/27/2026",
      immediateAction: "Risk flag 04/27/2026",
      visitSummary: "Ambient session 04/27/2026",
      nextVisitDate: "Quarterly requirement (90 days)",
    },
  };
}
