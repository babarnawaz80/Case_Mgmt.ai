// Shared mock data for People Supported and eChart.
// Structured so a real API can replace the static export later.

export type AIFlagTone = "urgent" | "attention" | "insight";

export interface AIFlag {
  tone: AIFlagTone;
  label: string; // short chip text shown on the row
  detail?: string; // tooltip / longer explanation
}

export interface AISuggestion {
  tone: "urgent" | "insight" | "good";
  label: string;
  body: string;
  cta: string;
}

export type PersonStatus = "Active" | "Pending" | "Discharged";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: "M" | "F";
  dob: string; // MM/DD/YYYY
  age: number;
  admittedOn: string;
  county: string;
  status: PersonStatus;
  riskScore?: number;
  serviceContact?: string;
  updatedOn: string;
  allergies?: string;
  specialInstructions?: string;
  photoUrl?: string;
  aiFlag?: AIFlag;
  aiSuggestions?: AISuggestion[];
}

// Stable demo portraits (pravatar deterministic by img id).
const PHOTOS: Record<string, string> = {
  "1": "https://i.pravatar.cc/160?img=12",
  "2": "https://i.pravatar.cc/160?img=33",
  "3": "https://i.pravatar.cc/160?img=15",
  "4": "https://i.pravatar.cc/160?img=68",
  "5": "https://i.pravatar.cc/160?img=51",
  "6": "https://i.pravatar.cc/160?img=47",
  "7": "https://i.pravatar.cc/160?img=45",
};


export const people: Person[] = [
  {
    id: "1",
    firstName: "Joseph",
    lastName: "Brown",
    nickname: "Joe",
    gender: "M",
    dob: "01/01/1990",
    age: 36,
    admittedOn: "09/01/2022",
    county: "Carroll County",
    status: "Active",
    riskScore: 71,
    serviceContact: "Jennie Thollander",
    updatedOn: "08/01/2023",
    allergies: "Penicillin",
    specialInstructions: "Requires interpreter for clinical visits.",
    aiFlag: { tone: "urgent", label: "ISP overdue", detail: "ISP review is 8 days past due." },
    aiSuggestions: [
      {
        tone: "urgent",
        label: "Urgent",
        body: "ISP review overdue by 8 days. Draft talking points generated from last quarter's notes.",
        cta: "Open draft",
      },
      {
        tone: "insight",
        label: "Insight",
        body: "Last monitoring form completed 3 months ago. Next one due in 7 days.",
        cta: "Start form",
      },
      {
        tone: "insight",
        label: "Insight",
        body: "2 unsigned contact notes from last week.",
        cta: "Review",
      },
    ],
  },
  {
    id: "2",
    firstName: "Travis",
    lastName: "Langston",
    gender: "M",
    dob: "01/05/2000",
    age: 26,
    admittedOn: "01/01/2021",
    county: "Dallas County",
    status: "Active",
    riskScore: 42,
    serviceContact: "Brenda Smith",
    updatedOn: "08/01/2023",
    allergies: "None known",
  },
  {
    id: "3",
    firstName: "Dwight",
    lastName: "Doe",
    gender: "M",
    dob: "05/05/2024",
    age: 1,
    admittedOn: "09/15/1993",
    county: "Franklin County",
    status: "Active",
    updatedOn: "11/01/2024",
  },
  {
    id: "4",
    firstName: "Mohsin",
    lastName: "Raza",
    gender: "M",
    dob: "05/06/2020",
    age: 5,
    admittedOn: "09/15/2023",
    county: "Bremer County",
    status: "Active",
    updatedOn: "09/19/2023",
    aiFlag: {
      tone: "attention",
      label: "Monitoring form due",
      detail: "Quarterly monitoring form is due in 4 days.",
    },
  },
  {
    id: "5",
    firstName: "Muhammad",
    lastName: "Raaza",
    gender: "M",
    dob: "01/29/2013",
    age: 13,
    admittedOn: "01/01/2024",
    county: "Carroll County",
    status: "Active",
    updatedOn: "06/12/2024",
  },
  {
    id: "6",
    firstName: "Steve",
    lastName: "Smith",
    gender: "F",
    dob: "01/01/2001",
    age: 25,
    admittedOn: "06/01/2020",
    county: "Franklin County",
    status: "Active",
    riskScore: 38,
    updatedOn: "01/15/2025",
  },
  {
    id: "7",
    firstName: "Ashley",
    lastName: "Walker",
    nickname: "AJ",
    gender: "F",
    dob: "01/01/2003",
    age: 23,
    admittedOn: "03/10/2023",
    county: "Clinton",
    status: "Active",
    serviceContact: "Babar Nawaz CM",
    updatedOn: "02/01/2025",
    aiFlag: {
      tone: "insight",
      label: "PCP renewal in 14 days",
      detail: "Person-Centered Plan is approaching renewal window.",
    },
  },
].map((p) => ({ ...p, photoUrl: PHOTOS[p.id] })) as Person[];


export function getPerson(id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

// Risk-driven avatar tinting
export function riskAvatarClass(score?: number): string {
  if (score === undefined) return "bg-icm-bg text-icm-text-dim border-icm-border";
  if (score >= 60) return "bg-icm-red-soft text-icm-red border-icm-red/20";
  if (score >= 35) return "bg-icm-amber-soft text-icm-amber border-icm-amber/20";
  return "bg-icm-green-soft text-icm-green border-icm-green/20";
}

export function riskScoreClass(score?: number): string {
  if (score === undefined) return "text-icm-text-faint";
  if (score >= 60) return "text-icm-red";
  if (score >= 35) return "text-icm-amber";
  return "text-icm-green";
}

export function initials(p: Person): string {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
}

// AI flag styling shared between list and chips
export const flagStyles: Record<AIFlagTone, { bg: string; text: string; ring: string }> = {
  urgent: {
    bg: "bg-icm-red-soft",
    text: "text-icm-red",
    ring: "ring-icm-red/20",
  },
  attention: {
    bg: "bg-icm-amber-soft",
    text: "text-icm-amber",
    ring: "ring-icm-amber/20",
  },
  insight: {
    bg: "bg-icm-accent-soft",
    text: "text-icm-accent",
    ring: "ring-icm-accent/20",
  },
};
