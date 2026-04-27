// Assessment templates, runtime instances, and standardized instruments.
// Pure mock layer — no persistence beyond module-level mutable arrays.

export type QuestionType =
  | "short_text"
  | "long_text"
  | "number"
  | "yes_no"
  | "yes_no_na"
  | "single_select"
  | "single_radio"
  | "multi_select"
  | "likert"
  | "rating"
  | "scored_choice"
  | "independence_level"
  | "date"
  | "date_range"
  | "table"
  | "repeating_group"
  | "section_header"
  | "instructions"
  | "divider"
  | "file_upload"
  | "esignature"
  | "date_initials";

export interface QuestionOption {
  label: string;
  score?: number;
}

export interface ConditionalRule {
  questionId: string;
  operator: "equals" | "not_equals" | "gt" | "lt" | "answered" | "not_answered";
  value?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  unit?: string;
  likertPoints?: 3 | 5 | 7;
  likertLabels?: string[];
  followUpIfYes?: { type: "short_text" | "long_text"; placeholder?: string };
  followUpIfNo?: { type: "short_text" | "long_text"; placeholder?: string };
  showScore?: boolean;
  useForLOC?: boolean;
  charLimit?: number;
  body?: string; // for instructions
  conditional?: ConditionalRule[];
}

export type DomainKey =
  | "ADL"
  | "IADL"
  | "Communication"
  | "Behavioral"
  | "Health"
  | "Cognitive"
  | "Social"
  | "Employment"
  | "Financial"
  | "Legal"
  | "Environmental"
  | "Custom";

export interface AssessmentSection {
  id: string;
  name: string;
  domain?: DomainKey;
  questions: Question[];
}

export type TemplateStatus = "draft" | "published" | "archived";
export type TemplateType =
  | "Initial"
  | "Annual"
  | "Significant Change"
  | "Transition"
  | "Screening"
  | "Custom";

export interface LOCThresholds {
  low: number;
  moderate: number;
  high: number;
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  type: TemplateType;
  description?: string;
  version: string;
  status: TemplateStatus;
  updatedAt: string;
  sections: AssessmentSection[];
  scoringEnabled: boolean;
  loc: LOCThresholds;
  estimatedMinutes: number;
  signatureRequirements: {
    caseManager: boolean;
    individual: boolean;
    guardian: boolean;
    supervisor: boolean;
  };
  frequency:
    | "One-time"
    | "Annual"
    | "Semi-annual"
    | "Quarterly"
    | "As needed";
}

// ---------- LIBRARY (pre-built starting points) ----------

const adlQuestion = (id: string, label: string): Question => ({
  id,
  type: "independence_level",
  label,
  required: true,
  showScore: true,
  useForLOC: true,
});

const compInitial: AssessmentTemplate = {
  id: "tpl-comp-initial",
  name: "Comprehensive Initial Assessment",
  type: "Initial",
  description:
    "Full intake assessment covering 12 domains. Drives LOC, ISP goals, and service authorization.",
  version: "v2.0",
  status: "published",
  updatedAt: "01/12/2026",
  scoringEnabled: true,
  estimatedMinutes: 45,
  frequency: "One-time",
  signatureRequirements: {
    caseManager: true,
    individual: true,
    guardian: false,
    supervisor: false,
  },
  loc: { low: 40, moderate: 80, high: 110 },
  sections: [
    {
      id: "s-demo",
      name: "Demographics & Identity",
      questions: [
        { id: "q-name", type: "short_text", label: "Preferred name", required: true },
        { id: "q-dob", type: "date", label: "Date of birth", required: true },
        { id: "q-lang", type: "short_text", label: "Primary language" },
      ],
    },
    {
      id: "s-adl",
      name: "Activities of Daily Living (ADLs)",
      domain: "ADL",
      questions: [
        adlQuestion("q-adl-bath", "Bathing"),
        adlQuestion("q-adl-dress", "Dressing"),
        adlQuestion("q-adl-groom", "Grooming & hygiene"),
        adlQuestion("q-adl-eat", "Eating"),
        adlQuestion("q-adl-toilet", "Toileting"),
        adlQuestion("q-adl-mob", "Mobility & transfers"),
        adlQuestion("q-adl-cont", "Continence"),
      ],
    },
    {
      id: "s-iadl",
      name: "Instrumental ADLs (IADLs)",
      domain: "IADL",
      questions: [
        adlQuestion("q-iadl-phone", "Phone & communication"),
        adlQuestion("q-iadl-shop", "Shopping"),
        adlQuestion("q-iadl-meal", "Meal preparation"),
        adlQuestion("q-iadl-clean", "Housekeeping"),
        adlQuestion("q-iadl-laundry", "Laundry"),
        adlQuestion("q-iadl-trans", "Transportation"),
        adlQuestion("q-iadl-meds", "Medication management"),
        adlQuestion("q-iadl-fin", "Financial management"),
      ],
    },
    {
      id: "s-comm",
      name: "Communication & Language",
      domain: "Communication",
      questions: [
        {
          id: "q-comm-mode",
          type: "single_radio",
          label: "Primary mode of communication",
          required: true,
          options: [
            { label: "Verbal" },
            { label: "Sign / gestures" },
            { label: "AAC device" },
            { label: "Picture-based" },
          ],
        },
        {
          id: "q-comm-narr",
          type: "long_text",
          label: "Describe receptive & expressive abilities",
          charLimit: 1000,
        },
      ],
    },
    {
      id: "s-beh",
      name: "Behavioral & Emotional",
      domain: "Behavioral",
      questions: [
        {
          id: "q-beh-concerns",
          type: "yes_no",
          label: "Are there current behavioral concerns?",
          required: true,
          followUpIfYes: {
            type: "long_text",
            placeholder: "Describe behaviors, frequency, and triggers…",
          },
        },
        {
          id: "q-beh-freq",
          type: "scored_choice",
          label: "Frequency of challenging behaviors",
          showScore: true,
          useForLOC: true,
          options: [
            { label: "Never", score: 0 },
            { label: "Monthly", score: 1 },
            { label: "Weekly", score: 2 },
            { label: "Daily", score: 3 },
            { label: "Multiple times a day", score: 4 },
          ],
        },
      ],
    },
    {
      id: "s-health",
      name: "Health & Medical",
      domain: "Health",
      questions: [
        { id: "q-h-dx", type: "long_text", label: "Primary diagnoses", required: true },
        { id: "q-h-meds", type: "long_text", label: "Current medications" },
        {
          id: "q-h-seiz",
          type: "yes_no",
          label: "Seizure disorder?",
          followUpIfYes: { type: "short_text", placeholder: "Last seizure date / type" },
        },
      ],
    },
    {
      id: "s-cog",
      name: "Cognitive & Learning",
      domain: "Cognitive",
      questions: [
        {
          id: "q-cog-level",
          type: "scored_choice",
          label: "Cognitive support need",
          showScore: true,
          useForLOC: true,
          options: [
            { label: "Independent", score: 0 },
            { label: "Mild support", score: 2 },
            { label: "Moderate support", score: 4 },
            { label: "Extensive support", score: 6 },
          ],
        },
      ],
    },
    {
      id: "s-soc",
      name: "Social & Community",
      domain: "Social",
      questions: [
        { id: "q-soc-rel", type: "long_text", label: "Important relationships" },
        { id: "q-soc-act", type: "long_text", label: "Preferred community activities" },
      ],
    },
    {
      id: "s-emp",
      name: "Employment & Education",
      domain: "Employment",
      questions: [
        {
          id: "q-emp-status",
          type: "single_radio",
          label: "Current employment status",
          options: [
            { label: "Competitive employment" },
            { label: "Supported employment" },
            { label: "Day program" },
            { label: "Not employed" },
          ],
        },
      ],
    },
    {
      id: "s-fin",
      name: "Financial & Benefits",
      domain: "Financial",
      questions: [
        { id: "q-fin-rep", type: "yes_no", label: "Has representative payee?" },
        {
          id: "q-fin-ben",
          type: "multi_select",
          label: "Benefits received",
          options: [
            { label: "SSI" },
            { label: "SSDI" },
            { label: "SNAP" },
            { label: "Section 8" },
          ],
        },
      ],
    },
    {
      id: "s-legal",
      name: "Legal & Safety",
      domain: "Legal",
      questions: [
        {
          id: "q-legal-guard",
          type: "single_radio",
          label: "Guardianship status",
          required: true,
          options: [
            { label: "Independent" },
            { label: "Supported decision-making" },
            { label: "Limited guardianship" },
            { label: "Full guardianship" },
          ],
        },
      ],
    },
    {
      id: "s-env",
      name: "Environmental & Housing",
      domain: "Environmental",
      questions: [
        {
          id: "q-env-living",
          type: "single_radio",
          label: "Current living situation",
          required: true,
          options: [
            { label: "Family home" },
            { label: "Independent apartment" },
            { label: "Group home" },
            { label: "Supported living" },
          ],
        },
      ],
    },
  ],
};

const annualReassessment: AssessmentTemplate = {
  ...compInitial,
  id: "tpl-annual",
  name: "Annual Reassessment",
  type: "Annual",
  description:
    "Annual update focused on changes since last assessment. Drives reauthorization.",
  version: "v1.1",
  estimatedMinutes: 30,
  frequency: "Annual",
  updatedAt: "02/04/2026",
  // 10 of the 12 sections
  sections: compInitial.sections.slice(0, 10),
};

const intakeScreening: AssessmentTemplate = {
  id: "tpl-screening",
  name: "Intake Screening",
  type: "Screening",
  description: "Quick eligibility and needs screen used at intake.",
  version: "v1.0",
  status: "published",
  updatedAt: "11/01/2025",
  scoringEnabled: false,
  estimatedMinutes: 12,
  frequency: "One-time",
  signatureRequirements: {
    caseManager: true,
    individual: false,
    guardian: false,
    supervisor: false,
  },
  loc: { low: 10, moderate: 20, high: 30 },
  sections: [
    {
      id: "scr-1",
      name: "Eligibility",
      questions: [
        { id: "scr-q1", type: "yes_no", label: "Has IDD diagnosis on record?", required: true },
        { id: "scr-q2", type: "yes_no", label: "Maryland resident?", required: true },
        { id: "scr-q3", type: "date", label: "Date of diagnosis" },
      ],
    },
    {
      id: "scr-2",
      name: "Immediate Needs",
      questions: [
        {
          id: "scr-q4",
          type: "multi_select",
          label: "Immediate support needs",
          options: [
            { label: "Housing" },
            { label: "Employment" },
            { label: "Health care" },
            { label: "Behavioral support" },
          ],
        },
      ],
    },
    {
      id: "scr-3",
      name: "Risk Screen",
      questions: [
        { id: "scr-q5", type: "yes_no", label: "Any active safety risks?" },
      ],
    },
    {
      id: "scr-4",
      name: "Next Steps",
      questions: [
        { id: "scr-q6", type: "long_text", label: "Recommended next steps" },
      ],
    },
  ],
};

const mddaLoc: AssessmentTemplate = {
  id: "tpl-mdda-loc",
  name: "Maryland DDA LOC Assessment",
  type: "Custom",
  description: "Maryland DDA Level of Care determination tool.",
  version: "v1.0",
  status: "draft",
  updatedAt: "02/20/2026",
  scoringEnabled: true,
  estimatedMinutes: 35,
  frequency: "Annual",
  signatureRequirements: {
    caseManager: true,
    individual: false,
    guardian: false,
    supervisor: true,
  },
  loc: { low: 25, moderate: 50, high: 75 },
  sections: compInitial.sections.slice(0, 8),
};

export const templates: AssessmentTemplate[] = [
  compInitial,
  annualReassessment,
  intakeScreening,
  mddaLoc,
];

export function getTemplate(id: string) {
  return templates.find((t) => t.id === id);
}

export function templateSummary() {
  return {
    total: templates.length,
    published: templates.filter((t) => t.status === "published").length,
    draft: templates.filter((t) => t.status === "draft").length,
    archived: templates.filter((t) => t.status === "archived").length,
  };
}

// ---------- COMPLETED ASSESSMENTS ----------

export type AssessmentStatus = "Draft" | "In Progress" | "Completed";

export interface AssessmentAnswer {
  questionId: string;
  value: string | string[] | number | null;
  aiSuggested?: boolean;
  aiSource?: string;
  amended?: { previousValue: string | string[] | number | null; reason: string; date: string };
}

export interface AssessmentInstance {
  id: string;
  individualId: string;
  templateId: string;
  templateVersion: string;
  date: string;
  status: AssessmentStatus;
  completedBy?: string;
  totalScore?: number;
  loc?: "Low" | "Moderate" | "High" | "Critical";
  answers: AssessmentAnswer[];
}

export const assessments: AssessmentInstance[] = [
  {
    id: "A-001",
    individualId: "1",
    templateId: "tpl-comp-initial",
    templateVersion: "v2.0",
    date: "09/01/2022",
    status: "Completed",
    completedBy: "Babar Nawaz, CM",
    totalScore: 42,
    loc: "Moderate",
    answers: [
      { questionId: "q-name", value: "Joe" },
      { questionId: "q-lang", value: "English" },
      { questionId: "q-adl-bath", value: "Supervision" },
      { questionId: "q-adl-dress", value: "Modified Independent" },
      { questionId: "q-adl-eat", value: "Independent" },
      { questionId: "q-iadl-meds", value: "Moderate Assist" },
      { questionId: "q-iadl-fin", value: "Maximal Assist" },
      { questionId: "q-comm-mode", value: "Verbal" },
      { questionId: "q-beh-concerns", value: "No" },
      { questionId: "q-beh-freq", value: "Monthly" },
      { questionId: "q-h-dx", value: "Mild ID, anxiety" },
      { questionId: "q-cog-level", value: "Moderate support" },
      { questionId: "q-legal-guard", value: "Supported decision-making" },
      { questionId: "q-env-living", value: "Family home" },
    ],
  },
];

export function listAssessments(individualId: string) {
  return assessments.filter((a) => a.individualId === individualId);
}

export function getAssessment(id: string) {
  return assessments.find((a) => a.id === id);
}

// ---------- INDEPENDENCE LEVEL helpers ----------

export const INDEPENDENCE_LEVELS = [
  { label: "Independent", score: 0, tone: "green" },
  { label: "Modified Independent", score: 1, tone: "green" },
  { label: "Supervision", score: 2, tone: "blue" },
  { label: "Minimal Assist", score: 3, tone: "blue" },
  { label: "Moderate Assist", score: 4, tone: "amber" },
  { label: "Maximal Assist", score: 5, tone: "amber" },
  { label: "Dependent", score: 6, tone: "red" },
  { label: "N/A", score: null, tone: "gray" },
] as const;

// ---------- STANDARDIZED INSTRUMENTS ----------

export interface InstrumentScore {
  id: string;
  individualId: string;
  instrument: string;
  score: number;
  date: string;
  scoredBy: string;
  source: string;
  notes?: string;
}

export const instrumentScores: InstrumentScore[] = [
  {
    id: "inst-1",
    individualId: "1",
    instrument: "HRST",
    score: 2,
    date: "09/01/2022",
    scoredBy: "Intellectability",
    source: "Intellectability integration",
    notes: "Initial baseline at intake.",
  },
];

export function listInstruments(individualId: string) {
  return instrumentScores.filter((s) => s.individualId === individualId);
}

// ---------- AI PRE-FILL ----------

// Returns answers pre-filled from "existing records" for a given template.
export function aiPrefillFor(
  templateId: string,
  individualId: string,
): AssessmentAnswer[] {
  const tpl = getTemplate(templateId);
  if (!tpl) return [];
  const prior = assessments.find(
    (a) => a.individualId === individualId && a.status === "Completed",
  );
  const out: AssessmentAnswer[] = [];
  for (const sec of tpl.sections) {
    for (const q of sec.questions) {
      // Reuse prior answer if it exists for the same question id.
      const priorAnswer = prior?.answers.find((x) => x.questionId === q.id);
      if (priorAnswer && priorAnswer.value != null && priorAnswer.value !== "") {
        out.push({
          questionId: q.id,
          value: priorAnswer.value,
          aiSuggested: true,
          aiSource: `Prior assessment ${prior!.date}`,
        });
        continue;
      }
      // Heuristic seeds for common fields when no prior exists.
      if (q.id === "q-name") {
        out.push({
          questionId: q.id,
          value: "Joe",
          aiSuggested: true,
          aiSource: "From profile",
        });
      } else if (q.id === "q-lang") {
        out.push({
          questionId: q.id,
          value: "English",
          aiSuggested: true,
          aiSource: "From profile",
        });
      } else if (q.id === "q-h-dx") {
        out.push({
          questionId: q.id,
          value: "Mild ID, anxiety",
          aiSuggested: true,
          aiSource: "From face sheet",
        });
      }
      // Cap pre-fill so the count feels realistic.
      if (out.length >= 34) return out;
    }
  }
  return out;
}
