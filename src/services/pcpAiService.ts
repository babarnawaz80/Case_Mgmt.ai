// PCP AI Service — Person-Centered Plan extraction via Firebase Cloud Function
// CaseManagement.AI
//
// DEMO MODE (VITE_DEMO_MODE=true): returns hardcoded mock responses instantly.
//   → Zero API cost. Used for all demo/production deployments until the
//     geminiProxy Cloud Function is promoted to live.
//
// LIVE MODE (VITE_DEMO_MODE=false): POSTs the prompt to the geminiProxy Cloud
//   Function. The Gemini API key lives in Firebase Functions env config only —
//   it is NEVER present in this file or any other frontend file.

import { auth } from "@/lib/firebase";

// ─── Feature flag ─────────────────────────────────────────────────────────────
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// ─── Cloud Function URL (used only when DEMO_MODE is false) ──────────────────
const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";
const GEMINI_PROXY_URL = `${FUNCTIONS_BASE}/api/gemini-proxy`;

// ─── Return type ──────────────────────────────────────────────────────────────

export interface ExtractedPcpData {
  goodLife: string;
  importantTo: string[];
  importantFor: string[];
  goals: Array<{
    title: string;
    description: string;
    status: string;
    targetDate: string;
    responsible: string;
  }>;
  focusValues: Record<string, string>;
  emergencyPlan: string;
  servicesNotes: string;
  rightsNotes: string;
  teamNotes: string;
  bspNotes: string;
  chartItems: string[];
}

// ─── Mock response (DEMO_MODE=true) ──────────────────────────────────────────
// Realistic, plan-type-aware data so every demo field looks production-ready.

function buildMockResponse(
  filesData: { name: string; base64: string }[],
  planType: string
): ExtractedPcpData {
  const isISP    = /isp|individual.*support/i.test(planType);
  const isPCP    = /pcp|person.*centered/i.test(planType);
  const isHCBS   = /hcbs|waiver/i.test(planType);
  const isAnnual = /annual|yearly/i.test(planType);

  const today = new Date();
  const date = (offsetDays: number) =>
    new Date(today.getTime() + offsetDays * 86_400_000)
      .toISOString()
      .slice(0, 10);

  const planLabel = planType || "Person-Centered Plan";
  const fileNames = filesData.map((f) => f.name).filter(Boolean);
  const fileRef   = fileNames.length
    ? `Based on the uploaded documents (${fileNames.join(", ")}), `
    : "";

  return {
    goodLife:
      `${fileRef}Maria envisions a fulfilling life surrounded by family and close ` +
      `friends, with the freedom to make her own choices about her daily routine. ` +
      `She wants to be an active member of her community — attending local events, ` +
      `volunteering at her church, and exploring supported employment opportunities ` +
      `that match her passion for working with animals. Above all, she values her ` +
      `independence and the confidence that comes from mastering new skills. ` +
      `This ${planLabel} reflects her voice, her priorities, and her path forward.`,

    importantTo: [
      "Spending regular time with her sister and two nephews",
      "Attending Sunday services and her weekly church social group",
      "Caring for her cat, Luna, and volunteering at the local animal shelter",
      "Having a consistent daily routine she helped design herself",
      "Listening to music and cooking traditional family recipes",
    ],

    importantFor: [
      "Maintaining all scheduled medical and psychiatric appointments",
      "Taking prescribed medications consistently every morning",
      "Sleeping a minimum of 7 hours per night (documented health priority)",
      "Monthly check-in with case manager to review goal progress",
      "Immediate emergency contact protocol when crisis indicators appear",
    ],

    goals: [
      {
        title: isISP ? "Supported Employment Exploration" : "Community Integration",
        description: isISP
          ? "Maria will work with her employment specialist to explore part-time positions " +
            "at animal shelters or veterinary offices. She will complete a vocational " +
            "interest assessment and attend at least two job-shadow opportunities by the " +
            "target date. Progress will be tracked monthly in her ISP review notes."
          : "Maria will participate in at least two community activities per month, " +
            "documented by her support staff. Activities may include church events, " +
            "community center programs, or volunteer opportunities aligned with her interests.",
        status: "New goal",
        targetDate: date(90),
        responsible: "Case Manager / Employment Specialist",
      },
      {
        title: "Health & Wellness Maintenance",
        description:
          "Maria will attend all scheduled primary care, psychiatric, and specialist " +
          "appointments. Case manager will coordinate transportation and follow up " +
          "within 48 hours of any missed appointment. Medication adherence will be " +
          "reviewed at each monthly check-in.",
        status: "Ongoing — carried from prior plan",
        targetDate: date(180),
        responsible: "Case Manager / PCP / Psychiatric Provider",
      },
      {
        title: isPCP || isHCBS ? "Daily Living Skills — Meal Preparation" : "Independent Living Skills",
        description:
          "Maria will practice preparing two new recipes per month using the step-by-step " +
          "visual guides developed with her support staff. Progress toward independence " +
          "in this area supports her long-term goal of transitioning to a shared apartment " +
          "arrangement within 18 months.",
        status: "New goal",
        targetDate: date(120),
        responsible: "Residential Support Staff / Case Manager",
      },
      ...(isAnnual || isISP
        ? [
            {
              title: "Natural Supports Development",
              description:
                "Maria will identify and strengthen at least three natural supports " +
                "(family members, friends, or community members) who can assist her " +
                "outside of paid support hours. A natural supports map will be " +
                "completed by the next annual review.",
              status: "New goal",
              targetDate: date(150),
              responsible: "Case Manager / Family",
            },
          ]
        : []),
    ],

    focusValues: {
      employment:
        "Maria is interested in part-time employment in an animal-care setting. " +
        "Next step: complete vocational assessment and identify job-shadow sites " +
        "by " + date(60) + ".",
      community:
        "Maintain active participation in church social group (weekly) and animal " +
        "shelter volunteering (biweekly). Case manager to document attendance monthly.",
      health:
        "All medical and psychiatric appointments current. Medication compliance " +
        "monitored monthly. Annual physical scheduled for " + date(45) + ".",
      housing:
        "Currently stable in licensed residential setting. Long-term goal: transition " +
        "to shared apartment with natural support by " + date(540) + ". " +
        "Independent living skills to be built incrementally.",
      relationships:
        "Strong bond with sister (primary natural support) and two nephews. " +
        "Case manager facilitates at least one family visit per month. " +
        "Church community provides consistent social connection.",
      education:
        "Maria expressed interest in an online pet-care certification course. " +
        "Case manager to research options and costs by " + date(60) + ". " +
        "Literacy support available if needed.",
    },

    emergencyPlan:
      "Primary contact: Sarah (sister) — (555) 820-4411. " +
      "Secondary: Residential program on-call line — (555) 200-9900, available 24/7. " +
      "If Maria displays crisis indicators (withdrawal, refusal of medication, " +
      "aggression), staff must contact on-call supervisor within 30 minutes. " +
      "Nearest ER: Carroll County General, 5 mi. " +
      "Psychiatric crisis line: (800) 422-0009. " +
      "De-escalation strategy: offer quiet space, familiar music, presence of Luna (cat).",

    servicesNotes:
      "Current authorized services: Community Living Support (40 hrs/wk), " +
      "Supported Employment (up to 20 hrs/wk pending job placement), " +
      "Respite Care (48 hrs/quarter — family provider approved). " +
      "Natural supports: sister Sarah provides weekend visits and grocery runs. " +
      "Church social group (unpaid, weekly). " +
      "Animal shelter volunteer coordinator — informal natural support.",

    rightsNotes:
      "Maria has reviewed and signed the Rights and Responsibilities agreement " +
      "dated " + date(-10) + ". She retains full decision-making authority. " +
      "No guardianship or supported decision-making agreement currently in place. " +
      "Grievance procedure explained verbally and in writing. " +
      "Maria confirmed understanding of her right to choose, refuse, or modify services.",

    teamNotes:
      "Case Manager: Kathy B. (lead, monthly contact). " +
      "Residential Program Manager: On-site (daily). " +
      "Employment Specialist: To be assigned — referral submitted " + date(-5) + ". " +
      "Primary Care Physician: Dr. Patel — next visit " + date(30) + ". " +
      "Psychiatric Provider: Dr. Nguyen — next visit " + date(21) + ". " +
      "Family: Sarah (sister, primary natural support). " +
      "Plan meeting quorum met: all required parties participated.",

    bspNotes:
      "No active Behavior Support Plan on file. " +
      "Historical note: mild anxiety-related behaviors observed during transitions. " +
      "Current strategy: 15-minute advance notice before schedule changes, " +
      "use of visual schedule board in residential setting. " +
      "No restrictive interventions authorized or in use. " +
      "If behaviors escalate, initiate functional behavior assessment within 30 days.",

    chartItems: [
      `${planLabel} draft generated from ${fileNames.length || 0} uploaded document(s)`,
      `${isISP ? "4" : "3"} goals drafted — review and adjust targets before saving`,
      "Good Life statement written from individual's perspective",
      "Emergency contacts and crisis protocol populated",
      "Team roster reflects current providers as of " + date(0),
      "All focus area values completed — edit to match individual assessment data",
      fileNames.length
        ? `Source files referenced: ${fileNames.slice(0, 3).join(", ")}${fileNames.length > 3 ? ` +${fileNames.length - 3} more` : ""}`
        : "No source documents uploaded — goals are illustrative; update before signing",
      "Demo mode active — save draft, then review with supervisor before finalizing",
    ],
  };
}

// ─── Helpers (LIVE MODE only) ─────────────────────────────────────────────────

async function getIdToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("User is not authenticated. Please sign in and try again.");
  return token;
}

async function callGeminiProxy(
  prompt: string,
  systemPrompt: string,
  idToken: string
): Promise<string> {
  const res = await fetch(GEMINI_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ prompt, systemPrompt, maxTokens: 8192, temperature: 0.3 }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Authentication failed. Please sign in again.");
  }
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Rate limit reached. You can make up to 20 AI requests per hour.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Unexpected error from AI service (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!data.text) throw new Error("AI service returned an empty response.");
  return data.text as string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function extractPcpDataFromPdfs(
  filesData: { name: string; base64: string }[],
  planType: string
): Promise<ExtractedPcpData> {
  // ── DEMO MODE: return mock instantly, no network call, no API cost ──────────
  if (DEMO_MODE) {
    // Brief artificial delay so the UI loading state feels natural
    await new Promise((r) => setTimeout(r, 1_800));
    return buildMockResponse(filesData, planType);
  }

  // ── LIVE MODE: call the geminiProxy Cloud Function ──────────────────────────
  const idToken = await getIdToken();

  const fileList = filesData.length
    ? filesData.map((f, i) => `  ${i + 1}. ${f.name}`).join("\n")
    : "  (no documents uploaded)";

  const systemPrompt =
    "You are a highly analytical Case Management AI specializing in Person-Centered Planning " +
    "for Home and Community-Based Services (HCBS) waiver programs. " +
    "You produce structured, clinically appropriate draft plans in strict JSON format. " +
    "Return ONLY valid JSON — no markdown, no backticks, no extra text.";

  const prompt = `
You are drafting a Person-Centered Plan (PCP) of type: ${planType}.

The following source documents were uploaded by the case manager:
${fileList}

Using the plan type and document names as context, generate a comprehensive PCP draft.
Return ONLY a valid JSON object matching this exact schema — no markdown, no backticks:

{
  "goodLife": "A detailed paragraph describing the person's vision for a good life, written from their perspective.",
  "importantTo": ["3-5 strings: what is important TO the person — preferences, relationships, joys"],
  "importantFor": ["3-5 strings: what is important FOR the person — health, safety, non-negotiable needs"],
  "goals": [
    {
      "title": "Short goal title",
      "description": "Detailed description and expected outcomes",
      "status": "New goal",
      "targetDate": "YYYY-MM-DD",
      "responsible": "Case Manager | Provider | Family"
    }
  ],
  "focusValues": {
    "employment": "Employment goals and current status",
    "community": "Community integration goals",
    "health": "Health and wellness goals",
    "housing": "Housing goals",
    "relationships": "Relationship and social support goals",
    "education": "Education and skills training goals"
  },
  "emergencyPlan": "Emergency backup plan — who to contact, backup supports, crisis resources",
  "servicesNotes": "Recommended services and natural supports based on plan type",
  "rightsNotes": "Rights and responsibilities relevant to this plan type",
  "teamNotes": "Typical team composition for this plan type (roles, not names)",
  "bspNotes": "Behavior support plan notes if applicable, otherwise 'None identified'",
  "chartItems": [
    "5-8 brief summary bullets describing what was produced"
  ]
}

Generate at least 3 realistic goals appropriate for a ${planType} plan.
Dates should be realistic targets 60-180 days from today (${new Date().toISOString().slice(0, 10)}).
`.trim();

  const rawText = await callGeminiProxy(prompt, systemPrompt, idToken);

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: ExtractedPcpData;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned a response that could not be parsed. Please try again.");
  }

  if (!parsed.goodLife || !Array.isArray(parsed.goals)) {
    throw new Error("AI response was missing required fields. Please try again.");
  }

  return parsed;
}
