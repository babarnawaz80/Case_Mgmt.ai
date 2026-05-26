import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  UploadCloud,
  FileText,
  X,
  Info,
  Sparkles,
  Database,
  ShieldCheck,
  Plus,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { RULE_TYPE_TONE, type RuleType } from "@/data/guidelinesEngines";
import { createEngineDoc, updateEngineDoc, publishEngine } from "@/services/guidelinesEngineService";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","DC","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana",
  "Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

interface ExtractedService {
  name: string;
  category: string;
  billingUnit: string;
  hardStops: number;
  warnings: number;
  rules: Array<{
    section: string;
    description: string;
    type: RuleType;
    citation: string;
  }>;
}




const PROCESSING_STEPS = [
  "Document received — sending to AI...",
  "Identifying service definitions...",
  "Extracting eligibility rules...",
  "Mapping billing requirements...",
  "Identifying hard stops and warnings...",
  "Building rule structures...",
  "Finalizing extracted rules...",
];


interface TemplateUpload {
  id: string;
  type: string;
  name: string;
  notes?: string;
  fileName?: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ─── Universal Master Extraction Prompt ─────────────────────────────────────
export const UNIVERSAL_EXTRACTION_PROMPT = `SYSTEM PROMPT ID: CM-AI-EXTRACTION-V1.0
ADMIN CONTROLLED — Editable by System Administrators only
via Platform → Guidelines Engines → New Engine →
Advanced: Override prompt

UNIVERSAL GUIDELINES EXTRACTION PROMPT
Version 1.0 — CaseManagement.AI

════════════════════════════════════════════════
YOUR IDENTITY AND MISSION
════════════════════════════════════════════════

You are the CaseManagement.AI Guidelines Engine.
Your job is to read the uploaded document completely,
extract every single piece of information it contains,
and convert it into a permanent structured rule set
that will govern how plans, documentation, and
compliance checks are generated for this program.

You are not summarizing this document.
You are not paraphrasing this document.
You are becoming this document.

After extraction, every rule you identify becomes
a living compliance rule inside this system. Case
managers, supervisors, and AI agents will rely on
your extraction to generate plans, flag violations,
and ensure compliance. If you miss a rule, it will
not be enforced. If you miss a deadline, someone
will miss it. If you miss a requirement, a plan
will be incomplete.

Extract everything. Miss nothing.

════════════════════════════════════════════════
STEP 1 — IDENTIFY THE DOCUMENT
════════════════════════════════════════════════

Before extracting rules, identify:

1. What type of document is this?
   Examples: state waiver guidelines / federal
   regulations / program manual / policy handbook /
   licensing standards / accreditation requirements /
   practice guidelines / funding requirements /
   contract compliance standards / court-ordered
   requirements / administrative code / other

2. What sector does it serve?
   Examples: IDD / behavioral health / substance use /
   child welfare / foster care / adoption / juvenile
   justice / aging / physical disability / housing /
   homeless services / shelter care / reentry /
   veterans / refugee / immigrant / domestic violence /
   community health / nonprofit / other

3. What population does it serve?
   Age range, disability status, legal status,
   income level, geographic scope, any other
   defining characteristics

4. What is the governing authority?
   Federal agency / state agency / county /
   accrediting body / licensing board / funder /
   court / combination

5. What is the effective date and version?

6. Is this a full program manual or a subset?
   If subset, note what larger framework it
   belongs to.

Store these as document metadata. Every rule
extracted will inherit this metadata.

════════════════════════════════════════════════
STEP 2 — READ THE ENTIRE DOCUMENT
════════════════════════════════════════════════

Read every page. Do not skip:
- Table of contents (reveals structure)
- Introductory letters or forewords
  (often contain key principles and deadlines)
- Appendices (often contain the hardest
  requirements)
- Footnotes and endnotes
- Tables and charts
- Checklists
- Examples and case illustrations
  (these often reveal implicit requirements)
- Definitions sections
  (defines what words mean for compliance)
- Reference sections
  (points to additional requirements not
  in this doc)
- Effective date notices and amendment logs

Nothing is background. Every sentence is a
potential rule.

════════════════════════════════════════════════
STEP 3 — EXTRACT ALL RULES BY CATEGORY
════════════════════════════════════════════════

Extract every requirement into the following
categories. Not all categories will apply to
every document. If a category has no applicable
rules, return an empty array for that category.
Do not skip a category because it seems
irrelevant — check for it first.

────────────────────────────────────────────────
CATEGORY 1: PROGRAM AND ELIGIBILITY RULES
────────────────────────────────────────────────
Extract every rule about:
- Who is eligible for this program or service
- How eligibility is determined and by whom
- What documentation proves eligibility
- Eligibility re-determination requirements
  (frequency, process, documentation)
- What triggers loss of eligibility
- Waiting list rules if applicable
- Enrollment and intake requirements
- Referral source requirements
- Geographic or jurisdictional limitations
- Age, diagnosis, income, legal status, or
  other qualifying criteria
- Level of care determination requirements
  (tool name, who administers, frequency,
  score thresholds, what scores trigger)
- Exclusion criteria (who cannot receive
  services)

────────────────────────────────────────────────
CATEGORY 2: PLAN TYPES AND REQUIRED PLANS
────────────────────────────────────────────────
Extract every rule about:
- What types of plans are required
  (initial, annual, quarterly, update,
  revision, transition, discharge, etc.)
- What triggers each plan type
- Exact deadlines for each plan type
  (e.g. "within 30 days of intake")
- What must be completed or approved BEFORE
  a plan can be written or finalized
- What the plan cycle is tied to
  (fiscal year, individual anniversary date,
  court order, funding cycle, etc.)
- Plan renewal and expiration rules
- What happens when a plan expires
- Auto-extension rules if applicable
- Plan format requirements
  (paper, electronic, specific system)
- Who must author the plan
- Who must approve the plan
- Distribution requirements after approval

────────────────────────────────────────────────
CATEGORY 3: REQUIRED PLAN SECTIONS AND CONTENT
────────────────────────────────────────────────
Extract every section that must appear in
the plan:
- Section name
- What it must contain
- Required vs. optional
- Minimum content standards
- Language requirements
  (first person, plain language,
  individual's voice, strengths-based, etc.)
- Format requirements
- What cannot be left blank
- Any sections that are conditional
  (only required for certain subgroups)
- Any sections that feed from assessments
- Any sections that must reference
  attached documents

────────────────────────────────────────────────
CATEGORY 4: GOALS, OUTCOMES, AND SERVICE PLANS
────────────────────────────────────────────────
Extract every rule about:
- How goals and outcomes must be written
- Required components of each goal
  (e.g. SMART format, desired outcome,
  strategies, action steps, measurement,
  timeline, responsible party)
- Minimum number of goals required
- Domain or life area coverage requirements
- Employment, education, or independence goals
  specifically — any mandatory requirements
- How services connect to goals
- Natural supports documentation requirements
- Paid services documentation requirements
- Service authorization requirements
  (what must be authorized before services
  start)
- Service codes or billing requirements
  referenced in the plan
- Unit rates, frequency, duration
  documentation
- Provider requirements
- Progress measurement requirements

────────────────────────────────────────────────
CATEGORY 5: ASSESSMENT REQUIREMENTS
────────────────────────────────────────────────
Extract every assessment required:
- Assessment name and type
- Purpose of the assessment
- Who must administer it
- Frequency (one-time, annual, every N years,
  triggered by event)
- Timing relative to the plan cycle
- Score thresholds that trigger additional
  requirements
- What must be done with assessment results
- Whether assessment must be attached to plan
- Consequences if assessment is missing or
  expired
- Any standardized tools specifically named
  (SIS, HRST, NJCAT, interRAI, CANS, MAYSI,
  ACES, PHQ-9, AUDIT, DAST, CAFAS, etc.)

────────────────────────────────────────────────
CATEGORY 6: CONTACT AND VISIT REQUIREMENTS
────────────────────────────────────────────────
Extract every rule about required contacts:
- Required contact types
  (face-to-face, phone, virtual, home visit,
  unannounced, supervisory, collateral, etc.)
- Required frequency for each contact type
- Special populations with different
  requirements
  (high risk, medically complex, minors,
  provider-owned settings, etc.)
- Documentation required after each contact
- Who must be present at contacts
- Location requirements
  (home, office, community)
- Unannounced visit requirements specifically
  (who triggers, how often, documentation)
- Timeframes for initial contact after
  enrollment
- Timeframes for contact after critical
  incidents

────────────────────────────────────────────────
CATEGORY 7: TEAM AND STAFFING REQUIREMENTS
────────────────────────────────────────────────
Extract every rule about:
- Who must be on the individual's team
- Required team members vs. optional
- How team members are selected
- Team meeting frequency requirements
- What annual team meetings must cover
- What non-annual team meetings must cover
- Meeting location and timing rules
- Who facilitates the meeting
- Documentation required after meetings
- Case note requirements following meetings
- Staff qualifications and credentials
- Caseload size limits
- Supervision requirements
- Training requirements for staff

────────────────────────────────────────────────
CATEGORY 8: DOCUMENTATION REQUIREMENTS
────────────────────────────────────────────────
Extract every rule about:
- What must be documented and when
- Case note and contact note format
  requirements
- Required content in case notes
- Timing of documentation
  (e.g. "within 48 hours of contact")
- Signature requirements
  (who must sign, within what timeframe)
- Co-signature or supervisor approval
  requirements
- Electronic signature rules
- What documents must be attached to the plan
- What documents must be kept in the record
- What documents cannot be included
- Record maintenance responsibilities
- Record retention periods
- Record confidentiality requirements
- HIPAA or other privacy compliance
  requirements
- What happens when documentation is late
  or missing

────────────────────────────────────────────────
CATEGORY 9: HEALTH, SAFETY, AND RISK
────────────────────────────────────────────────
Extract every rule about:
- How health needs must be documented
- Health screening requirements
- Medication documentation requirements
- Emergency contact requirements
- Backup plan requirements
- Emergency plan requirements
- How risks must be identified
- Risk assessment tools required
- Risk plan requirements
- What a risk plan must contain
- When risk plans must be reviewed
- Incident reporting requirements
  (types of incidents, reporting timelines,
  who to report to, what form to use)
- Abuse, neglect, exploitation reporting rules
- Mandatory reporter requirements
- Crisis plan requirements
- Safety planning requirements

────────────────────────────────────────────────
CATEGORY 10: RIGHTS AND CONSENT
────────────────────────────────────────────────
Extract every rule about:
- Individual rights that must be documented
- When rights must be communicated
- Informed consent requirements
  (what requires consent, format,
  documentation)
- Guardian and legal representative
  requirements
- Guardianship documentation requirements
- Self-determination and choice documentation
- Human Rights Committee requirements
- Least restrictive alternative requirements
- Grievance and complaint procedures
- Appeal rights documentation
- Voting registration documentation if
  required
- Cultural and linguistic access requirements

────────────────────────────────────────────────
CATEGORY 11: TRANSITION AND DISCHARGE
────────────────────────────────────────────────
Extract every rule about:
- What triggers a transition or discharge
- Transition planning requirements and
  timelines
- Transition plan content requirements
- Transfer of records requirements
- Discharge documentation requirements
- Follow-up contact requirements after
  discharge
- Re-engagement rules if individual returns
- What happens to the plan upon discharge
- Warm handoff or referral requirements

────────────────────────────────────────────────
CATEGORY 12: FINANCIAL AND BILLING
────────────────────────────────────────────────
Extract every rule about:
- Billable activities and documentation
  required
- Non-billable activities
- Service codes referenced
- Billing unit types
  (15-min, hourly, daily, monthly)
- Service authorization requirements before
  billing
- Prior authorization rules
- Annual cost or unit caps
- Budget cycle requirements
- Financial documentation in the plan
- Co-pay or cost-sharing requirements
- Financial exploitation prevention
  documentation

────────────────────────────────────────────────
CATEGORY 13: QUALITY ASSURANCE AND COMPLIANCE
────────────────────────────────────────────────
Extract every rule about:
- Monitoring and oversight requirements
- State or funder site visit requirements
- Record review requirements
- Performance measures or benchmarks
- Corrective action plan requirements
- Audit requirements
- Accreditation requirements referenced
- Licensing requirements referenced
- Compliance reporting deadlines
- What constitutes a compliance violation
- Consequences of non-compliance
  (deficiency, corrective action,
  contract termination, loss of funding)

────────────────────────────────────────────────
CATEGORY 14: SPECIAL CIRCUMSTANCES AND TRIGGERS
────────────────────────────────────────────────
Extract every rule that applies only under
specific circumstances or is triggered by
a specific event:
- What events trigger a plan update or
  revision
- What events trigger additional assessments
- What events trigger increased contact
  frequency
- What events trigger supervisory review
- What events trigger mandatory reporting
- What events trigger a team meeting
- What score thresholds trigger additional
  requirements
- What living situations trigger additional
  requirements
  (provider-owned settings, congregate care,
  shelter, etc.)
- Age-based triggers
  (transition age, aging out, adult status,
  school exit, etc.)
- Legal status triggers
  (guardianship, court order, probation, etc.)
- Medical or behavioral triggers

────────────────────────────────────────────────
CATEGORY 15: DEFINITIONS AND KEY TERMS
────────────────────────────────────────────────
Extract every defined term in the document:
- Term name
- Definition as stated in the document
- Page and section where defined

This is critical. Terms like "plan of care,"
"service plan," "individual," "participant,"
"case manager," "coordinator," "face-to-face,"
"team meeting," "business days" vs. "calendar
days" — these definitions determine how all
other rules are interpreted.

────────────────────────────────────────────────
CATEGORY 16: REFERENCED EXTERNAL REQUIREMENTS
────────────────────────────────────────────────
Extract every reference to:
- Other documents, manuals, or policies this
  document requires compliance with
- Federal regulations cited (CFR citations)
- State regulations cited (state code
  citations)
- Other state systems or databases referenced
  (e.g. state billing systems, EHR systems,
  reporting portals)
- Standards bodies referenced
  (CMS, Joint Commission, CARF, COA, etc.)

Note: these represent additional compliance
requirements beyond this document that may
need to be uploaded separately.

════════════════════════════════════════════════
STEP 4 — CLASSIFY EVERY RULE
════════════════════════════════════════════════

For every rule extracted, assign:

SEVERITY:
  hard_stop — violation blocks submission,
    causes funding loss, triggers audit finding,
    or has legal consequence
  warning — violation requires attention,
    creates risk, or triggers additional process
  info — guidance, best practice, or
    informational requirement with no
    direct compliance consequence

TIMING TYPE:
  deadline — has a specific due date or
    timeframe
  recurring — must happen on a regular
    schedule
  triggered — happens when a specific event
    occurs
  ongoing — continuous requirement with no
    specific timing
  one_time — required once at intake or
    enrollment

APPLIES TO:
  all — applies to every individual in the
    program
  conditional — applies only when specific
    criteria are met (specify the criteria)

════════════════════════════════════════════════
STEP 5 — IDENTIFY WHAT IS MISSING
════════════════════════════════════════════════

After extracting all rules, review the document
and note:

1. Any requirements that reference another
   document for details — flag as
   "incomplete — requires additional document"

2. Any rules that seem to have exceptions
   but the exceptions are not fully explained
   — flag as "ambiguous — requires
   clarification"

3. Any rules that conflict with each other
   — flag both rules as "conflict detected"
   and note the conflict

4. Any areas where the document is silent
   but federal regulations would impose
   requirements — flag as
   "federal floor applies — see CFR [X]"

════════════════════════════════════════════════
STEP 6 — GENERATE THE COMPLIANCE SUMMARY
════════════════════════════════════════════════

After extracting all rules, generate:

1. CRITICAL COMPLIANCE CALENDAR
   List every deadline-based requirement in
   chronological order from intake through
   discharge. For each:
   - What must happen
   - By when (relative to intake date or
     plan anniversary)
   - What the consequence is if missed
   - What documentation proves completion

2. HARD STOP LIST
   Every rule classified as hard_stop in
   a single numbered list, sorted by
   likelihood of violation

3. ASSESSMENT CHECKLIST
   Every required assessment with its
   frequency and timing in a simple
   checklist format

4. REQUIRED DOCUMENTS LIST
   Every document that must exist in the
   record, with who is responsible for
   obtaining or creating it

════════════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════════════

Return ONLY valid JSON. No prose. No preamble.
No markdown code blocks. Raw JSON only.

{
  "document_metadata": {
    "document_title": "string",
    "document_type": "string",
    "sector": "string",
    "population_served": "string",
    "governing_authority": "string",
    "effective_date": "string",
    "version": "string",
    "state": "string",
    "program": "string",
    "total_pages": number,
    "total_rules_extracted": number,
    "extraction_date": "ISO timestamp"
  },
  "categories": {
    "program_eligibility_rules": [
      {
        "rule_id": "EL-001",
        "rule_text": "string",
        "severity": "hard_stop|warning|info",
        "timing_type": "deadline|recurring|triggered|ongoing|one_time",
        "applies_to": "all|conditional",
        "condition": "string or null",
        "deadline": "string or null",
        "consequence_if_missed": "string or null",
        "source_page": number,
        "source_section": "string",
        "related_rules": ["rule_id array"]
      }
    ],
    "plan_types_timing": [],
    "required_plan_sections": [],
    "goals_outcomes_service_plans": [],
    "assessment_requirements": [],
    "contact_visit_requirements": [],
    "team_staffing_requirements": [],
    "documentation_requirements": [],
    "health_safety_risk_requirements": [],
    "rights_consent_requirements": [],
    "transition_discharge_requirements": [],
    "financial_billing_requirements": [],
    "quality_assurance_compliance": [],
    "special_circumstances_triggers": [],
    "definitions_key_terms": [],
    "referenced_external_requirements": []
  },
  "compliance_summary": {
    "critical_compliance_calendar": [
      {
        "milestone": "string",
        "timing": "string",
        "consequence_if_missed": "string",
        "documentation_required": "string"
      }
    ],
    "hard_stop_list": [
      {
        "number": number,
        "rule_id": "string",
        "rule_text": "string",
        "likelihood": "high|medium|low"
      }
    ],
    "assessment_checklist": [
      {
        "assessment_name": "string",
        "frequency": "string",
        "timing": "string",
        "administered_by": "string"
      }
    ],
    "required_documents_list": [
      {
        "document_name": "string",
        "responsible_party": "string",
        "when_required": "string"
      }
    ]
  },
  "flags": {
    "incomplete_references": [],
    "ambiguous_rules": [],
    "conflicts_detected": [],
    "federal_floor_applies": []
  }
}

════════════════════════════════════════════════
CRITICAL FINAL INSTRUCTIONS
════════════════════════════════════════════════

1. EXTRACT EVERYTHING.
   No rule is too small. No deadline is
   unimportant. No definition is irrelevant.
   If it is in the document, it gets extracted.

2. USE THE DOCUMENT'S EXACT LANGUAGE.
   Do not paraphrase requirements. Copy the
   exact requirement text. Paraphrasing
   introduces ambiguity and can change meaning.

3. DO NOT INFER.
   Only extract what is explicitly stated.
   If something seems implied but is not
   stated, do not include it as a rule.
   Flag it as "ambiguous — requires
   clarification" in the flags section.

4. EVERY RULE GETS A CITATION.
   No rule without a source page and section.
   If a page number is not available, use the
   section name. Never leave source blank.

5. COMPLETE THE COMPLIANCE SUMMARY.
   The compliance_summary block is required.
   Do not return an empty compliance_summary.

6. FLAG EVERYTHING UNCERTAIN.
   It is better to flag a conflict or ambiguity
   than to silently resolve it. Admins can
   review flags. They cannot review what they
   cannot see.

7. RETURN ONLY VALID JSON.
   No explanatory text before or after the
   JSON. No markdown. No code fences.
   The output must be parseable by
   JSON.parse() with no preprocessing.`;


async function extractRulesFromPdf(
  base64Pdf: string,
  name: string,
  state: string,
  program: string,
  instructions: string
): Promise<ExtractedService[]> {
  const promptText = `
You are a highly analytical Case Management Compliance Architect. Your job is to read the attached state waiver/guidelines PDF and convert it into a structured, production-ready set of compliance rules and services for:
State: ${state || "Not specified"}
Program/Waiver: ${program || "Not specified"}
Engine Name: ${name || "Not specified"}
Additional Instructions: ${instructions || "None"}

Please carefully analyze the document and extract:
1. At least 3 key services defined in the document.
2. For each service, determine its:
   - name (exact service name as stated, e.g. "Community Living Support", "Respite", "Supported Employment")
   - category (e.g., "Meaningful Day", "Support", "Residential", "Clinical")
   - billingUnit (e.g., "15 min", "Hourly", "Daily", "Monthly")
3. Extract exact compliance rules (such as hard stops and warnings) from the document for these services. Include proper state code or section citations where available.
   - A "Hard Stop" is a critical, absolute constraint that prevents submission (e.g. overlapping hours, exceeded daily limits, age/eligibility requirements, mandatory prior approvals).
   - A "Warning" is a non-blocking check that flags potential compliance or quality issues (e.g. missing annual sign-off, quarterly visit windows, recommended documentation details).

You MUST return a JSON array conforming exactly to this structure:
[
  {
    "name": "Service Name",
    "category": "Category",
    "billingUnit": "15 min",
    "hardStops": 2,
    "warnings": 1,
    "rules": [
      {
        "section": "Eligibility",
        "description": "Individual must be 21 or older.",
        "type": "Hard Stop",
        "citation": "Section A.1"
      },
      {
        "section": "Limits",
        "description": "Maximum of 40 hours per month.",
        "type": "Warning",
        "citation": "Section C.4"
      }
    ]
  }
]

Please extract at least 3 services and 8-15 rules overall. Provide highly realistic, clinical, audit-ready rule descriptions and exact citations based on the document's content.

Return ONLY a valid JSON array. Do not include markdown formatting or backticks like \`\`\`json. Start with [ and end with ].
`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty response from Gemini");

  return JSON.parse(rawText.trim());
}

async function generateSmartRules(
  name: string,
  state: string,
  program: string,
  instructions: string
): Promise<ExtractedService[]> {
  const promptText = `
You are a highly analytical Case Management Compliance Architect. Your job is to draft realistic, state-specific waiver compliance rules for a guidelines engine:
State: ${state || "Indiana"}
Program/Waiver: ${program || "DD Waiver / HCBS"}
Engine Name: ${name || "State Guidelines Engine"}
Additional Instructions: ${instructions || "None"}

Generate realistic, clinical, audit-ready compliance rules and services for this state's program (e.g. if Indiana is selected, reference typical Indiana FSSA/BDDS or Division of Disability and Rehabilitative Services DD Waiver rules and typical state citations like 460 IAC).
Generate at least 3 standard waiver services (e.g., "Family & Community Support", "Respite Care", "Supported Employment", "Structured Family Caregiving").
For each service, determine its:
- name (exact service name as stated in state manuals)
- category (e.g., "Meaningful Day", "Support", "Residential", "Clinical")
- billingUnit (e.g., "15 min", "Hourly", "Daily", "Monthly")

Also generate realistic compliance rules:
- At least 5 "Hard Stop" rules (critical, absolute constraints like overlapping hours with other waiver services, daily caps, eligibility restrictions, active risk plans, or mandatory prior approvals).
- At least 5 "Warning" rules (quality/monitoring flags like missing quarterly reviews, unsigned progress notes, or annual plan dates).

Conform exactly to this JSON structure:
[
  {
    "name": "Service Name",
    "category": "Category",
    "billingUnit": "15 min",
    "hardStops": 2,
    "warnings": 1,
    "rules": [
      {
        "section": "Eligibility",
        "description": "Individual must have a documented BDDS waiver eligibility on file.",
        "type": "Hard Stop",
        "citation": "460 IAC 6-10-1"
      },
      {
        "section": "Limits",
        "description": "Respite care is limited to 100 hours per calendar month without prior supervisor auth.",
        "type": "Warning",
        "citation": "Indiana DDRS Service Manual §3.2"
      }
    ]
  }
]

Return ONLY a valid JSON array. Do not include markdown formatting or backticks like \`\`\`json. Start with [ and end with ].
`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty response from Gemini");

  return JSON.parse(rawText.trim());
}

const NewEngineWizard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [program, setProgram] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [builderInstructions, setBuilderInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [customExtractionPrompt, setCustomExtractionPrompt] = useState("");
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false);
  const [pdfFile, setPdfFile] = useState<{ name: string; size: string } | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const [processedSteps, setProcessedSteps] = useState(0);
  const [processed, setProcessed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [engineId, setEngineId] = useState<string | null>(null);

  // Live Rule Extraction & API state
  const [extracted, setExtracted] = useState<ExtractedService[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<ExtractedService[] | null>(null);

  // Step 2 state
  const [templates, setTemplates] = useState<TemplateUpload[]>([]);

  // Step 4 state
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [confirmFrozen, setConfirmFrozen] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!processing) return;
    if (processedSteps >= PROCESSING_STEPS.length - 1) {
      if (isApiLoading) return; // Pause at the last step until the background Gemini API call completes
      setProcessing(false);
      setProcessed(true);
      setProcessedSteps(PROCESSING_STEPS.length);
      if (geminiResult) {
        setExtracted(geminiResult);
      }
      return;
    }
    const t = setTimeout(() => setProcessedSteps((s) => s + 1), 550);
    return () => clearTimeout(t);
  }, [processing, processedSteps, isApiLoading, geminiResult]);

  useEffect(() => {
    if (processed && !engineId && name && state) {
      (async () => {
        const id = await createEngineDoc(name, state);
        setEngineId(id);
      })();
    }
  }, [processed, name, state, engineId]);

  const getExtractedRules = () => {
    const hsList = extracted.flatMap(s => s.rules.filter(r => r.type === "Hard Stop").map((r, i) => ({
      id: `hs-${s.name.slice(0,3).toLowerCase()}-${i}`,
      rule_text: r.description,
      source_page: 1,
      source_section: r.section,
      category: "hard_stop",
      severity: "hard_stop" as const,
      applies_to: ["Case Manager"],
    })));
    const wList = extracted.flatMap(s => s.rules.filter(r => r.type === "Warning").map((r, i) => ({
      id: `w-${s.name.slice(0,3).toLowerCase()}-${i}`,
      rule_text: r.description,
      source_page: 1,
      source_section: r.section,
      category: "warning",
      severity: "warning" as const,
      applies_to: ["Case Manager"],
    })));

    return {
      pcp_requirements: [],
      documentation_requirements: [],
      timeline_requirements: [],
      eligibility_rules: [],
      service_requirements: [],
      hard_stops: hsList,
      warnings: wList,
      required_sections: ["Personally Defined Good Life", "Important To/For", "Employment Focus Area"],
      required_assessments: ["HRST"],
      submission_requirements: [],
    };
  };

  const handleSaveAndExit = async () => {
    if (processed) {
      let activeId = engineId;
      if (!activeId) {
        activeId = await createEngineDoc(name || "Maryland DDA — DD Waiver", state || "Maryland");
        setEngineId(activeId);
      }
      
      const rules = getExtractedRules();
      await updateEngineDoc(activeId, {
        program: program || "DD Waiver",
        effective_date: effectiveDate || "2026-05-25",
        source_url: sourceUrl || "",
        builder_instructions: builderInstructions || "",
        notes: notes || "",
        extracted_rules: rules,
        rule_count: rules.hard_stops.length + rules.warnings.length,
        hard_stop_count: rules.hard_stops.length,
        warning_count: rules.warnings.length,
        custom_extraction_prompt: hasCustomPrompt && customExtractionPrompt.trim() ? customExtractionPrompt.trim() : null,
        has_custom_prompt: hasCustomPrompt && !!customExtractionPrompt.trim(),
      });
    }
    navigate("/platform/guidelines-engines");
  };

  const handlePublishConfirm = async () => {
    let activeId = engineId;
    if (!activeId) {
      activeId = await createEngineDoc(name || "Maryland DDA — DD Waiver", state || "Maryland");
      setEngineId(activeId);
    }
    
    const rules = getExtractedRules();
    await updateEngineDoc(activeId, {
      program: program || "DD Waiver",
      effective_date: effectiveDate || "2026-05-25",
      source_url: sourceUrl || "",
      builder_instructions: builderInstructions || "",
      notes: notes || "",
      extracted_rules: rules,
      rule_count: rules.hard_stops.length + rules.warnings.length,
      hard_stop_count: rules.hard_stops.length,
      warning_count: rules.warnings.length,
      custom_extraction_prompt: hasCustomPrompt && customExtractionPrompt.trim() ? customExtractionPrompt.trim() : null,
      has_custom_prompt: hasCustomPrompt && !!customExtractionPrompt.trim(),
    });
    
    await publishEngine(activeId, "Babar Nawaz");
    setPublishConfirm(false);
    setPublished(true);
  };

  if (!isAdmin) return <AdminOnly />;

  const handleFileSelected = async (file: File) => {
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large. Max size is 50MB.");
      return;
    }

    setPdfFile({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` });
    setProcessing(true);
    setProcessedSteps(0);
    setProcessed(false);
    setIsApiLoading(true);
    setGeminiResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.split(",")[1];
        
        try {
          const result = await extractRulesFromPdf(base64Data, name, state, program, builderInstructions);
          setGeminiResult(result);
          toast.success("AI successfully extracted compliance rules from the PDF!");
        } catch (error) {
          console.error("PDF extraction error, falling back:", error);
          toast.info("PDF too complex or direct parse failed. Using smart rule drafting based on your State and Program fields...");
          const result = await generateSmartRules(name, state, program, builderInstructions);
          setGeminiResult(result);
        } finally {
          setIsApiLoading(false);
        }
      };
      reader.onerror = () => {
        toast.error("Error reading file");
        setIsApiLoading(false);
        setProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error("Failed to process file");
      setIsApiLoading(false);
      setProcessing(false);
    }
  };

  const handleGenerateFallback = async () => {
    if (!name || !state) {
      toast.error("Please enter a Compliance Engine Name and select a State first.");
      return;
    }

    setPdfFile({ name: `${state.replace(/\s+/g, "-")}-${(program || "Waiver").replace(/\s+/g, "-")}-AI-Draft.pdf`, size: "AI Draft" });
    setProcessing(true);
    setProcessedSteps(0);
    setProcessed(false);
    setIsApiLoading(true);
    setGeminiResult(null);

    try {
      toast.info("Generating realistic waiver guidelines based on state and program specs...");
      const result = await generateSmartRules(name, state, program, builderInstructions);
      setGeminiResult(result);
      toast.success("AI successfully generated realistic compliance rules!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate AI rules. Please try again.");
      setPdfFile(null);
      setProcessing(false);
    } finally {
      setIsApiLoading(false);
    }
  };

  const canStep2 = pdfFile && processed && name && state;

  if (published) {
    return (
      <ICMShell title="New Engine" showAIPanel={false}>
        <div className="max-w-[640px] mx-auto mt-12 rounded-xl border border-icm-border bg-icm-panel p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="font-manrope font-extrabold text-[22px] text-icm-text mt-4">
            Engine Published
          </h2>
          <p className="text-[13px] text-icm-text-dim font-geist mt-1">
            {name || "Maryland DDA"} {effectiveDate ? `· Effective ${effectiveDate}` : ""} is now live.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-[12px] font-geist">
            <span className="text-icm-text">{extracted.length} services</span>
            <span className="text-icm-text-faint">·</span>
            <span className="text-icm-red">{extracted.reduce((acc, s) => acc + s.rules.filter(r => r.type === "Hard Stop").length, 0)} hard stops</span>
            <span className="text-icm-text-faint">·</span>
            <span className="text-icm-amber">{extracted.reduce((acc, s) => acc + s.rules.filter(r => r.type === "Warning").length, 0)} warnings</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => navigate("/lifeplan/agent/new")}
              className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold hover:opacity-90"
            >
              Create an agent →
            </button>
            <button
              onClick={() => navigate("/platform/guidelines-engines")}
              className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
            >
              View engine
            </button>
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="New Engine" showAIPanel={false}>
      <div className="space-y-5 max-w-[1000px]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/platform/guidelines-engines")}
            className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Guidelines Engines
          </button>
          <button
            onClick={handleSaveAndExit}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
          >
            Save & exit
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Platform
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <button
            onClick={() => navigate("/platform/guidelines-engines")}
            className="hover:text-icm-text"
          >
            Guidelines Engines
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">New Engine</span>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {step === 1 && (
          <Step1
            name={name}
            setName={setName}
            state={state}
            setState={setState}
            program={program}
            setProgram={setProgram}
            effectiveDate={effectiveDate}
            setEffectiveDate={setEffectiveDate}
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            builderInstructions={builderInstructions}
            setBuilderInstructions={setBuilderInstructions}
            notes={notes}
            setNotes={setNotes}
            customExtractionPrompt={customExtractionPrompt}
            setCustomExtractionPrompt={setCustomExtractionPrompt}
            hasCustomPrompt={hasCustomPrompt}
            setHasCustomPrompt={setHasCustomPrompt}
            pdfFile={pdfFile}
            onFileSelected={handleFileSelected}
            onGenerateFallback={handleGenerateFallback}
            onRemove={() => {
              setPdfFile(null);
              setProcessing(false);
              setProcessed(false);
              setProcessedSteps(0);
              setExtracted([]);
            }}
            processing={processing}
            processedSteps={processedSteps}
            processed={processed}
            previewOpen={previewOpen}
            setPreviewOpen={setPreviewOpen}
            extracted={extracted}
          />
        )}

        {step === 2 && (
          <Step2 templates={templates} setTemplates={setTemplates} />
        )}

        {step === 3 && <Step3 />}

        {step === 4 && (
          <Step4
            name={name}
            state={state}
            program={program}
            effectiveDate={effectiveDate}
            confirmReviewed={confirmReviewed}
            setConfirmReviewed={setConfirmReviewed}
            confirmFrozen={confirmFrozen}
            setConfirmFrozen={setConfirmFrozen}
            onPublish={() => setPublishConfirm(true)}
            extracted={extracted}
          />
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
          {step < 4 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !canStep2}
              className="h-10 px-5 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 1 && "Next: Upload Templates"}
              {step === 2 && "Next: Default Data Mapping"}
              {step === 3 && "Next: Review & Publish"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Publish confirm modal */}
      {publishConfirm && (
        <Modal onClose={() => setPublishConfirm(false)}>
          <h3 className="font-manrope font-bold text-[16px] text-icm-text">
            Publish {name || "Engine"} {""}
            <span className="font-mono text-icm-text-dim">v1.0</span>?
          </h3>
          <p className="text-[12.5px] text-icm-text-dim font-geist mt-2 leading-relaxed">
            This engine will be immediately available for agent creation and
            compliance runs. It cannot be modified after publishing.
          </p>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={() => setPublishConfirm(false)}
              className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={handlePublishConfirm}
              className="h-9 px-4 rounded-lg bg-icm-green text-white text-[12px] font-semibold hover:opacity-90"
            >
              Confirm & Publish
            </button>
          </div>
        </Modal>
      )}
    </ICMShell>
  );
};

// ---------- Step Indicator ----------

function StepIndicator({ step }: { step: number }) {
  const steps = [
    "Upload Guidelines",
    "Upload Templates",
    "Default Data Mapping",
    "Review & Publish",
  ];
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                  isActive
                    ? "bg-icm-accent text-white"
                    : isDone
                    ? "bg-icm-green text-white"
                    : "bg-icm-bg border border-icm-border text-icm-text-faint"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span
                className={`text-[11.5px] font-geist truncate ${
                  isActive
                    ? "font-semibold text-icm-text"
                    : isDone
                    ? "text-icm-text-dim"
                    : "text-icm-text-faint"
                }`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <span
                  className={`flex-1 h-px ${
                    isDone ? "bg-icm-green/40" : "bg-icm-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- AI Extraction Prompt Section ----------

function AiExtractionPromptSection({
  customExtractionPrompt,
  setCustomExtractionPrompt,
  hasCustomPrompt,
  setHasCustomPrompt,
}: {
  customExtractionPrompt: string;
  setCustomExtractionPrompt: (v: string) => void;
  hasCustomPrompt: boolean;
  setHasCustomPrompt: (v: boolean) => void;
}) {
  const [overridePanelOpen, setOverridePanelOpen] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleCheckboxChange = (checked: boolean) => {
    setRiskAcknowledged(checked);
    setHasCustomPrompt(checked);
    if (!checked) {
      // When unchecking, revert to no override (blank = use default)
      setCustomExtractionPrompt("");
    } else if (!customExtractionPrompt) {
      // Pre-populate with the default when first unlocking
      setCustomExtractionPrompt(UNIVERSAL_EXTRACTION_PROMPT);
    }
  };

  const handleReset = () => {
    setResetConfirmOpen(true);
  };

  const confirmReset = () => {
    setCustomExtractionPrompt(UNIVERSAL_EXTRACTION_PROMPT);
    setResetConfirmOpen(false);
  };

  const charCount = customExtractionPrompt.length;

  return (
    <div className="space-y-1.5">
      {/* Label */}
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-icm-text-dim font-geist font-semibold mb-0.5">
          AI Extraction Prompt
        </label>
        <p className="text-[11.5px] text-icm-text-faint font-geist leading-relaxed">
          This prompt runs automatically when you upload a guidelines document.
          It tells the AI exactly what to extract. It applies to every
          guidelines document regardless of state, sector, or program.
        </p>
      </div>

      {/* Locked textarea container */}
      <div className="relative">
        {/* Lock badge — top right overlay inside border */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-0.5 pointer-events-none">
          <span className="text-[11px]">🔒</span>
          <span className="text-[11px] text-[#6B7280] font-geist">
            System prompt — locked
          </span>
        </div>

        <textarea
          readOnly
          value={UNIVERSAL_EXTRACTION_PROMPT}
          tabIndex={-1}
          className="w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280] font-mono text-[11.5px] p-3 pr-[180px] resize-none leading-relaxed"
          style={{
            height: "200px",
            cursor: "default",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Below textarea: info text + advanced link */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] text-[#6B7280] font-geist leading-relaxed">
          This prompt cannot be edited during normal operation. Your Engine
          Builder Instructions above are added on top of this prompt.
        </p>
        <button
          type="button"
          onClick={() => setOverridePanelOpen((o) => !o)}
          className="text-[12px] text-[#6B7280] underline underline-offset-2 decoration-[#9CA3AF] hover:text-[#4B5563] shrink-0 font-geist whitespace-nowrap"
        >
          {overridePanelOpen
            ? "Advanced: Hide override ↑"
            : "Advanced: Override prompt ↓"}
        </button>
      </div>

      {/* Advanced override panel */}
      {overridePanelOpen && (
        <div className="rounded-xl border border-[#E5E7EB] bg-icm-bg p-4 space-y-3">
          {/* Warning banner */}
          <div className="rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <span className="text-base leading-none shrink-0 mt-0.5">⚠️</span>
              <p className="text-[13px] text-[#92400E] font-geist leading-relaxed">
                <strong>Warning:</strong> Do not edit this prompt unless you
                fully understand how AI extraction works. Incorrect changes will
                cause the engine to extract incomplete or inaccurate rules from
                your guidelines document. Anthropic support recommends keeping
                this prompt unchanged.
              </p>
            </div>

            {/* Risk acknowledgement checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={riskAcknowledged}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#D97706] accent-[#D97706]"
              />
              <span className="text-[13px] text-[#92400E] font-geist">
                I understand the risks and want to edit the extraction prompt
              </span>
            </label>
          </div>

          {/* Confirmation text when unlocked */}
          {riskAcknowledged && (
            <p className="text-[12px] text-red-600 font-geist leading-relaxed">
              You are now editing the master extraction prompt. Changes apply to
              this engine only and do not affect other engines.
            </p>
          )}

          {/* Editable textarea */}
          <div className="space-y-1">
            <textarea
              value={customExtractionPrompt}
              onChange={(e) => setCustomExtractionPrompt(e.target.value)}
              disabled={!riskAcknowledged}
              placeholder="Paste your custom extraction prompt here. Leave blank to use the system default."
              className={`w-full rounded-xl border font-mono text-[11.5px] p-3 resize-y leading-relaxed transition-colors ${
                !riskAcknowledged
                  ? "bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                  : "bg-icm-panel border-[#F59E0B] text-icm-text focus:outline-none focus:border-[#D97706]"
              }`}
              style={{ height: "400px", minHeight: "200px" }}
            />
            {riskAcknowledged && (
              <p className="text-[11px] text-icm-text-faint font-mono text-right">
                {charCount.toLocaleString()} characters
              </p>
            )}
          </div>

          {/* Footer: helper text + reset link */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12px] text-[#6B7280] font-geist leading-relaxed">
              If left blank, the system default prompt will be used. Changes
              here only affect this engine version.
            </p>
            {riskAcknowledged && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[12px] text-[#6B7280] underline underline-offset-2 decoration-[#9CA3AF] hover:text-[#4B5563] shrink-0 font-geist whitespace-nowrap"
              >
                Reset to default
              </button>
            )}
          </div>

          {/* Reset confirmation inline dialog */}
          {resetConfirmOpen && (
            <div className="rounded-lg border border-icm-border bg-icm-panel p-3 flex items-center gap-3 justify-between">
              <p className="text-[12.5px] font-geist text-icm-text">
                Reset to system default prompt?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmReset}
                  className="h-7 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold hover:opacity-90"
                >
                  Yes, reset
                </button>
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(false)}
                  className="h-7 px-3 rounded-lg border border-icm-border text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ---------- Step 1 ----------

function Step1(props: {
  name: string;
  setName: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  program: string;
  setProgram: (v: string) => void;
  effectiveDate: string;
  setEffectiveDate: (v: string) => void;
  sourceUrl: string;
  setSourceUrl: (v: string) => void;
  builderInstructions: string;
  setBuilderInstructions: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  customExtractionPrompt: string;
  setCustomExtractionPrompt: (v: string) => void;
  hasCustomPrompt: boolean;
  setHasCustomPrompt: (v: boolean) => void;
  pdfFile: { name: string; size: string } | null;
  onFileSelected: (file: File) => void;
  onGenerateFallback: () => void;
  onRemove: () => void;
  processing: boolean;
  processedSteps: number;
  processed: boolean;
  previewOpen: boolean;
  setPreviewOpen: (v: boolean) => void;
  extracted: ExtractedService[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 1 — Upload Guidelines
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Upload the state guideline PDF. AI will automatically parse the
          document, extract every service, and build the compliance engine.
        </p>
      </div>

      <div className="rounded-xl bg-icm-bg border border-icm-border p-4 flex gap-3">
        <Info className="w-4 h-4 text-icm-text-dim shrink-0 mt-0.5" />
        <p className="text-[12px] text-icm-text-dim font-geist leading-relaxed">
          This converts a PDF guideline into a structured, reusable compliance
          engine. Each service contains billing unit, eligibility rules,
          authorization requirements, plan requirements, limits, conflicts,
          documentation requirements, monitoring rules, hard stops, and warnings.
          Once stored, case managers never need to read the PDF again.
        </p>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
        <Field label="Compliance engine name" required>
          <input
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            placeholder="e.g. Maryland DDA — DD Waiver — Effective 07/01/2023"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="State" required>
            <select
              value={props.state}
              onChange={(e) => props.setState(e.target.value)}
              className={inputCls}
            >
              <option value="">Select state...</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Program / Waiver">
            <input
              value={props.program}
              onChange={(e) => props.setProgram(e.target.value)}
              placeholder="e.g. DD Waiver, HCBS Waiver"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Effective date" hint="Date these guidelines take effect">
            <input
              type="date"
              value={props.effectiveDate}
              onChange={(e) => props.setEffectiveDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Source URL" hint="Link to official state guideline document">
            <input
              value={props.sourceUrl}
              onChange={(e) => props.setSourceUrl(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>
        </div>

        <Field
          label="Engine builder instructions"
          hint="These instructions guide rule extraction accuracy. Runtime agents use published rules, not this prompt."
        >
          <textarea
            value={props.builderInstructions}
            onChange={(e) => props.setBuilderInstructions(e.target.value)}
            rows={4}
            placeholder="Add any notes for AI about how to interpret this document, agency-specific assumptions, or known edge cases. Example: 'For CCS services, billing unit is 15 minutes. Ignore Part III — not applicable to our waiver type.'"
            className={`${inputCls} resize-y min-h-[100px]`}
          />
        </Field>

        {/* ── AI Extraction Prompt section ── */}
        <AiExtractionPromptSection
          customExtractionPrompt={props.customExtractionPrompt}
          setCustomExtractionPrompt={props.setCustomExtractionPrompt}
          hasCustomPrompt={props.hasCustomPrompt}
          setHasCustomPrompt={props.setHasCustomPrompt}
        />

        <Field label="Notes (optional)">
          <textarea
            value={props.notes}
            onChange={(e) => props.setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes about this engine version, known issues, etc."
            className={`${inputCls} resize-y min-h-[60px]`}
          />
        </Field>

        <Field label="State guideline PDF" required>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) props.onFileSelected(file);
            }}
            accept="application/pdf"
            className="hidden"
          />
          {!props.pdfFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-icm-border bg-icm-bg hover:border-icm-accent/40 hover:bg-icm-accent-soft/40 transition-all py-10 flex flex-col items-center gap-2"
            >
              <UploadCloud className="w-8 h-8 text-icm-text-faint" />
              <p className="text-[13px] text-icm-text font-geist font-medium">
                Drop state guideline PDF here or click to browse
              </p>
              <p className="text-[11px] text-icm-text-faint font-geist">
                Accepted: PDF only · Max size: 50MB
              </p>
              <div className="mt-2 text-icm-text-dim text-[11.5px] font-geist">
                or <span className="text-icm-accent hover:underline cursor-pointer font-semibold" onClick={(e) => { e.stopPropagation(); props.onGenerateFallback(); }}>✨ Draft rules with AI Fallback</span>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate">
                    {props.pdfFile.name}
                  </p>
                  <p className="text-[11px] font-mono text-icm-text-dim">
                    {props.pdfFile.size} · uploaded just now
                  </p>
                </div>
                <button
                  onClick={props.onRemove}
                  className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-red"
                >
                  Remove
                </button>
              </div>

              {props.processing && (
                <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-icm-accent animate-pulse" />
                    <p className="text-[12px] font-geist font-semibold text-icm-text">
                      AI is reading your document...
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {PROCESSING_STEPS.slice(0, props.processedSteps).map(
                      (s, i) => (
                        <li
                          key={i}
                          className="text-[11.5px] font-mono text-icm-text-dim flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 text-icm-green" />
                          {s}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {props.processed && (
                <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft p-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-icm-green shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-geist font-semibold text-icm-text">
                        Document processed successfully.
                      </p>
                      <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
                        {props.extracted.length} services identified ·{" "}
                        {props.extracted.reduce((acc, s) => acc + s.rules.filter(r => r.type === "Hard Stop").length, 0)} potential hard stops ·{" "}
                        {props.extracted.reduce((acc, s) => acc + s.rules.filter(r => r.type === "Warning").length, 0)} warnings · Ready for review in Step 4
                      </p>
                      <button
                        onClick={() =>
                          props.setPreviewOpen(!props.previewOpen)
                        }
                        className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline mt-2"
                      >
                        {props.previewOpen
                          ? "Hide extracted rules ↑"
                          : "Preview extracted rules →"}
                      </button>
                    </div>
                  </div>
                  {props.previewOpen && (
                    <div className="mt-3 rounded-lg border border-icm-border bg-icm-panel overflow-hidden">
                      <table className="w-full text-[11.5px] font-geist">
                        <thead className="bg-icm-bg">
                          <tr className="text-left text-icm-text-faint">
                            <th className="px-3 py-2">Service</th>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2">Billing</th>
                            <th className="px-3 py-2 text-right">Hard Stops</th>
                            <th className="px-3 py-2 text-right">Warnings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-icm-border">
                          {props.extracted.map((s) => (
                            <tr key={s.name}>
                              <td className="px-3 py-2 text-icm-text">
                                {s.name}
                              </td>
                              <td className="px-3 py-2 text-icm-text-dim">
                                {s.category}
                              </td>
                              <td className="px-3 py-2 font-mono text-icm-text-dim">
                                {s.billingUnit}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-icm-red">
                                {s.rules.filter(r => r.type === "Hard Stop").length}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-icm-amber">
                                {s.rules.filter(r => r.type === "Warning").length}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}

// ---------- Step 2 ----------

const TEMPLATE_TYPES = [
  "Billable Activity Note",
  "Progress Note",
  "Monitoring Form",
  "Visit Summary",
  "Care Plan",
  "ISP",
  "Service Authorization",
  "Other",
];

function Step2({
  templates,
  setTemplates,
}: {
  templates: TemplateUpload[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateUpload[]>>;
}) {
  const addTemplate = () =>
    setTemplates((t) => [
      ...t,
      { id: `tpl-${Date.now()}`, type: TEMPLATE_TYPES[0], name: "" },
    ]);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 2 — Upload Templates
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Upload organization-level document templates. These will be used by the
          compliance agent to generate compliant documentation.
        </p>
      </div>

      <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4 flex items-start justify-between gap-3">
        <p className="text-[12px] text-icm-text font-geist leading-relaxed">
          Templates already configured in your system are available
          automatically. Upload additional templates here for this specific
          engine.
        </p>
        <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline shrink-0">
          Skip — use existing
        </button>
      </div>

      <div className="space-y-3">
        {templates.map((t, idx) => (
          <div
            key={t.id}
            className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist font-semibold">
                Template {idx + 1}
              </span>
              <button
                onClick={() =>
                  setTemplates((arr) => arr.filter((x) => x.id !== t.id))
                }
                className="text-[11px] font-geist text-icm-text-dim hover:text-icm-red"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Template type">
                <select
                  value={t.type}
                  onChange={(e) =>
                    setTemplates((arr) =>
                      arr.map((x) =>
                        x.id === t.id ? { ...x, type: e.target.value } : x,
                      ),
                    )
                  }
                  className={inputCls}
                >
                  {TEMPLATE_TYPES.map((tp) => (
                    <option key={tp}>{tp}</option>
                  ))}
                </select>
              </Field>
              <Field label="Template name">
                <input
                  value={t.name}
                  onChange={(e) =>
                    setTemplates((arr) =>
                      arr.map((x) =>
                        x.id === t.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="e.g. CCS Billable Activity Note 2026"
                  className={inputCls}
                />
              </Field>
            </div>
            <button
              onClick={() =>
                setTemplates((arr) =>
                  arr.map((x) =>
                    x.id === t.id
                      ? { ...x, fileName: "template.docx" }
                      : x,
                  ),
                )
              }
              className="w-full rounded-xl border-2 border-dashed border-icm-border bg-icm-bg hover:border-icm-accent/40 transition-all py-6 flex flex-col items-center gap-1.5"
            >
              <UploadCloud className="w-5 h-5 text-icm-text-faint" />
              <p className="text-[12px] text-icm-text font-geist">
                {t.fileName ?? "Drop template file or click to upload"}
              </p>
            </button>
          </div>
        ))}
        <button
          onClick={addTemplate}
          className="w-full h-10 rounded-xl border border-dashed border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add template
        </button>
      </div>
    </div>
  );
}

// ---------- Step 3 ----------

const SOURCES = [
  "Face Sheet / Profile",
  "Care Plan / ISP",
  "Contact Notes",
  "Progress Notes",
  "Visit Summary",
  "Monitoring Form",
  "Eligibility Verification",
  "Incident Reports",
  "Case Management Tasks",
  "Service Authorizations",
];

const CHECKS = [
  "Eligibility verification",
  "PCP / ISP alignment",
  "Service authorization limits",
  "Documentation completeness",
  "Visit frequency compliance",
  "Monitoring form completion",
  "Incident reporting compliance",
  "Goal progress documentation",
];

const DEFAULT_MAPPINGS = [
  {
    check: "Eligibility verification",
    sources: ["Profile (Medicaid ID)", "Eligibility Verification (MA Status)", "Program (Waiver Enrollment)"],
  },
  {
    check: "PCP / ISP alignment",
    sources: ["Care Plan / ISP (Goals)", "Profile (Diagnoses)", "Service Authorizations"],
  },
  {
    check: "Visit frequency compliance",
    sources: ["Contact Notes (Date)", "Visit Summary (Type)", "Case Management Tasks"],
  },
  {
    check: "Documentation completeness",
    sources: ["Progress Notes", "Contact Notes", "Monitoring Form"],
  },
];

function Step3() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 3 — Default Data Mapping
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Map organization-wide module defaults. This tells the compliance
          agent where to find and write data across iCM modules.
        </p>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5 text-icm-text-dim" />
              <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                Data Sources
              </h3>
            </div>
            <ul className="space-y-1.5">
              {SOURCES.map((s) => (
                <li
                  key={s}
                  className="px-3 py-2 rounded-lg bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden md:flex flex-col items-center justify-center pt-8 text-icm-text-faint">
            <ChevronRight className="w-5 h-5" />
            <span className="text-[10px] font-geist mt-1">feeds</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-icm-text-dim" />
              <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                Compliance Checks
              </h3>
            </div>
            <ul className="space-y-1.5">
              {CHECKS.map((c) => (
                <li
                  key={c}
                  className="px-3 py-2 rounded-lg bg-icm-accent-soft border border-icm-accent/20 text-[12px] font-geist text-icm-text"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-icm-border bg-icm-bg">
          <h3 className="text-[13px] font-geist font-semibold text-icm-text">
            Default field mappings
          </h3>
          <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
            Click any row to override the source fields for a specific check.
          </p>
        </div>
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg">
            <tr className="text-left text-icm-text-faint">
              <th className="px-4 py-2 w-[260px]">Compliance Check</th>
              <th className="px-4 py-2">Reads from</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-icm-border">
            {DEFAULT_MAPPINGS.map((m) => (
              <tr key={m.check} className="hover:bg-icm-bg/60 cursor-pointer">
                <td className="px-4 py-3 font-medium text-icm-text">
                  {m.check}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {m.sources.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text-dim"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Step 4 ----------

function Step4(props: {
  name: string;
  state: string;
  program: string;
  effectiveDate: string;
  confirmReviewed: boolean;
  setConfirmReviewed: (v: boolean) => void;
  confirmFrozen: boolean;
  setConfirmFrozen: (v: boolean) => void;
  onPublish: () => void;
  extracted: ExtractedService[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 4 — Review & Publish
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Review the extracted rules and publish the engine. Published engines
          are frozen and cannot be modified.
        </p>
      </div>

      <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft p-4 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-icm-text font-geist leading-relaxed">
          <span className="font-semibold">
            Publishing is permanent for this version.
          </span>{" "}
          Once published, this engine cannot be edited. To make changes, create
          a new version.
        </p>
      </div>

      {/* Engine summary card */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">
              {props.name || "Untitled engine"}
            </h3>
            <p className="text-[12px] text-icm-text-dim font-geist mt-1">
              {props.state || "—"} · {props.program || "—"} · Effective{" "}
              {props.effectiveDate || "—"} · v1.0
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">
            DRAFT → WILL BECOME PUBLISHED
          </span>
        </div>
        <div className="flex items-center gap-5 mt-3 text-[12px] font-geist">
          <span>
            Services: <span className="font-mono font-bold text-icm-accent">{props.extracted.length}</span>
          </span>
          <span>
            Hard stops:{" "}
            <span className="font-mono font-bold text-icm-red">
              {props.extracted.reduce((acc, s) => acc + s.rules.filter(r => r.type === "Hard Stop").length, 0)}
            </span>
          </span>
          <span>
            Warnings:{" "}
            <span className="font-mono font-bold text-icm-amber">
              {props.extracted.reduce((acc, s) => acc + s.rules.filter(r => r.type === "Warning").length, 0)}
            </span>
          </span>
        </div>
      </div>

      {/* Extracted services */}
      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-icm-border bg-icm-bg">
          <h3 className="text-[13px] font-geist font-semibold text-icm-text">
            Extracted services
          </h3>
        </div>
        <ul className="divide-y divide-icm-border">
          {props.extracted.map((s) => (
            <ServiceReviewRow key={s.name} service={s} />
          ))}
        </ul>
      </div>

      {/* Approval */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-3">
        <h3 className="text-[13px] font-geist font-semibold text-icm-text">
          Admin approval
        </h3>
        <p className="text-[12px] text-icm-text-dim font-geist">
          By publishing this engine, I confirm that the extracted rules have
          been reviewed and are accurate for{" "}
          <span className="font-semibold text-icm-text">
            {props.name || "this engine"}
          </span>
          .
        </p>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={props.confirmReviewed}
            onChange={(e) => props.setConfirmReviewed(e.target.checked)}
            className="mt-0.5 accent-[hsl(var(--icm-accent))]"
          />
          <span className="text-[12px] text-icm-text font-geist">
            I confirm this engine is ready for production use.
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={props.confirmFrozen}
            onChange={(e) => props.setConfirmFrozen(e.target.checked)}
            className="mt-0.5 accent-[hsl(var(--icm-accent))]"
          />
          <span className="text-[12px] text-icm-text font-geist">
            I understand this version will be frozen upon publishing.
          </span>
        </label>
        <div className="flex items-center justify-between text-[11.5px] font-geist text-icm-text-dim border-t border-icm-border pt-3">
          <span>
            Approver:{" "}
            <span className="font-semibold text-icm-text">Babar Nawaz</span>{" "}
            (Admin)
          </span>
          <span className="font-mono">
            {new Date().toLocaleDateString("en-US")}
          </span>
        </div>
        <button
          onClick={props.onPublish}
          disabled={!props.confirmReviewed || !props.confirmFrozen}
          className="w-full h-11 rounded-xl bg-icm-text text-icm-panel text-[13px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Publish Engine
        </button>
      </div>
    </div>
  );
}

function ServiceReviewRow({ service }: { service: ExtractedService }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-icm-bg/60 text-left"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate">
            {service.name}
          </p>
          <p className="text-[11px] font-geist text-icm-text-dim">
            {service.category} · {service.billingUnit}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
          <span className="text-icm-red">{service.hardStops} HS</span>
          <span className="text-icm-amber">{service.warnings} W</span>
        </div>
      </button>
      {open && (
        <ul className="px-12 pb-4 space-y-2">
          {service.rules.map((r, i) => {
            const tone = RULE_TYPE_TONE[r.type];
            return (
              <li
                key={i}
                className="rounded-lg border border-icm-border bg-icm-bg p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-geist font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring} shrink-0`}
                  >
                    {r.type}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-icm-panel border border-icm-border text-icm-text-dim shrink-0">
                    {r.section}
                  </span>
                  <p className="text-[12px] text-icm-text font-geist leading-snug flex-1">
                    {r.description}
                  </p>
                </div>
                <p className="text-[10.5px] font-mono text-icm-text-faint mt-1.5 ml-1">
                  {r.citation}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// ---------- Helpers ----------

const inputCls =
  "w-full h-9 px-3 rounded-xl bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 transition-colors";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint flex items-center gap-1">
        {label}
        {required && <span className="text-icm-red">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[10.5px] font-geist text-icm-text-faint">{hint}</p>
      )}
    </div>
  );
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-icm-panel rounded-2xl border border-icm-border shadow-elevated max-w-[480px] w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg hover:bg-icm-bg flex items-center justify-center text-icm-text-dim"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export default NewEngineWizard;
