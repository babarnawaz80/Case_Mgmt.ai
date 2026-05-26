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

  // ─── Lisa Anderson (personId "46") — Visit Summaries Oct 2024–May 2025 ──
  {
    id: "vs-la-1028",
    personId: "46",
    visitDate: "10/28/2024",
    startTime: "14:00",
    endTime: "14:45",
    location: "Lisa's residence — 412 Maple St, Carroll, IA",
    othersPresent: "Carol Anderson (mother)",
    purposeOfSupport: "Initial home visit — establish baseline supports and living environment assessment",
    annualPlanDate: "09/30/2025",
    whatIsWorking: "Home environment is clean, organized, and safe. Lisa has a clear daily routine with her mother's support. Existing visual supports (posted schedule) appear effective.",
    whatIsNotWorking: "Lisa currently relies on her mother for most meal preparation and is not yet managing her own spending money. No structured community activities outside of church.",
    immediateAction: "None required at this time.",
    visitSummary: "Completed initial home visit. Met with Lisa and her mother Carol. Reviewed Lisa's daily routine, living environment, and current support needs. Lisa was friendly and engaged — showed interest in cooking and art activities. Discussed goals for the upcoming ISP plan year including independent living skills and community integration. Referral to Carroll Day Services initiated.",
    nextVisitDate: "01/14/2025",
    nextVisitTime: "10:30",
    nextVisitLocation: "Lisa's residence",
    addToCalendar: true,
    createFollowupTask: true,
    status: "Signed",
    caseManager: "Kathy Martinez CM",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "10/30/2024",
    signatures: [
      { role: "Case Manager", name: "Kathy Martinez CM", signedDate: "10/30/2024", status: "Signed" },
      { role: "Individual", name: "Lisa Anderson", signedDate: "10/30/2024", status: "Signed" },
      { role: "Guardian/Representative", name: "Carol Anderson", signedDate: "10/30/2024", status: "Signed" },
    ],
  },
  {
    id: "vs-la-0114",
    personId: "46",
    visitDate: "01/14/2025",
    startTime: "10:30",
    endTime: "11:30",
    location: "Lisa's residence — 412 Maple St, Carroll, IA",
    othersPresent: "Carol Anderson (mother)",
    purposeOfSupport: "Quarterly ISP review visit — review goal progress and day program enrollment",
    annualPlanDate: "09/30/2025",
    whatIsWorking: "Lisa started Carroll Day Services on January 6th and has attended all 6 sessions. Staff report she is enthusiastic and participates actively in cooking and craft activities. Independent living skills improving — making breakfast independently.",
    whatIsNotWorking: "Lisa has not yet enrolled in any community social activities outside the day program. Art class goal not yet started — still researching options.",
    immediateAction: "None required.",
    visitSummary: "Quarterly visit completed. Reviewed all ISP goals with Lisa and Carol. Lisa's mood has noticeably improved since starting the day program. Added art class as a new ISP goal per Lisa's self-advocacy. Updated service plan to reflect day program enrollment. All signatures collected.",
    nextVisitDate: "03/18/2025",
    nextVisitTime: "11:00",
    nextVisitLocation: "Lisa's residence",
    addToCalendar: true,
    createFollowupTask: false,
    status: "Signed",
    caseManager: "Kathy Martinez CM",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "01/16/2025",
    signatures: [
      { role: "Case Manager", name: "Kathy Martinez CM", signedDate: "01/16/2025", status: "Signed" },
      { role: "Individual", name: "Lisa Anderson", signedDate: "01/16/2025", status: "Signed" },
      { role: "Guardian/Representative", name: "Carol Anderson", signedDate: "01/16/2025", status: "Signed" },
    ],
  },
  {
    id: "vs-la-0318",
    personId: "46",
    visitDate: "03/18/2025",
    startTime: "11:00",
    endTime: "12:00",
    location: "Lisa's residence — 412 Maple St, Carroll, IA",
    othersPresent: "Carol Anderson (mother)",
    purposeOfSupport: "Quarterly home visit — behavioral health check-in and goal review",
    annualPlanDate: "09/30/2025",
    whatIsWorking: "No anxiety episodes reported in past 6 weeks. Day program attendance excellent. Lisa independently grocery shops with a list and manages laundry without prompting. Art class attendance consistent — attending Saturday sessions at Carroll Arts Center.",
    whatIsNotWorking: "Transportation to community activities is inconsistent — Carol must arrange rides which limits frequency. Exploring Medicaid transportation options.",
    immediateAction: "None required.",
    visitSummary: "Home visit completed. Reviewed behavioral health status — significant improvement. Lisa showed her artwork (watercolor painting) with evident pride. Discussed transportation barriers. Day program behavioral support staff report no incidents since February. Goal 1 (Independent Living) exceeding expectations. Coordination with day program to expand art activities during program hours initiated.",
    nextVisitDate: "04/15/2025",
    nextVisitTime: "10:00",
    nextVisitLocation: "Lisa's residence",
    addToCalendar: true,
    createFollowupTask: true,
    status: "Signed",
    caseManager: "Kathy Martinez CM",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "03/19/2025",
    signatures: [
      { role: "Case Manager", name: "Kathy Martinez CM", signedDate: "03/19/2025", status: "Signed" },
      { role: "Individual", name: "Lisa Anderson", signedDate: "03/19/2025", status: "Signed" },
      { role: "Guardian/Representative", name: "Carol Anderson", status: "Not required" },
    ],
  },
  {
    id: "vs-la-0415",
    personId: "46",
    visitDate: "04/15/2025",
    startTime: "10:00",
    endTime: "11:15",
    location: "Lisa's residence — 412 Maple St, Carroll, IA",
    othersPresent: "Carol Anderson (mother), Maria Okafor (Carroll Day Services coordinator), Dr. Susan Holt (Behavioral Support Specialist)",
    purposeOfSupport: "Semi-annual ISP review — full team meeting with service updates",
    annualPlanDate: "09/30/2025",
    whatIsWorking: "Outstanding progress across all three ISP goals. Day program attendance 97% over 4 months. Lisa formed friendships with 2 peers. Independent living goal achieved. Art class completed and re-enrolled in intermediate session.",
    whatIsNotWorking: "Transportation remains a challenge. Lisa expressed interest in supported employment but no referral yet in place.",
    immediateAction: "Initiate supported employment exploration per Lisa's request.",
    visitSummary: "Excellent semi-annual review. All team members present. Lisa was confident and self-advocating throughout — requested addition of a transportation independence goal and asked about employment opportunities. Goal 1 (Independent Living) marked achieved. Goals 2 and 3 progressing strongly. Community Living Support hours authorized (10 hrs/week starting April 15). Next steps: supported employment referral, annual eligibility verification before July 1.",
    nextVisitDate: "07/01/2025",
    nextVisitTime: "10:00",
    nextVisitLocation: "Lisa's residence",
    addToCalendar: true,
    createFollowupTask: true,
    status: "Submitted",
    caseManager: "Kathy Martinez CM",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "04/15/2025",
    signatures: [
      { role: "Case Manager", name: "Kathy Martinez CM", signedDate: "04/15/2025", status: "Signed" },
      { role: "Individual", name: "Lisa Anderson", status: "Pending" },
      { role: "Guardian/Representative", name: "Carol Anderson", status: "Pending" },
    ],
  },
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
