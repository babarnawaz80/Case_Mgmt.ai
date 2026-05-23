// Mock On-Call Log data — backup case manager call log.

export type OnCallUrgency = "Routine" | "Urgent" | "Emergency";
export type OnCallStatus = "Open" | "In Progress" | "Resolved";
export type OnCallCategory =
  | "Medical"
  | "Behavioral"
  | "Medication"
  | "Staffing"
  | "Incident"
  | "Transportation"
  | "Family Concern"
  | "Other";
export type CallerType =
  | "Individual (Self)"
  | "Family / Guardian"
  | "Direct Support Staff"
  | "House Manager"
  | "Provider / Clinician"
  | "Hospital / ER"
  | "Other";

export interface OnCallLogEntry {
  id: string;
  /** Person supported the call concerns (optional — sometimes call is general) */
  personId?: string;
  /** Date the call was received */
  callDate: string;
  /** Time call received HH:MM */
  callStartTime: string;
  /** Time call ended HH:MM */
  callEndTime?: string;
  callerName: string;
  callerType: CallerType;
  callerPhone: string;
  callbackNumber?: string;
  category: OnCallCategory;
  urgency: OnCallUrgency;
  reason: string;
  actionTaken: string;
  referrals?: string;
  supervisorNotified: boolean;
  supervisorName?: string;
  followUpRequired: boolean;
  followUpBy?: string;
  followUpDue?: string;
  status: OnCallStatus;
  receivedBy: string;
  notes?: string;
  createdAt: string;
}

export const onCallLogs: OnCallLogEntry[] = [
  {
    id: "oc-001",
    personId: "travis-langston",
    callDate: "2026-05-21",
    callStartTime: "21:14",
    callEndTime: "21:32",
    callerName: "Maria Hernandez",
    callerType: "Direct Support Staff",
    callerPhone: "(214) 555-0173",
    callbackNumber: "(214) 555-0173",
    category: "Behavioral",
    urgency: "Urgent",
    reason:
      "Travis became agitated after refusing evening meds. Staff requested guidance on de-escalation and PRN protocol.",
    actionTaken:
      "Reviewed BSP. Authorized PRN per standing order. Walked staff through redirection steps. Confirmed environment safe.",
    referrals: "On-call nurse paged for medication question.",
    supervisorNotified: true,
    supervisorName: "Jennifer Thollander",
    followUpRequired: true,
    followUpBy: "Kathy Adams",
    followUpDue: "2026-05-22",
    status: "Resolved",
    receivedBy: "Kathy Adams",
    notes: "Incident report to be filed by AM staff.",
    createdAt: "2026-05-21 21:33",
  },
  {
    id: "oc-002",
    personId: "daniel-okafor",
    callDate: "2026-05-20",
    callStartTime: "02:47",
    callEndTime: "03:05",
    callerName: "Parkland ER Charge Nurse",
    callerType: "Hospital / ER",
    callerPhone: "(214) 590-8000",
    callbackNumber: "(214) 590-8000",
    category: "Medical",
    urgency: "Emergency",
    reason:
      "Daniel transported by EMS after a fall at the group home. Awake, alert, suspected wrist fracture.",
    actionTaken:
      "Confirmed insurance, faxed face sheet and allergies. Contacted guardian. Coordinated transport plan.",
    referrals: "Guardian notified, PCP office paged for AM follow-up.",
    supervisorNotified: true,
    supervisorName: "Jennifer Thollander",
    followUpRequired: true,
    followUpBy: "Kathy Adams",
    followUpDue: "2026-05-20",
    status: "Resolved",
    receivedBy: "Kathy Adams",
    createdAt: "2026-05-20 03:06",
  },
  {
    id: "oc-003",
    personId: "aisha-boateng",
    callDate: "2026-05-19",
    callStartTime: "19:02",
    callEndTime: "19:11",
    callerName: "Aisha Boateng",
    callerType: "Individual (Self)",
    callerPhone: "(469) 555-2204",
    callbackNumber: "(469) 555-2204",
    category: "Family Concern",
    urgency: "Routine",
    reason:
      "Aisha called feeling lonely after roommate moved out. Asked when her case manager would visit next.",
    actionTaken:
      "Provided active listening. Confirmed Kathy's next visit on Thursday. Reassured caller and offered crisis line if needed.",
    supervisorNotified: false,
    followUpRequired: true,
    followUpBy: "Kathy Adams",
    followUpDue: "2026-05-23",
    status: "In Progress",
    receivedBy: "Kathy Adams",
    createdAt: "2026-05-19 19:12",
  },
];
