import React, { useState, useEffect } from "react";
import {
  Shield,
  FileText,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Loader2,
  Sparkles,
  Brain,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Default prompts (must match functions/src/orchestrator/types.ts) ─────────

const DEFAULT_PROMPTS = {
  compliance: `You are a compliance analyst for a Developmental Disabilities (DD) waiver case management organization. Prioritize critical items first: overdue visits, expired MAs, lapsed PCPs and ISPs. Write findings in clear language a case manager can act on immediately. Be specific about days overdue and regulatory risk. Reference state DD waiver requirements. Never fabricate data — only report what is confirmed in the individual's record.`,

  documentation: `You are an expert IDD case management documentation specialist. Generate all drafts in person-first, strengths-based language that complies with DD waiver requirements. Include all required sections. Where information is missing, insert [CM INPUT REQUIRED] with a specific prompt for what is needed. Do not invent clinical details. Write at a professional level that case managers, supervisors, and auditors can review and approve without significant revision. Label all output as AI DRAFT — Requires Review.`,

  billing: `You are a DD waiver billing compliance specialist. Review service documentation for billing eligibility. Flag: unauthorized service codes, units exceeding authorization limits, dates outside authorization windows, missing required signatures, and documentation that does not support medical necessity. Prioritize findings by denial risk: HIGH, MEDIUM, or LOW. Write in plain language that case managers and billing staff can act on immediately.`,

  escalation: `You are an escalation coordinator for a case management organization. Draft supervisor notifications that are direct, factual, and actionable. Each notification must include: individual name and ID, specific compliance gap with days overdue, regulatory risk, and recommended immediate action. Lead with priority level: CRITICAL, HIGH, or MEDIUM. Keep messages concise — supervisors need to act quickly. Do not editorialize.`,

  renewal: `You are a DD waiver service renewal specialist. Generate renewal packets that anticipate state review committee requirements. Include: justification for continued services, evidence of progress toward current plan goals, changes in support needs, updated risk documentation, and identification of any missing items that could cause renewal denial. Use person-first language throughout. Base all content on the individual's documentation record. Flag any gaps explicitly. Label all output as AI DRAFT — Requires CM Review before submission.`,

  assessment: `You are the Assessment Compliance Agent for a DD waiver case management organization.

Your role is to monitor assessment completion requirements for all individuals.

CHECK ORDER:
1. Initial assessments never completed — CRITICAL if past enrollment window
2. Recurring assessments overdue by >30 days — CRITICAL
3. Assessments due within 14 days — WARNING
4. Assessments due within 30 days — INFO
5. Assessment score changed >10 points from prior — flag for PCP review

PRIORITY RULES:
- Never-completed initial assessments block PCP generation accuracy
- Outdated assessments (>13 months) should trigger PCP review
- Always link findings to the specific template and program requirement
- When both a PCP renewal AND assessment are due, surface both separately

MESSAGING:
- Include individual name, template name, days overdue/until due
- For score changes: include old score, new score, and what changed`,

  authorization: `You are the Authorization Agent for a DD waiver case management organization. Monitor all service authorizations and ensure no authorization expires without a renewal being initiated.

EXPIRATION THRESHOLDS: 90 days = log informational · 60 days = planning task · 30 days = high-priority task + notify CM · 14 days = critical task + notify CM and supervisor · 7 days or less = escalate immediately + notify supervisor and director.

PACE MONITORING: Flag any authorization where projected unit exhaustion is more than 14 days before the auth end date. For Supported Living and Community Habilitation, use a tighter threshold of 7 days.

MESSAGING: Be direct and specific — include days remaining, auth number, and service name in every message. For expired auths with continued service delivery, lead with "BILLING GAP DETECTED". For pace warnings, always include the daily usage rate and projected exhaustion date.

PRIORITY RULES: Billing gap violations always take priority. Expired authorizations are always CRITICAL regardless of other factors. When an individual has both a PCP compliance issue AND an auth expiration, surface both separately.`,
};

type AgentKey = keyof typeof DEFAULT_PROMPTS;

interface PromptMeta {
  updated_at?: string;
  updated_by?: string;
}

const AGENT_CONFIG: Record<AgentKey, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  description: string;
  usesAI: boolean;
}> = {
  compliance: {
    label: "Compliance Agent",
    icon: Shield,
    color: "text-icm-accent",
    bg: "bg-icm-accent-soft",
    border: "border-l-icm-accent",
    description: "Evaluates every individual against state DD waiver rules. Controls how compliance findings are written and prioritized.",
    usesAI: true,
  },
  documentation: {
    label: "Documentation Agent",
    icon: FileText,
    color: "text-icm-green",
    bg: "bg-icm-green-soft",
    border: "border-l-icm-green",
    description: "Generates monitoring form pre-fills and PCP renewal summaries. This prompt directly controls the AI's writing style and clinical focus.",
    usesAI: true,
  },
  billing: {
    label: "Billing Agent",
    icon: CreditCard,
    color: "text-icm-amber",
    bg: "bg-icm-amber-soft",
    border: "border-l-icm-amber",
    description: "Scans for billing gaps, unsigned notes, and expiring authorizations. Controls how billing risks are described to case managers.",
    usesAI: true,
  },
  escalation: {
    label: "Escalation Agent",
    icon: AlertTriangle,
    color: "text-icm-red",
    bg: "bg-icm-red-soft",
    border: "border-l-icm-red",
    description: "Writes supervisor escalation notifications when items exceed thresholds. Controls the tone and content of escalation messages.",
    usesAI: true,
  },
  renewal: {
    label: "Renewal Agent",
    icon: RefreshCw,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-l-purple-500",
    description: "Generates PCP/ISP renewal packets from 12 months of documentation. This prompt controls the renewal packet structure and clinical emphasis.",
    usesAI: true,
  },
  authorization: {
    label: "Authorization Agent",
    icon: Shield,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-l-orange-500",
    description: "Monitors service authorization expiration dates and unit utilization pace. Controls thresholds, escalation rules, and how renewal tasks are phrased.",
    usesAI: true,
  },
  assessment: {
    label: "Assessment Compliance Agent",
    icon: FileText,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-l-yellow-500",
    description: "Monitors assessment completion schedules. Tracks initial assessment windows, annual/quarterly due dates, and assessment-to-PCP prerequisite requirements.",
    usesAI: true,
  },
};

// ─── Single Agent Prompt Card ─────────────────────────────────────────────────

function AgentPromptCard({
  agentKey,
  prompt,
  meta,
  onSave,
}: {
  agentKey: AgentKey;
  prompt: string;
  meta: PromptMeta;
  onSave: (key: AgentKey, value: string) => Promise<void>;
}) {
  const cfg = AGENT_CONFIG[agentKey];
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(prompt);
  const [saving, setSaving] = useState(false);
  const isDirty = draft !== prompt;
  const isDefault = draft === DEFAULT_PROMPTS[agentKey];

  // Sync when parent prompt changes
  useEffect(() => { setDraft(prompt); }, [prompt]);

  async function handleSave() {
    setSaving(true);
    await onSave(agentKey, draft);
    setSaving(false);
  }

  function handleRestoreDefault() {
    setDraft(DEFAULT_PROMPTS[agentKey]);
  }

  return (
    <div className={cn(
      "rounded-xl border border-icm-border border-l-[3px] bg-icm-panel overflow-hidden",
      cfg.border
    )}>
      {/* Header */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-icm-bg transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
          <cfg.icon className={cn("w-4 h-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-manrope font-bold text-[13px] text-icm-text">{cfg.label}</p>
            {isDirty && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-geist font-bold bg-icm-amber-soft text-icm-amber">
                UNSAVED
              </span>
            )}
          </div>
          <p className="text-[11px] font-geist text-icm-text-dim mt-0.5 leading-snug line-clamp-1">
            {cfg.description}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-icm-text-faint shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-icm-text-faint shrink-0 mt-1" />
        }
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-icm-border p-4 space-y-3 bg-icm-bg">
          <p className="text-[11.5px] font-geist text-icm-text-dim leading-relaxed">
            {cfg.description} Edit this prompt to change how the AI reasons, what it prioritizes, and how it writes.
          </p>

          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={6}
            className="w-full p-3 rounded-xl bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text leading-relaxed focus:outline-none focus:border-icm-accent/40 resize-y"
            placeholder="Enter instructions for this agent..."
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {!isDefault && (
                <button
                  onClick={handleRestoreDefault}
                  className="inline-flex items-center gap-1.5 text-[11px] font-geist text-icm-text-dim hover:text-icm-text"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore default
                </button>
              )}
              {meta.updated_at && (
                <span className="text-[10.5px] font-geist text-icm-text-faint">
                  Saved {meta.updated_at}{meta.updated_by ? ` by ${meta.updated_by}` : ""}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={cn(
                "h-8 px-3 rounded-xl text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 transition-colors",
                isDirty
                  ? "bg-icm-accent text-white hover:bg-icm-accent/90"
                  : "bg-icm-bg border border-icm-border text-icm-text-faint cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save prompt"}
            </button>
          </div>

          <p className="text-[10px] font-geist text-icm-text-faint">
            {draft.length} characters · Changes take effect on the next orchestrator run
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Prompt Studio Section ────────────────────────────────────────────────────

export function PromptStudio() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [prompts, setPrompts] = useState<typeof DEFAULT_PROMPTS>({ ...DEFAULT_PROMPTS });
  const [metas, setMetas] = useState<Record<AgentKey, PromptMeta>>({
    compliance: {}, documentation: {}, billing: {}, escalation: {}, renewal: {}, authorization: {}, assessment: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    getDoc(doc(db, "organizations", orgId, "settings", "orchestrator_prompts"))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setPrompts({
            compliance: data.compliance || DEFAULT_PROMPTS.compliance,
            documentation: data.documentation || DEFAULT_PROMPTS.documentation,
            billing: data.billing || DEFAULT_PROMPTS.billing,
            escalation: data.escalation || DEFAULT_PROMPTS.escalation,
            renewal: data.renewal || DEFAULT_PROMPTS.renewal,
            authorization: data.authorization || DEFAULT_PROMPTS.authorization,
            assessment: data.assessment || DEFAULT_PROMPTS.assessment,
          });
          // Load per-agent metadata if stored
          const metaObj: Record<AgentKey, PromptMeta> = {
            compliance: {}, documentation: {}, billing: {}, escalation: {}, renewal: {}, authorization: {}, assessment: {},
          };
          for (const key of Object.keys(metaObj) as AgentKey[]) {
            if (data[`${key}_updated_at`]) {
              metaObj[key] = {
                updated_at: new Date(data[`${key}_updated_at`].toDate()).toLocaleDateString(),
                updated_by: data[`${key}_updated_by`],
              };
            }
          }
          setMetas(metaObj);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleSave(key: AgentKey, value: string) {
    if (!orgId) return;
    const now = new Date();
    try {
      const updateData: Record<string, unknown> = {
        [key]: value,
        [`${key}_updated_at`]: now,
        [`${key}_updated_by`]: userProfile?.displayName || userProfile?.email || "Admin",
        updated_at: now,
      };
      await setDoc(
        doc(db, "organizations", orgId, "settings", "orchestrator_prompts"),
        updateData,
        { merge: true }
      );
      setPrompts(p => ({ ...p, [key]: value }));
      setMetas(m => ({
        ...m,
        [key]: {
          updated_at: now.toLocaleDateString(),
          updated_by: userProfile?.displayName || userProfile?.email || "Admin",
        },
      }));
      toast.success(`${AGENT_CONFIG[key].label} prompt saved`);
    } catch {
      toast.error("Failed to save prompt");
    }
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 ring-1 ring-indigo-500/20 flex items-center justify-center shrink-0">
          <Brain className="w-4.5 h-4.5 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-manrope font-bold text-[14px] text-icm-text">Prompt Studio</h3>
          <p className="text-[12px] font-geist text-icm-text-dim mt-0.5 leading-snug">
            These prompts are the AI's instructions — they control how each agent thinks, what it prioritizes, and how it writes.
            Edit them to make the orchestrator smarter and more aligned to your organization's standards.
            Changes take effect on the <strong className="text-icm-text">next run</strong> — no deployment needed.
          </p>
        </div>
      </div>

      {/* AI capability callout */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3 flex gap-2.5 items-start">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-[11.5px] font-geist text-indigo-700 dark:text-indigo-300 leading-relaxed">
          <strong>How to make it smarter:</strong> Add organization-specific rules (e.g. "always flag individuals in the Waiver Expansion program first"),
          clinical priorities, preferred writing style, or state-specific compliance nuances.
          The more specific your prompt, the more useful the AI's output becomes.
        </p>
      </div>

      {/* Agent cards */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-icm-bg border border-icm-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(Object.keys(AGENT_CONFIG) as AgentKey[]).map(key => (
            <AgentPromptCard
              key={key}
              agentKey={key}
              prompt={prompts[key]}
              meta={metas[key]}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
