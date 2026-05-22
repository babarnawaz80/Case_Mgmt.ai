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

// Portraits depicting people with disabilities (locally bundled).
import p1 from "@/assets/people/p1.jpg";
import p2 from "@/assets/people/p2.jpg";
import p3 from "@/assets/people/p3.jpg";
import p4 from "@/assets/people/p4.jpg";
import p5 from "@/assets/people/p5.jpg";
import p6 from "@/assets/people/p6.jpg";
import p7 from "@/assets/people/p7.jpg";
import p8 from "@/assets/people/p8.jpg";
import p9 from "@/assets/people/p9.jpg";
import p10 from "@/assets/people/p10.jpg";
import p11 from "@/assets/people/p11.jpg";
import p12 from "@/assets/people/p12.jpg";
import p13 from "@/assets/people/p13.jpg";
import p14 from "@/assets/people/p14.jpg";
import p15 from "@/assets/people/p15.jpg";
import p16 from "@/assets/people/p16.jpg";
import p17 from "@/assets/people/p17.jpg";
import p18 from "@/assets/people/p18.jpg";
import p19 from "@/assets/people/p19.jpg";

// Direct photo assignments for ids 1-7 (existing curated mapping)
const PHOTOS: Record<string, string> = {
  "1": p1, "2": p2, "3": p3, "4": p4, "5": p5, "6": p6, "7": p7,
};

// Gendered portrait pools used to assign photos to the rest of the roster
// so every individual on People Supported has a face.
const MALE_POOL = [p8, p10, p12, p15, p17, p19];
const FEMALE_POOL = [p9, p11, p13, p14, p16, p18];

function photoFor(id: string, gender: "M" | "F"): string {
  if (PHOTOS[id]) return PHOTOS[id];
  const pool = gender === "F" ? FEMALE_POOL : MALE_POOL;
  const n = parseInt(id, 10) || 0;
  return pool[n % pool.length];
}



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
  // --- Extended demo cohort (no photos; avatar falls back to initials) ---
  { id: "8",  firstName: "Maria",     lastName: "Gonzalez",   gender: "F", dob: "03/14/1988", age: 38, admittedOn: "02/12/2021", county: "Polk County",      status: "Active",     riskScore: 64, serviceContact: "Jennie Thollander", updatedOn: "07/22/2025", allergies: "Latex",                  aiFlag: { tone: "urgent",    label: "Hospitalization 30d",  detail: "Returned from ER 12 days ago — follow-up call required." } },
  { id: "9",  firstName: "Devon",     lastName: "Carter",     gender: "M", dob: "11/02/1995", age: 30, admittedOn: "05/01/2020", county: "Linn County",       status: "Active",     riskScore: 28, serviceContact: "Babar Nawaz CM",    updatedOn: "07/30/2025" },
  { id: "10", firstName: "Aisha",     lastName: "Khan",       gender: "F", dob: "07/19/1992", age: 33, admittedOn: "11/15/2022", county: "Johnson County",    status: "Active",     riskScore: 55, serviceContact: "Brenda Smith",       updatedOn: "08/02/2025", aiFlag: { tone: "attention", label: "ISP review due",       detail: "Annual ISP review window opens in 6 days." } },
  { id: "11", firstName: "Marcus",    lastName: "Reed",       gender: "M", dob: "09/30/1980", age: 45, admittedOn: "01/04/2019", county: "Dubuque County",    status: "Active",     riskScore: 73, serviceContact: "Jennie Thollander", updatedOn: "08/05/2025", allergies: "Sulfa drugs",            aiFlag: { tone: "urgent",    label: "2 unsigned notes",     detail: "Contact notes from 07/30 and 08/02 awaiting supervisor signature." } },
  { id: "12", firstName: "Priya",     lastName: "Patel",      gender: "F", dob: "04/22/1998", age: 27, admittedOn: "06/20/2023", county: "Story County",      status: "Active",     riskScore: 31, serviceContact: "Babar Nawaz CM",    updatedOn: "08/04/2025" },
  { id: "13", firstName: "Liam",      lastName: "O'Connor",   gender: "M", dob: "12/11/1985", age: 40, admittedOn: "09/01/2018", county: "Black Hawk County", status: "Active",     riskScore: 48, serviceContact: "Brenda Smith",       updatedOn: "07/28/2025", aiFlag: { tone: "insight",   label: "Goal progress",        detail: "Met 2 of 3 ISP goals last quarter." } },
  { id: "14", firstName: "Hannah",    lastName: "Berg",       gender: "F", dob: "08/03/2001", age: 24, admittedOn: "10/15/2024", county: "Scott County",      status: "Pending",    riskScore: 22, serviceContact: "Jennie Thollander", updatedOn: "08/06/2025" },
  { id: "15", firstName: "Tyrell",    lastName: "Washington", gender: "M", dob: "06/06/1976", age: 49, admittedOn: "03/12/2017", county: "Pottawattamie",     status: "Active",     riskScore: 81, serviceContact: "Jennie Thollander", updatedOn: "08/07/2025", allergies: "Peanuts",                aiFlag: { tone: "urgent",    label: "BP trending high",     detail: "3 of last 4 BP readings >150/95. Notify PCP." } },
  { id: "16", firstName: "Sofia",     lastName: "Hernandez",  gender: "F", dob: "02/28/1994", age: 31, admittedOn: "07/19/2022", county: "Woodbury County",   status: "Active",     riskScore: 36, serviceContact: "Babar Nawaz CM",    updatedOn: "08/01/2025" },
  { id: "17", firstName: "Ethan",     lastName: "Nguyen",     gender: "M", dob: "10/14/1989", age: 36, admittedOn: "04/04/2020", county: "Cerro Gordo",       status: "Active",     riskScore: 52, serviceContact: "Brenda Smith",       updatedOn: "07/26/2025", aiFlag: { tone: "attention", label: "Med refill 5d",        detail: "Sertraline refill window opens 08/12." } },
  { id: "18", firstName: "Naomi",     lastName: "Foster",     gender: "F", dob: "05/17/1983", age: 42, admittedOn: "08/22/2019", county: "Marshall County",   status: "Active",     riskScore: 67, serviceContact: "Jennie Thollander", updatedOn: "08/03/2025", allergies: "Codeine",                aiFlag: { tone: "urgent",    label: "Incident 48h",         detail: "Fall reported 08/05 — incident review pending." } },
  { id: "19", firstName: "Jamal",     lastName: "Bryant",     gender: "M", dob: "01/25/1972", age: 53, admittedOn: "11/03/2015", county: "Des Moines County", status: "Active",     riskScore: 59, serviceContact: "Babar Nawaz CM",    updatedOn: "07/29/2025" },
  { id: "20", firstName: "Olivia",    lastName: "Sanders",    gender: "F", dob: "09/12/2002", age: 23, admittedOn: "01/10/2024", county: "Jasper County",     status: "Active",     riskScore: 19, serviceContact: "Brenda Smith",       updatedOn: "08/04/2025", aiFlag: { tone: "insight",   label: "Stable 90d",           detail: "No incidents or escalations in last 90 days." } },
  { id: "21", firstName: "Carlos",    lastName: "Mendoza",    gender: "M", dob: "03/08/1991", age: 34, admittedOn: "05/05/2021", county: "Carroll County",    status: "Active",     riskScore: 44, serviceContact: "Jennie Thollander", updatedOn: "08/02/2025" },
  { id: "22", firstName: "Grace",     lastName: "Thompson",   gender: "F", dob: "11/30/1979", age: 46, admittedOn: "02/14/2016", county: "Clinton County",    status: "Active",     riskScore: 71, serviceContact: "Babar Nawaz CM",    updatedOn: "08/06/2025", allergies: "Iodine",                 aiFlag: { tone: "urgent",    label: "Behavior plan stale",  detail: "BSP last updated 14 months ago — review required." } },
  { id: "23", firstName: "Ahmed",     lastName: "Hassan",     gender: "M", dob: "07/02/1996", age: 29, admittedOn: "09/19/2023", county: "Linn County",       status: "Active",     riskScore: 33, serviceContact: "Brenda Smith",       updatedOn: "07/31/2025" },
  { id: "24", firstName: "Rebecca",   lastName: "Klein",      gender: "F", dob: "04/15/1987", age: 38, admittedOn: "06/30/2020", county: "Johnson County",    status: "Active",     riskScore: 50, serviceContact: "Jennie Thollander", updatedOn: "08/05/2025", aiFlag: { tone: "attention", label: "Vision exam due",      detail: "Annual vision exam overdue by 22 days." } },
  { id: "25", firstName: "Andre",     lastName: "Walker",     gender: "M", dob: "08/21/1968", age: 57, admittedOn: "12/01/2012", county: "Polk County",       status: "Active",     riskScore: 78, serviceContact: "Babar Nawaz CM",    updatedOn: "08/07/2025", allergies: "Aspirin",                aiFlag: { tone: "urgent",    label: "Multiple comorbidities", detail: "Diabetes + hypertension + COPD — high-touch monitoring." } },
  { id: "26", firstName: "Isabel",    lastName: "Cruz",       gender: "F", dob: "06/09/1999", age: 26, admittedOn: "04/22/2024", county: "Story County",      status: "Active",     riskScore: 26, serviceContact: "Brenda Smith",       updatedOn: "07/27/2025" },
  { id: "27", firstName: "Nathan",    lastName: "Park",       gender: "M", dob: "02/17/1984", age: 41, admittedOn: "07/14/2018", county: "Black Hawk County", status: "Active",     riskScore: 47, serviceContact: "Jennie Thollander", updatedOn: "08/01/2025" },
  { id: "28", firstName: "Yolanda",   lastName: "Brooks",     gender: "F", dob: "12/03/1974", age: 50, admittedOn: "08/09/2015", county: "Scott County",      status: "Active",     riskScore: 62, serviceContact: "Babar Nawaz CM",    updatedOn: "08/06/2025", aiFlag: { tone: "urgent",    label: "Medication interaction", detail: "Newly prescribed warfarin conflicts with existing NSAID." } },
  { id: "29", firstName: "Diego",     lastName: "Ramirez",    gender: "M", dob: "10/26/1993", age: 32, admittedOn: "01/30/2022", county: "Pottawattamie",     status: "Active",     riskScore: 39, serviceContact: "Brenda Smith",       updatedOn: "07/30/2025" },
  { id: "30", firstName: "Chloe",     lastName: "Anderson",   gender: "F", dob: "05/04/2005", age: 20, admittedOn: "09/01/2024", county: "Woodbury County",   status: "Pending",    riskScore: 18, serviceContact: "Jennie Thollander", updatedOn: "08/05/2025", aiFlag: { tone: "insight",   label: "Intake incomplete",    detail: "3 of 7 intake documents pending signature." } },
  { id: "31", firstName: "Marcus",    lastName: "Ellis",      gender: "M", dob: "09/19/1981", age: 44, admittedOn: "03/22/2017", county: "Cerro Gordo",       status: "Active",     riskScore: 56, serviceContact: "Babar Nawaz CM",    updatedOn: "08/04/2025" },
  { id: "32", firstName: "Tara",      lastName: "Whitfield",  gender: "F", dob: "07/27/1986", age: 39, admittedOn: "11/08/2019", county: "Marshall County",   status: "Active",     riskScore: 43, serviceContact: "Brenda Smith",       updatedOn: "07/29/2025" },
  { id: "33", firstName: "Kenji",     lastName: "Tanaka",     gender: "M", dob: "01/13/1990", age: 35, admittedOn: "06/17/2021", county: "Des Moines County", status: "Active",     riskScore: 30, serviceContact: "Jennie Thollander", updatedOn: "07/28/2025" },
  { id: "34", firstName: "Emma",      lastName: "Schultz",    gender: "F", dob: "04/02/1978", age: 47, admittedOn: "02/19/2016", county: "Jasper County",     status: "Active",     riskScore: 66, serviceContact: "Babar Nawaz CM",    updatedOn: "08/03/2025", allergies: "Shellfish",              aiFlag: { tone: "attention", label: "Dental cleaning due",  detail: "6-month dental cleaning overdue." } },
  { id: "35", firstName: "Rashid",    lastName: "Ali",        gender: "M", dob: "11/22/1997", age: 28, admittedOn: "10/03/2023", county: "Carroll County",    status: "Active",     riskScore: 24, serviceContact: "Brenda Smith",       updatedOn: "07/26/2025" },
  { id: "36", firstName: "Lillian",   lastName: "Carter",     gender: "F", dob: "08/14/1965", age: 60, admittedOn: "05/06/2010", county: "Clinton County",    status: "Active",     riskScore: 84, serviceContact: "Jennie Thollander", updatedOn: "08/07/2025", allergies: "Morphine",               aiFlag: { tone: "urgent",    label: "Hospice consult flag", detail: "AI detected decline pattern in last 60d of progress notes." } },
  { id: "37", firstName: "Brandon",   lastName: "Fischer",    gender: "M", dob: "06/29/2000", age: 25, admittedOn: "03/15/2024", county: "Linn County",       status: "Active",     riskScore: 35, serviceContact: "Babar Nawaz CM",    updatedOn: "08/02/2025" },
  { id: "38", firstName: "Vanessa",   lastName: "Long",       gender: "F", dob: "02/10/1982", age: 43, admittedOn: "07/01/2018", county: "Johnson County",    status: "Active",     riskScore: 51, serviceContact: "Brenda Smith",       updatedOn: "07/31/2025", aiFlag: { tone: "insight",   label: "Job placement win",    detail: "Started part-time community employment 4 weeks ago." } },
  { id: "39", firstName: "Hector",    lastName: "Vega",       gender: "M", dob: "12/05/1973", age: 52, admittedOn: "08/24/2014", county: "Polk County",       status: "Active",     riskScore: 69, serviceContact: "Jennie Thollander", updatedOn: "08/06/2025" },
  { id: "40", firstName: "Sasha",     lastName: "Petrov",     gender: "F", dob: "03/30/1995", age: 30, admittedOn: "12/12/2022", county: "Story County",      status: "Active",     riskScore: 41, serviceContact: "Babar Nawaz CM",    updatedOn: "08/04/2025" },
  { id: "41", firstName: "Wesley",    lastName: "Tran",       gender: "M", dob: "10/09/1988", age: 37, admittedOn: "04/18/2020", county: "Black Hawk County", status: "Active",     riskScore: 58, serviceContact: "Brenda Smith",       updatedOn: "08/05/2025", aiFlag: { tone: "attention", label: "Annual physical due",  detail: "Annual wellness exam due within 30 days." } },
  { id: "42", firstName: "Naya",      lastName: "Robinson",   gender: "F", dob: "05/22/2004", age: 21, admittedOn: "08/05/2024", county: "Scott County",      status: "Active",     riskScore: 27, serviceContact: "Jennie Thollander", updatedOn: "07/30/2025" },
  { id: "43", firstName: "Owen",      lastName: "MacLeod",    gender: "M", dob: "07/11/1969", age: 56, admittedOn: "11/22/2012", county: "Pottawattamie",     status: "Discharged", riskScore: 0,  serviceContact: "Babar Nawaz CM",    updatedOn: "06/15/2025", aiFlag: { tone: "insight",   label: "Discharged 06/2025",   detail: "Transitioned to community supports — file retained for audit." } },
  { id: "44", firstName: "Beatrice",  lastName: "Holloway",   gender: "F", dob: "09/08/1959", age: 66, admittedOn: "06/18/2008", county: "Woodbury County",   status: "Active",     riskScore: 76, serviceContact: "Brenda Smith",       updatedOn: "08/07/2025", allergies: "Penicillin, Sulfa",      aiFlag: { tone: "urgent",    label: "Fall risk elevated",   detail: "2 falls in last 60d — PT consult recommended." } },
  { id: "45", firstName: "Jordan",    lastName: "Mitchell",   gender: "M", dob: "01/16/2007", age: 18, admittedOn: "07/25/2025", county: "Cerro Gordo",       status: "Pending",    riskScore: 15, serviceContact: "Jennie Thollander", updatedOn: "08/06/2025", aiFlag: { tone: "insight",   label: "New intake",           detail: "Recently turned 18 — transition from youth services in progress." } },
].map((p) => ({ ...p, photoUrl: photoFor(p.id, p.gender as "M" | "F") })) as Person[];


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
