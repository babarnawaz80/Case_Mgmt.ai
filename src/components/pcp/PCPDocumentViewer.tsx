/**
 * PCPDocumentViewer.tsx
 * Full-page document viewer for PCP v2 format plans.
 * Shows all 10 sections in a 3-panel layout with AI badges,
 * review banner, and flagged item sidebar.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Sparkles, X, FileText, Users, Heart, Briefcase,
  ShieldCheck, ListChecks, BookOpen, Award, Edit3, Download,
  Send, CheckCircle2, AlertTriangle, Info, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PCPSendModal } from "./PCPSendModal";
import type { PCPRecord } from "@/data/pcpMockData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PCPDocumentViewerProps {
  pcp: PCPRecord;
  individualId: string;
  individualName: string;
  isAiGenerated?: boolean;
}

interface NavSection {
  key: string;
  number: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  complete: boolean;
}

// ─── Section Navigator ────────────────────────────────────────────────────────

function SectionNav({
  sections,
  activeKey,
  onSelect,
}: {
  sections: NavSection[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const completedCount = sections.filter((s) => s.complete).length;
  return (
    <div className="w-64 shrink-0 border-r border-icm-border bg-icm-panel flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-icm-border">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">
          Plan Sections
        </p>
        <div className="w-full h-1.5 bg-icm-border rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${(completedCount / sections.length) * 100}%` }}
          />
        </div>
        <p className="text-[10.5px] text-icm-text-dim mt-1">
          {completedCount} of {sections.length} sections complete
        </p>
      </div>
      <div className="flex-1 py-2">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = s.key === activeKey;
          return (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "bg-indigo-50 border-r-2 border-indigo-600"
                  : "hover:bg-icm-bg/60"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  s.complete
                    ? "bg-teal-100 text-teal-600"
                    : isActive
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-icm-bg border border-icm-border text-icm-text-faint"
                }`}
              >
                {s.complete ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[11px] font-mono font-bold ${
                    isActive ? "text-indigo-600" : "text-icm-text-faint"
                  }`}
                >
                  {s.number}.
                </p>
                <p
                  className={`text-[11.5px] leading-snug truncate ${
                    isActive
                      ? "text-indigo-700 font-semibold"
                      : s.complete
                      ? "text-teal-700"
                      : "text-icm-text-dim"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section Display ──────────────────────────────────────────────────────────

function SectionCard({
  number,
  title,
  aiGenerated,
  children,
  onEdit,
}: {
  number: number;
  title: string;
  aiGenerated?: boolean;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div
      id={`section-${number}`}
      className="rounded-xl border border-icm-border bg-white overflow-hidden mb-4"
    >
      <div className="px-5 py-3.5 border-b border-icm-border bg-icm-bg/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-icm-border/50 text-icm-text-dim">
            §{number}
          </span>
          <h3 className="font-manrope font-bold text-[14px] text-icm-text">{title}</h3>
          {aiGenerated && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold ai-gradient text-white">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[11.5px] text-icm-accent hover:underline"
          >
            <Edit3 className="w-3 h-3" /> Edit section
          </button>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-0.5">
        {label}
      </p>
      <p className="text-[13px] text-icm-text">{value || "—"}</p>
    </div>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-icm-bg border border-icm-border text-[11.5px] text-icm-text">
      {text}
    </span>
  );
}

// ─── AI Suggestions Panel ─────────────────────────────────────────────────────

function AIPanel({ aiGenerated }: { aiGenerated: boolean }) {
  return (
    <div className="w-72 shrink-0 border-l border-icm-border bg-icm-panel flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-icm-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg ai-gradient flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-icm-text">Case Management AI</p>
            <p className="text-[10.5px] text-icm-text-dim">Active · {aiGenerated ? "2 items to review" : "Ready"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {aiGenerated && (
          <>
            {/* Urgent */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[9.5px] uppercase tracking-wide font-bold text-amber-600 mb-1">Urgent</p>
              <p className="text-[12px] text-amber-800 leading-relaxed">
                2 signatures still pending before this plan can be submitted
              </p>
              <button
                onClick={() => toast.success("Signature requests sent")}
                className="mt-2 text-[11px] text-amber-700 font-semibold hover:underline"
              >
                Request signatures →
              </button>
            </div>

            {/* Insight 1 */}
            <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-3">
              <p className="text-[9.5px] uppercase tracking-wide font-bold text-icm-accent mb-1">Insight</p>
              <p className="text-[12px] text-icm-text leading-relaxed">
                Employment goal mentioned in 5 sessions but has no service authorization linked
              </p>
              <button
                onClick={() => toast("Add authorization", { description: "Opening authorization picker…" })}
                className="mt-2 text-[11px] text-icm-accent font-semibold hover:underline"
              >
                Add authorization →
              </button>
            </div>

            {/* Insight 2 */}
            <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-3">
              <p className="text-[9.5px] uppercase tracking-wide font-bold text-icm-accent mb-1">Insight</p>
              <p className="text-[12px] text-icm-text leading-relaxed">
                MA renewal due in 45 days — plan period extends past renewal date
              </p>
              <button
                onClick={() => toast.success("Reminder added to My Work")}
                className="mt-2 text-[11px] text-icm-accent font-semibold hover:underline"
              >
                Add reminder →
              </button>
            </div>
          </>
        )}

        {!aiGenerated && (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl ai-gradient flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <p className="text-[12px] text-icm-text-dim">Plan looks good. No items flagged.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PCPDocumentViewer({
  pcp,
  individualId,
  individualName,
  isAiGenerated,
}: PCPDocumentViewerProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("1");
  const [aiBannerVisible, setAiBannerVisible] = useState(true);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const aiGen = isAiGenerated ?? pcp.ai_generated;

  const nameParts = individualName.split(" ");
  const displayName =
    nameParts.length >= 2
      ? `${nameParts[nameParts.length - 1]}, ${nameParts.slice(0, -1).join(" ")}`
      : individualName;

  const statusClass =
    pcp.status === "approved"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : pcp.status === "pending_signatures"
      ? "bg-blue-50 text-blue-600 ring-blue-200"
      : pcp.status === "submitted"
      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
      : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20";

  const statusLabel =
    pcp.status === "approved" ? "Approved"
    : pcp.status === "pending_signatures" ? "Pending Signatures"
    : pcp.status === "submitted" ? "Submitted"
    : "Draft";

  const planTypeLabel =
    pcp.plan_type === "annual" ? "Annual 2026"
    : pcp.plan_type === "initial" ? "Initial Plan"
    : "Revised Plan";

  const navSections: NavSection[] = [
    { key: "1",  number: 1,  label: "Individual Profile Summary",   icon: Users,      complete: true  },
    { key: "2",  number: 2,  label: "Personally Defined Good Life", icon: Heart,      complete: !!pcp.sections?.good_life },
    { key: "3",  number: 3,  label: "Important To / Important For", icon: ListChecks, complete: true  },
    { key: "4",  number: 4,  label: "Focus Area Exploration",       icon: Briefcase,  complete: true  },
    { key: "5",  number: 5,  label: "Goals & Outcomes",             icon: Award,      complete: (pcp.sections?.goals?.length ?? 0) > 0 },
    { key: "6",  number: 6,  label: "Health & Safety / Risks",      icon: ShieldCheck,complete: true  },
    { key: "7",  number: 7,  label: "Services & Supports",          icon: Briefcase,  complete: (pcp.sections?.services?.length ?? 0) > 0 },
    { key: "8",  number: 8,  label: "Rights & Responsibilities",    icon: BookOpen,   complete: false },
    { key: "9",  number: 9,  label: "Team Members & Signatures",    icon: Users,      complete: (pcp.sections?.team?.length ?? 0) > 0 },
    { key: "10", number: 10, label: "BSP & Legal References",       icon: FileText,   complete: false },
  ];

  const s = pcp.sections ?? {};

  const scrollTo = (key: string) => {
    setActiveSection(key);
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Left sidebar */}
      <SectionNav sections={navSections} activeKey={activeSection} onSelect={scrollTo} />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-icm-border px-6 py-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/people/${individualId}/care-plan`)}
            className="inline-flex items-center gap-1 text-[11.5px] text-icm-text-dim hover:text-icm-text mr-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Care Plan Board
          </button>
          <div className="h-4 w-px bg-icm-border" />
          <span className="text-[13px] font-semibold text-icm-text">{displayName}</span>
          <span className="text-icm-text-faint">·</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10.5px] font-semibold ring-1 ring-indigo-200">
            {planTypeLabel}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${statusClass}`}>
            {statusLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => toast("Edit mode", { description: "Click any section's 'Edit section' button to make changes." })}
              className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => setSendModalOpen(true)}
              className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
            <button
              onClick={() => toast.success(`Downloading PCP_${displayName.replace(", ", "")}_${planTypeLabel.replace(" ", "")}_${new Date().getFullYear()}.pdf`)}
              className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button
              onClick={() => toast.success("Plan marked as final", { description: "Status updated to Submitted." })}
              className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-[11.5px] font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5"
            >
              Mark as Final
            </button>
          </div>
        </div>

        {/* AI review banner */}
        {aiGen && aiBannerVisible && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-amber-800">
                  ⟡ AI-generated draft — Review all sections before marking as final.
                </p>
                <p className="text-[11.5px] text-amber-700 mt-0.5">
                  2 items flagged for your attention — see AI panel on the right.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiBannerVisible(false)}
              className="text-amber-600 hover:text-amber-800 shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Document sections */}
        <div className="px-6 py-4">

          {/* Section 1: Individual Profile */}
          <SectionCard number={1} title="Individual Profile Summary" aiGenerated={aiGen} onEdit={() => toast("Edit section 1")}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Full Legal Name" value={s.profile?.name || individualName} />
              <Field label="Preferred Name" value={s.profile?.preferred_name || "Joe"} />
              <Field label="Date of Birth" value={s.profile?.dob || "03/15/1990"} />
              <Field label="Age" value={s.profile?.age || "36"} />
              <Field label="Gender" value={s.profile?.gender || "Male"} />
              <Field label="County" value={s.profile?.county || "Carroll County"} />
              <Field label="Medicaid ID" value={s.profile?.medicaid_id || "MA-7842301"} />
              <Field label="Program" value={s.profile?.program || "Maryland DDA — Community Pathways"} />
              <Field label="Waiver Type" value={s.profile?.waiver || "DD Waiver"} />
              <Field label="Plan Type" value={pcp.plan_type === "annual" ? "Annual Plan" : pcp.plan_type === "initial" ? "Initial Plan" : "Revised Plan"} />
              <Field label="Effective Date" value={pcp.effective_date} />
              <Field label="Annual Plan Date" value={pcp.annual_plan_date} />
              <Field label="CCS Name" value={s.profile?.ccs_name || "Kathy Adams"} />
              <Field label="CCS Agency" value={s.profile?.ccs_agency || "Carroll County Case Management"} />
              <Field label="CCS Phone" value={s.profile?.ccs_phone || "(410) 555-0102"} />
            </div>
          </SectionCard>

          {/* Section 2: Good Life */}
          <SectionCard number={2} title="Personally Defined Good Life" aiGenerated={aiGen} onEdit={() => toast("Edit section 2")}>
            <p className="text-[13.5px] text-icm-text leading-relaxed">
              {s.good_life || "Joe wants to work part-time at a job where he can do structured tasks like sorting or stocking. He loves going to community events and seeing his friends from Day Hab. He wants to stay close to his mom and have his own space someday. Joe says a good life means having a job, going places in the community, and feeling safe at home."}
            </p>
          </SectionCard>

          {/* Section 3: Important To / For */}
          <SectionCard number={3} title="Important To / Important For" aiGenerated={aiGen} onEdit={() => toast("Edit section 3")}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">
                  Important TO Joe
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(s.important_to || [
                    "Spending time with his mother",
                    "Attending Day Habilitation program",
                    "Community events and outings",
                    "Part-time employment",
                  ]).map((item: string, i: number) => (
                    <Chip key={i} text={item} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">
                  Important FOR Joe
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(s.important_for || [
                    "Consistent medication management",
                    "Behavioral support monitoring",
                    "Regular health check-ins",
                    "MA eligibility maintenance",
                  ]).map((item: string, i: number) => (
                    <Chip key={i} text={item} />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Section 4: Focus Areas */}
          <SectionCard number={4} title="Focus Area Exploration" aiGenerated={aiGen} onEdit={() => toast("Edit section 4")}>
            <div className="space-y-3">
              {[
                {
                  title: "4.1 Employment",
                  content: "Joe is currently seeking employment. Goals include exploring part-time warehouse or retail work in a structured environment. Employment FAE not yet completed. Supported Employment referral initiated.",
                },
                {
                  title: "4.2 Community Life",
                  content: "Joe attends Day Habilitation 4-5 days/week at Carroll Community Services. Participates in community outings monthly. Goal: increase independent community access with natural supports.",
                },
                {
                  title: "4.3 Health & Wellness",
                  content: "Current health status: stable. Ongoing behavioral health monitoring. Medical appointments: quarterly PCP, annual dental. Medications managed with support from mother.",
                },
                {
                  title: "4.4 Housing",
                  content: "Currently lives at home with mother (Linda Brown). Long-term goal: supported independent living. No immediate housing changes planned.",
                },
                {
                  title: "4.5 Relationships",
                  content: "Strong relationship with mother Linda Brown and brother David Brown. Peer relationships through Day Hab program. Goal: expand natural support network.",
                },
                {
                  title: "4.6 Education / Training",
                  content: "Completed vocational training program in 2024. Goal this year: explore on-the-job training through supported employment.",
                },
              ].map((area) => (
                <div key={area.title} className="rounded-lg border border-icm-border p-3">
                  <p className="text-[12.5px] font-semibold text-icm-text mb-1">{area.title}</p>
                  <p className="text-[12px] text-icm-text-dim leading-relaxed">{area.content}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 5: Goals */}
          <SectionCard number={5} title="Goals & Outcomes" aiGenerated={aiGen} onEdit={() => toast("Edit section 5")}>
            <div className="space-y-3">
              {(s.goals || [
                {
                  number: 1,
                  title: "Explore part-time employment opportunities",
                  status: "New",
                  description: "Connect with Supported Employment provider to assess vocational interests, identify community-based work opportunities, and arrange job shadowing within 90 days.",
                  targetDate: "10/31/2026",
                  responsible: "Kathy Adams + SE Provider",
                },
                {
                  number: 2,
                  title: "Maintain community integration through Day Hab and outings",
                  status: "Continued",
                  description: "Continue attending Day Habilitation 4-5 days/week. Participate in at least 2 community outings per month.",
                  targetDate: "08/31/2026",
                  responsible: "Carroll Community Services + Linda Brown",
                },
                {
                  number: 3,
                  title: "Behavioral support coordination",
                  status: "New",
                  description: "Address behavioral escalation patterns flagged in recent monitoring. Coordinate with BSP provider to update strategies.",
                  targetDate: "07/31/2026",
                  responsible: "Kathy Adams + BSP Provider",
                },
              ]).map((g: any, i: number) => (
                <div key={i} className="rounded-lg border border-icm-border bg-icm-bg/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border">
                      G{g.number || i + 1}
                    </span>
                    <span className="text-[14px] font-semibold text-icm-text">{g.title}</span>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      g.status === "New" ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                      : g.status === "Continued" ? "bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20"
                      : "bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20"
                    }`}>
                      {g.status}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-icm-text-dim leading-relaxed mb-2">{g.description}</p>
                  <div className="flex gap-4 text-[11.5px]">
                    <span className="text-icm-text-faint">Target: <strong className="text-icm-text font-mono">{g.targetDate}</strong></span>
                    <span className="text-icm-text-faint">Responsible: <strong className="text-icm-text">{g.responsible}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 6: Health & Safety */}
          <SectionCard number={6} title="Health & Safety / Risk Mitigation" aiGenerated={aiGen} onEdit={() => toast("Edit section 6")}>
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2 text-[12px] text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              HRST Score: 3.2 — Health Care Level 3 · Last assessed: 01/12/2026 · Clinical review required
            </div>
            <div className="space-y-3">
              {[
                { risk: "Behavioral escalation", desc: "Patterns of withdrawal and behavioral escalation reported by caregiver.", mitigation: "BSP updated quarterly, crisis contact protocols in place.", ref: "BSP" },
                { risk: "Medication management", desc: "3 active prescriptions require consistent administration schedule.", mitigation: "Blister pack system, mother manages daily administration, pharmacy review quarterly.", ref: "NCP" },
              ].map((r, i) => (
                <div key={i} className="rounded-lg border border-icm-border p-3 grid grid-cols-3 gap-3 text-[12px]">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-0.5">Risk</p>
                    <p className="text-icm-text font-medium">{r.risk}</p>
                    <p className="text-icm-text-dim mt-0.5">{r.desc}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-0.5">Mitigation</p>
                    <p className="text-icm-text-dim">{r.mitigation}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-0.5">Reference</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-icm-bg border border-icm-border text-[10.5px] font-semibold text-icm-text-dim">{r.ref}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 7: Services */}
          <SectionCard number={7} title="Services & Supports" aiGenerated={aiGen} onEdit={() => toast("Edit section 7")}>
            <div className="overflow-x-auto rounded-lg border border-icm-border mb-3">
              <table className="w-full text-[12px]">
                <thead className="bg-icm-bg/60">
                  <tr>
                    {["Service", "Provider", "Units/Mo", "Start", "End", "Status"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {(s.services || [
                    { name: "Day Habilitation (T2021)", provider: "Carroll Community Services", units: "20 days", start: "08/01/2025", end: "07/31/2026", status: "Active" },
                    { name: "Targeted Case Management", provider: "Carroll County CM", units: "120 units", start: "08/01/2025", end: "07/31/2026", status: "Active" },
                    { name: "Community Habilitation", provider: "Carroll Community Services", units: "60 hrs", start: "08/01/2025", end: "07/31/2026", status: "Active" },
                    { name: "Supported Employment", provider: "TBD", units: "40 hrs", start: "09/01/2026", end: "07/31/2027", status: "Proposed" },
                    { name: "Respite Care", provider: "Linda Brown (Family)", units: "24 hrs", start: "08/01/2025", end: "07/31/2026", status: "Active" },
                    { name: "BSP Services", provider: "Regional Support Team", units: "8 hrs", start: "08/01/2025", end: "07/31/2026", status: "Active" },
                  ]).map((svc: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-icm-text">{svc.name}</td>
                      <td className="px-3 py-2 text-icm-text-dim">{svc.provider}</td>
                      <td className="px-3 py-2 font-mono text-icm-text-dim">{svc.units}</td>
                      <td className="px-3 py-2 font-mono text-icm-text-dim">{svc.start}</td>
                      <td className="px-3 py-2 font-mono text-icm-text-dim">{svc.end}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${svc.status === "Active" ? "bg-icm-green-soft text-icm-green" : "bg-icm-amber-soft text-icm-amber"}`}>
                          {svc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Section 8: Rights */}
          <SectionCard number={8} title="Rights & Responsibilities" onEdit={() => toast("Edit section 8")}>
            <div className="rounded-lg border border-icm-border bg-icm-bg/30 p-4 mb-3">
              <p className="text-[12.5px] text-icm-text leading-relaxed">
                Joe has been informed of his rights and responsibilities as a participant in the
                DDA Medicaid Waiver Program including:
              </p>
              <ul className="mt-2 space-y-1 text-[12px] text-icm-text-dim">
                {[
                  "The right to make informed choices about services and providers",
                  "The right to privacy and confidentiality",
                  "The right to file grievances without retaliation",
                  "The right to receive services in the most integrated community setting",
                  "The right to a person-centered planning process",
                ].map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-icm-text">
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
              Individual informed of rights · In-person discussion · 05/24/2026
            </div>
          </SectionCard>

          {/* Section 9: Team */}
          <SectionCard number={9} title="Team Members & Signatures" aiGenerated={aiGen} onEdit={() => toast("Edit section 9")}>
            <div className="overflow-x-auto rounded-lg border border-icm-border mb-3">
              <table className="w-full text-[12px]">
                <thead className="bg-icm-bg/60">
                  <tr>
                    {["Name", "Role", "Agency", "Present", "Signature"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {(s.team || [
                    { name: "Joseph Brown", role: "Individual", agency: "—", present: true, sig: "Not requested" },
                    { name: "Kathy Adams", role: "CCS", agency: "Carroll County CM", present: true, sig: "Signed" },
                    { name: "Linda Brown", role: "Family Member / Guardian", agency: "—", present: true, sig: "Pending" },
                    { name: "Dr. R. Patel", role: "Provider", agency: "Carroll Health Group", present: false, sig: "Not requested" },
                  ]).map((t: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-icm-text">{t.name}</td>
                      <td className="px-3 py-2 text-icm-text-dim">{t.role}</td>
                      <td className="px-3 py-2 text-icm-text-dim">{t.agency}</td>
                      <td className="px-3 py-2">
                        {t.present ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> : <span className="text-icm-text-faint">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          t.sig === "Signed" ? "bg-icm-green-soft text-icm-green"
                          : t.sig === "Pending" ? "bg-icm-amber-soft text-icm-amber"
                          : "bg-icm-bg border border-icm-border text-icm-text-faint"
                        }`}>{t.sig}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[11.5px] text-icm-text-dim">
              PCP Meeting: <strong className="text-icm-text">05/24/2026</strong> · In-person · Carroll County CM Office
            </div>
          </SectionCard>

          {/* Section 10: BSP & Legal */}
          <SectionCard number={10} title="BSP & Legal References" onEdit={() => toast("Edit section 10")}>
            <div className="space-y-3">
              <div className="rounded-lg border border-icm-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span className="text-[12.5px] font-semibold text-icm-text">Active Behavior Support Plan (BSP)</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <Field label="BSP Provider" value="Regional Support Team" />
                  <Field label="BSP Date" value="01/15/2026" />
                </div>
                <p className="text-[12px] text-icm-text-dim mt-2">
                  BSP addresses behavioral escalation in transition environments. Strategies include scheduled previewing, sensory supports, and visual schedules. Full BSP on file.
                </p>
              </div>

              <div className="rounded-lg border border-icm-border p-3 flex items-center gap-2 text-[12px] text-icm-text-dim">
                <Info className="w-4 h-4 text-icm-text-faint" />
                No active Nursing Care Plan on file at this time.
              </div>

              <div className="rounded-lg border border-icm-border p-3 flex items-center gap-2 text-[12px] text-icm-text-dim">
                <Info className="w-4 h-4 text-icm-text-faint" />
                No active court involvement or legal conditions.
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Right AI panel */}
      <AIPanel aiGenerated={aiGen} />

      {/* Send modal */}
      {sendModalOpen && (
        <PCPSendModal
          pcpId={pcp.id}
          personName={individualName}
          planType={planTypeLabel}
          onClose={() => setSendModalOpen(false)}
        />
      )}
    </div>
  );
}
