/**
 * PersonCarePlanBuilder.tsx
 * Full-page Section-by-Section PCP builder (Step 4A).
 * Route: /people/:id/care-plan/new
 * Three-panel layout: Left sidebar | Main form | Right AI panel
 */
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft, CheckCircle2, Circle, Sparkles, Save, Eye,
  ChevronDown, ChevronRight, Plus, X, Loader2,
  Users, Heart, Briefcase, ListChecks, ShieldCheck, BookOpen,
  Award, FileText, AlertTriangle, Info,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual } from "@/hooks/useIndividuals";
import { addDoc, collection, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionStatus = "not_started" | "in_progress" | "complete";

interface SectionDef {
  key: string;
  number: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionDef[] = [
  { key: "profile",     number: 1,  label: "Individual Profile Summary",   icon: Users      },
  { key: "good_life",   number: 2,  label: "Personally Defined Good Life", icon: Heart      },
  { key: "important",   number: 3,  label: "Important To / Important For", icon: ListChecks },
  { key: "focus_areas", number: 4,  label: "Focus Area Exploration",       icon: Briefcase  },
  { key: "goals",       number: 5,  label: "Goals & Outcomes",             icon: Award      },
  { key: "health",      number: 6,  label: "Health & Safety / Risks",      icon: ShieldCheck},
  { key: "services",    number: 7,  label: "Services & Supports",          icon: Briefcase  },
  { key: "rights",      number: 8,  label: "Rights & Responsibilities",    icon: BookOpen   },
  { key: "team",        number: 9,  label: "Team Members & Signatures",    icon: Users      },
  { key: "bsp",         number: 10, label: "BSP & Legal References",       icon: FileText   },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function BuilderSidebar({
  sections,
  statuses,
  activeKey,
  onSelect,
  onSaveDraft,
  onPreview,
}: {
  sections: SectionDef[];
  statuses: Record<string, SectionStatus>;
  activeKey: string;
  onSelect: (key: string) => void;
  onSaveDraft: () => void;
  onPreview: () => void;
}) {
  const complete = Object.values(statuses).filter((s) => s === "complete").length;
  return (
    <div className="w-64 shrink-0 border-r border-icm-border bg-icm-panel flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-icm-border">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">
          Plan Sections
        </p>
        <div className="w-full h-1.5 bg-icm-border rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${(complete / sections.length) * 100}%` }}
          />
        </div>
        <p className="text-[10.5px] text-icm-text-dim mt-1">
          {complete} of {sections.length} sections complete
        </p>
      </div>

      <div className="flex-1 py-2 overflow-y-auto">
        {sections.map((s) => {
          const Icon = s.icon;
          const status = statuses[s.key] ?? "not_started";
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
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${
                  status === "complete"
                    ? "bg-teal-100 text-teal-600"
                    : status === "in_progress"
                    ? "bg-blue-100 text-blue-600"
                    : isActive
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-icm-bg border border-icm-border text-icm-text-faint"
                }`}
              >
                {status === "complete" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : status === "in_progress" ? (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                ) : (
                  s.number
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[11.5px] leading-snug truncate ${
                    isActive
                      ? "text-indigo-700 font-semibold"
                      : status === "complete"
                      ? "text-teal-700 font-medium"
                      : status === "in_progress"
                      ? "text-blue-700 font-medium"
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

      <div className="p-3 border-t border-icm-border space-y-2">
        <button
          onClick={onSaveDraft}
          className="w-full h-9 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center justify-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" /> Save Draft
        </button>
        <button
          onClick={onPreview}
          className="w-full h-9 rounded-lg border border-icm-accent/20 bg-icm-accent-soft text-[12px] font-medium text-icm-accent hover:bg-icm-accent-soft/70 inline-flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" /> Preview Full Plan
        </button>
      </div>
    </div>
  );
}

// ─── AI Suggestions Panel ─────────────────────────────────────────────────────

function AISuggestionsPanel({
  sectionKey,
  sectionLabel,
  onUse,
}: {
  sectionKey: string;
  sectionLabel: string;
  onUse: (text: string) => void;
}) {
  const suggestions: Record<string, { hint: string; items: string[] }> = {
    profile: {
      hint: "Pre-filled from Joseph Brown's profile and care team records.",
      items: [],
    },
    good_life: {
      hint: "Based on monitoring forms and contact notes, here are themes I heard:",
      items: [
        "Wants to work part-time in a structured environment",
        "Enjoys community events and Day Hab activities",
        "Values time with family, especially mother Linda",
        "Interested in greater independence",
      ],
    },
    important: {
      hint: "Suggested items based on chart data and prior PCP:",
      items: [
        "Seeing friends from Day Hab regularly",
        "Having a say in his daily schedule",
        "Being listened to and respected",
        "Routine and predictability at home",
      ],
    },
    focus_areas: {
      hint: "Key themes from recent sessions and monitoring forms:",
      items: [
        "Employment: warehouse or retail preferred (structured tasks)",
        "Community: YMCA membership expressed as interest",
        "Health: medication schedule adherence needs monitoring",
      ],
    },
    goals: {
      hint: "Based on monitoring forms and contact notes, consider adding:",
      items: [
        "Behavioral support coordination goal (flagged in 2 recent sessions)",
        "Employment exploration goal (mentioned in 5 sessions, not in current plan)",
      ],
    },
    health: {
      hint: "From HRST and monitoring data:",
      items: [
        "HRST Score: 3.2 — Health Care Level 3",
        "Behavioral escalation risk documented",
        "Medication interaction monitoring needed",
      ],
    },
    services: {
      hint: "Services found in prior PCP and authorizations:",
      items: [
        "Day Habilitation (T2021) — Carroll Community Services",
        "Targeted Case Management — Carroll County CM",
        "Community Habilitation — Carroll Community Services",
      ],
    },
    rights: {
      hint: "Standard DDA Rights & Responsibilities statement pre-loaded.",
      items: [],
    },
    team: {
      hint: "Contacts and assigned staff from chart:",
      items: [
        "Kathy Adams — CCS — Carroll County CM",
        "Linda Brown — Guardian / Family Member",
        "Dr. R. Patel — Primary Care Provider",
      ],
    },
    bsp: {
      hint: "From documents and chart:",
      items: [
        "Active BSP on file — Regional Support Team — Updated 01/2026",
        "No active NCP or court involvement found",
      ],
    },
  };

  const sg = suggestions[sectionKey] ?? { hint: "AI reviewing section...", items: [] };

  return (
    <div className="w-72 shrink-0 border-l border-icm-border bg-icm-panel flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-icm-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg ai-gradient flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-icm-text">Case Management AI</p>
            <p className="text-[10.5px] text-icm-text-dim">Active · Assisting with {sectionLabel}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <p className="text-[11.5px] text-icm-text-dim leading-relaxed">{sg.hint}</p>

        {sg.items.map((item, i) => (
          <div key={i} className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3">
            <p className="text-[12px] text-icm-text leading-snug mb-2">{item}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUse(item)}
                className="text-[11px] font-semibold text-icm-accent hover:underline"
              >
                Use this →
              </button>
              <button
                onClick={() => toast("Edit suggestion", { description: "Editing before inserting..." })}
                className="text-[11px] text-icm-text-dim hover:text-icm-text"
              >
                Edit
              </button>
            </div>
          </div>
        ))}

        {sg.items.length === 0 && sectionKey !== "profile" && (
          <div className="text-center py-4">
            <p className="text-[11.5px] text-icm-text-faint">No additional suggestions for this section.</p>
          </div>
        )}

        {sectionKey === "profile" && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-[11.5px] text-teal-700">
            <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-teal-500" />
            All fields pre-filled from Joseph's profile. Review and confirm.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Forms ────────────────────────────────────────────────────────────

function FormField({
  label,
  children,
  aiBadge,
}: {
  label: string;
  children: React.ReactNode;
  aiBadge?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">
          {label}
        </label>
        {aiBadge && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
            <Sparkles className="w-2 h-2" /> AI pre-filled
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  minWords,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  minWords?: number;
}) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
      />
      <p className="text-[10.5px] text-icm-text-faint mt-0.5">
        {wordCount} words
        {minWords && wordCount < minWords && (
          <span className="text-amber-500 ml-1">· {minWords} words recommended</span>
        )}
      </p>
    </div>
  );
}

function EditableChips({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [newItem, setNewItem] = useState("");
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-icm-bg border border-icm-border text-[12px] text-icm-text"
          >
            {item}
            <button onClick={() => remove(i)} className="text-icm-text-faint hover:text-icm-red">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add item..."
          className="flex-1 h-8 px-3 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <button
          onClick={add}
          className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Section 1: Profile ────────────────────────────────────────────────────────

function Section1Profile({ individual }: { individual: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Full Legal Name" aiBadge>
        <TextInput value={`${individual?.first_name ?? "Joseph"} ${individual?.last_name ?? "Brown"}`} onChange={() => {}} />
      </FormField>
      <FormField label="Preferred Name" aiBadge>
        <TextInput value="Joe" onChange={() => {}} />
      </FormField>
      <FormField label="Date of Birth" aiBadge>
        <TextInput value="03/15/1990" onChange={() => {}} />
      </FormField>
      <FormField label="Age" aiBadge>
        <TextInput value="36" onChange={() => {}} />
      </FormField>
      <FormField label="Gender" aiBadge>
        <TextInput value={individual?.gender ?? "Male"} onChange={() => {}} />
      </FormField>
      <FormField label="County" aiBadge>
        <TextInput value={individual?.county ?? "Carroll County"} onChange={() => {}} />
      </FormField>
      <FormField label="Medicaid ID" aiBadge>
        <TextInput value="MA-7842301" onChange={() => {}} />
        <span className="sr-only">MA-7842301</span>
      </FormField>
      <FormField label="Program" aiBadge>
        <TextInput value="Maryland DDA — Community Pathways" onChange={() => {}} />
        <span className="sr-only">Maryland DDA — Community Pathways</span>
      </FormField>
      <FormField label="Waiver Type" aiBadge>
        <TextInput value="DD Waiver" onChange={() => {}} />
      </FormField>
      <FormField label="CCS Name" aiBadge>
        <TextInput value="Kathy Adams" onChange={() => {}} />
        <span className="sr-only">Kathy Adams</span>
      </FormField>
      <FormField label="CCS Agency" aiBadge>
        <TextInput value="Carroll County Case Management" onChange={() => {}} />
      </FormField>
      <FormField label="CCS Phone/Email" aiBadge>
        <TextInput value="(410) 555-0102 · kadams@ccm.md.gov" onChange={() => {}} />
      </FormField>
    </div>
  );
}

// ─── Section 2: Good Life ─────────────────────────────────────────────────────

function Section2GoodLife({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-700">
        <strong>Important:</strong> This section must be written in Joe's own words. Use the AI themes in the right panel as conversation starters, then write Joe's vision in his voice.
      </div>
      <FormField label="Joe's vision for his Good Life">
        <TextArea
          value={value}
          onChange={onChange}
          rows={8}
          minWords={50}
          placeholder="Write in Joe's own words what he wants for his life — his hopes, dreams, and vision for the future.
Example: 'Joe wants to get a part-time job and spend more time in his community...'"
        />
      </FormField>
      {value.trim().split(/\s+/).length < 50 && (
        <p className="text-[11.5px] text-icm-text-dim">
          Not sure what to write?{" "}
          <button className="text-icm-accent hover:underline" onClick={() => {}}>
            Start from AI themes above ↗
          </button>
        </p>
      )}
    </div>
  );
}

// ─── Section 3: Important To / For ────────────────────────────────────────────

function Section3Important({
  importantTo,
  importantFor,
  onToChange,
  onForChange,
}: {
  importantTo: string[];
  importantFor: string[];
  onToChange: (v: string[]) => void;
  onForChange: (v: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <FormField label="Important TO Joe">
          <p className="text-[11.5px] text-icm-text-dim mb-2">
            What matters to Joe (preferences, relationships, joy)
          </p>
          <EditableChips items={importantTo} onChange={onToChange} />
        </FormField>
      </div>
      <div>
        <FormField label="Important FOR Joe">
          <p className="text-[11.5px] text-icm-text-dim mb-2">
            What Joe needs to stay healthy and safe
          </p>
          <EditableChips items={importantFor} onChange={onForChange} />
        </FormField>
      </div>
    </div>
  );
}

// ─── Section 4: Focus Areas ────────────────────────────────────────────────────

const FOCUS_AREAS = [
  { key: "employment",   label: "4.1 Employment",        required: true },
  { key: "community",    label: "4.2 Community Life",     required: false },
  { key: "health",       label: "4.3 Health & Wellness",  required: false },
  { key: "housing",      label: "4.4 Housing",            required: false },
  { key: "relationships",label: "4.5 Relationships",      required: false },
  { key: "education",    label: "4.6 Education / Training", required: false },
];

function Section4FocusAreas({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const [openArea, setOpenArea] = useState<string>("employment");
  return (
    <div className="space-y-2">
      {FOCUS_AREAS.map((area) => (
        <div key={area.key} className="rounded-xl border border-icm-border overflow-hidden">
          <button
            onClick={() => setOpenArea(openArea === area.key ? "" : area.key)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-icm-bg/60 transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${
                openArea === area.key ? "" : "-rotate-90"
              }`}
            />
            <span className="text-[13px] font-semibold text-icm-text">{area.label}</span>
            {area.required && (
              <span className="text-[10px] text-icm-text-faint ml-1">(Required annually)</span>
            )}
            {values[area.key] && (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 ml-auto" />
            )}
          </button>
          {openArea === area.key && (
            <div className="border-t border-icm-border px-4 py-4 space-y-3">
              {area.key === "employment" && (
                <>
                  <FormField label="Current employment status">
                    <select className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text focus:outline-none">
                      <option>Not currently seeking</option>
                      <option>Seeking employment</option>
                      <option>Employed</option>
                      <option>In training</option>
                      <option>Supported employment</option>
                      <option>Volunteer</option>
                    </select>
                  </FormField>
                  <FormField label="Employment goals">
                    <TextArea
                      value={values[`${area.key}_goals`] ?? ""}
                      onChange={(v) => onChange(`${area.key}_goals`, v)}
                      rows={3}
                      placeholder="Describe employment goals for this plan year..."
                    />
                  </FormField>
                  <FormField label="Barriers to employment">
                    <TextArea
                      value={values[`${area.key}_barriers`] ?? ""}
                      onChange={(v) => onChange(`${area.key}_barriers`, v)}
                      rows={2}
                      placeholder="Identified barriers..."
                    />
                  </FormField>
                </>
              )}
              <FormField label={`Goals for ${area.label.split(" ").slice(1).join(" ").toLowerCase()} this plan year`}>
                <TextArea
                  value={values[area.key] ?? ""}
                  onChange={(v) => onChange(area.key, v)}
                  rows={3}
                  placeholder={`Describe ${area.label.split(" ").slice(1).join(" ").toLowerCase()} goals and plans...`}
                />
              </FormField>
              <FormField label="Supports needed">
                <TextArea
                  value={values[`${area.key}_supports`] ?? ""}
                  onChange={(v) => onChange(`${area.key}_supports`, v)}
                  rows={2}
                  placeholder="What supports will help achieve these goals?"
                />
              </FormField>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section 5: Goals ─────────────────────────────────────────────────────────

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
  targetDate: string;
  responsible: string;
}

function Section5Goals({ goals, onChange }: { goals: Goal[]; onChange: (g: Goal[]) => void }) {
  const updateGoal = (id: string, field: keyof Goal, val: string) =>
    onChange(goals.map((g) => (g.id === id ? { ...g, [field]: val } : g)));

  const addGoal = () =>
    onChange([
      ...goals,
      {
        id: `g-${Date.now()}`,
        title: "",
        description: "",
        status: "New goal",
        targetDate: "",
        responsible: "",
      },
    ]);

  const removeGoal = (id: string) => onChange(goals.filter((g) => g.id !== id));

  return (
    <div className="space-y-3">
      {goals.map((goal, i) => (
        <div key={goal.id} className="rounded-xl border border-icm-border p-4 space-y-3 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border">
              G{i + 1}
            </span>
            <input
              value={goal.title}
              onChange={(e) => updateGoal(goal.id, "title", e.target.value)}
              placeholder="Goal title..."
              className="flex-1 text-[13.5px] font-semibold text-icm-text bg-transparent border-0 outline-none focus:bg-icm-bg/40 rounded px-1"
            />
            <select
              value={goal.status}
              onChange={(e) => updateGoal(goal.id, "status", e.target.value)}
              className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text"
            >
              {["New goal", "Continued", "Modified", "Completed — not renewing"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <button onClick={() => removeGoal(goal.id)} className="text-icm-text-faint hover:text-icm-red p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <TextArea
            value={goal.description}
            onChange={(v) => updateGoal(goal.id, "description", v)}
            rows={3}
            placeholder="Describe the goal narrative, activities, and expected outcomes..."
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Target date">
              <input
                type="date"
                value={goal.targetDate}
                onChange={(e) => updateGoal(goal.id, "targetDate", e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text focus:outline-none"
              />
            </FormField>
            <FormField label="Responsible parties">
              <TextInput
                value={goal.responsible}
                onChange={(v) => updateGoal(goal.id, "responsible", v)}
                placeholder="Case manager, provider..."
              />
            </FormField>
          </div>
        </div>
      ))}
      <button
        onClick={addGoal}
        className="w-full h-10 rounded-xl border-2 border-dashed border-icm-border text-[12.5px] font-medium text-icm-text-dim hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors inline-flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Add new goal +
      </button>
    </div>
  );
}

// ─── Section 6: Health & Safety ───────────────────────────────────────────────

function Section6Health({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
        <AlertTriangle className="w-4 h-4 inline mr-1.5" />
        HRST Score: 3.2 — Health Care Level 3 · Last assessed: 01/12/2026 · Clinical review required for HRST ≥ 3
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-icm-border p-4 space-y-3 bg-white">
          <p className="text-[12.5px] font-semibold text-icm-text">Risk 1 — Behavioral escalation</p>
          <FormField label="Risk description">
            <TextArea
              value=""
              onChange={() => {}}
              rows={2}
              placeholder="Describe the risk..."
            />
          </FormField>
          <FormField label="Mitigation strategy">
            <TextArea
              value=""
              onChange={() => {}}
              rows={2}
              placeholder="Describe mitigation strategies..."
            />
          </FormField>
          <FormField label="Supporting document reference">
            <select className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text">
              <option>BSP</option>
              <option>NCP</option>
              <option>Court Order</option>
              <option>Other</option>
            </select>
          </FormField>
        </div>
      </div>
      <FormField label="Emergency / backup plan">
        <TextArea
          value={value}
          onChange={onChange}
          rows={3}
          placeholder="Describe the backup plan for emergencies..."
        />
      </FormField>
    </div>
  );
}

// ─── Simpler sections (7-10 use TextArea for brevity) ─────────────────────────

function SimpleSection({
  label,
  value,
  onChange,
  rows = 5,
  placeholder,
  preContent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  preContent?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {preContent}
      <FormField label={label}>
        <TextArea value={value} onChange={onChange} rows={rows} placeholder={placeholder} />
      </FormField>
    </div>
  );
}

// ─── Section Footer ───────────────────────────────────────────────────────────

function SectionFooter({
  sectionNumber,
  totalSections,
  onMarkComplete,
  onNext,
}: {
  sectionNumber: number;
  totalSections: number;
  onMarkComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-icm-border">
      <span className="text-[11.5px] text-icm-text-faint">
        Section {sectionNumber} of {totalSections}
      </span>
      <div className="flex gap-2">
        {sectionNumber < totalSections && (
          <button
            onClick={onNext}
            className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5"
          >
            Skip for now <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onMarkComplete}
          className="h-9 px-5 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 inline-flex items-center gap-1.5 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark section complete →
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

const PersonCarePlanBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { individual } = useIndividual(id);

  const pcpId = searchParams.get("pcpId");
  const planType = searchParams.get("planType") ?? "Annual Plan";
  const effectiveDate = searchParams.get("effectiveDate") ?? "";
  const annualDate = searchParams.get("annualDate") ?? "2026-08-31";

  const [activeSection, setActiveSection] = useState("profile");
  const [sectionStatuses, setSectionStatuses] = useState<Record<string, SectionStatus>>(
    Object.fromEntries(SECTIONS.map((s) => [s.key, "not_started"]))
  );
  const [saving, setSaving] = useState(false);

  // Section data state
  const [goodLife, setGoodLife] = useState("");
  const [importantTo, setImportantTo] = useState<string[]>([]);
  const [importantFor, setImportantFor] = useState<string[]>([]);
  const [focusValues, setFocusValues] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [emergencyPlan, setEmergencyPlan] = useState("");
  const [servicesNotes, setServicesNotes] = useState("");
  const [rightsNotes, setRightsNotes] = useState("");
  const [teamNotes, setTeamNotes] = useState("");
  const [bspNotes, setBspNotes] = useState("");

  // Load PCP data from Firestore if pcpId is present
  useEffect(() => {
    if (!pcpId) return;
    const fetchPcp = async () => {
      try {
        const pcpRef = doc(db, "pcps", pcpId);
        const snap = await getDoc(pcpRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.sections) {
            if (data.sections.good_life) setGoodLife(data.sections.good_life);
            if (data.sections.important_to?.length) setImportantTo(data.sections.important_to);
            if (data.sections.important_for?.length) setImportantFor(data.sections.important_for);
            if (data.sections.goals?.length) setGoals(data.sections.goals);
            if (data.sections.focus_areas) setFocusValues(data.sections.focus_areas);
            if (data.sections.emergency_plan) setEmergencyPlan(data.sections.emergency_plan);
            if (data.sections.services_notes) setServicesNotes(data.sections.services_notes);
            if (data.sections.rights_notes) setRightsNotes(data.sections.rights_notes);
            if (data.sections.team_notes) setTeamNotes(data.sections.team_notes);
            if (data.sections.bsp_notes) setBspNotes(data.sections.bsp_notes);
          }
        }
      } catch (err) {
        console.error("Failed to fetch PCP data:", err);
      }
    };
    fetchPcp();
  }, [pcpId]);

  const activeSectionDef = SECTIONS.find((s) => s.key === activeSection) ?? SECTIONS[0];
  const activeSectionIdx = SECTIONS.findIndex((s) => s.key === activeSection);

  const markComplete = useCallback(() => {
    setSectionStatuses((prev) => ({ ...prev, [activeSection]: "complete" }));
    toast.success(`Section ${activeSectionDef.number} marked complete`, {
      description: activeSectionDef.label,
    });
    // Advance to next
    const nextIdx = activeSectionIdx + 1;
    if (nextIdx < SECTIONS.length) {
      const nextSection = SECTIONS[nextIdx];
      setActiveSection(nextSection.key);
      setSectionStatuses((prev) => ({ ...prev, [nextSection.key]: "in_progress" }));
    }
  }, [activeSection, activeSectionDef, activeSectionIdx]);

  const skipToNext = useCallback(() => {
    const nextIdx = activeSectionIdx + 1;
    if (nextIdx < SECTIONS.length) {
      setActiveSection(SECTIONS[nextIdx].key);
    }
  }, [activeSectionIdx]);

  const handleSelectSection = (key: string) => {
    setActiveSection(key);
    setSectionStatuses((prev) => ({
      ...prev,
      [key]: prev[key] === "not_started" ? "in_progress" : prev[key],
    }));
  };

  const handleSaveDraft = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload = {
        individual_id: id,
        personId: id,
        organizationId: individual?.organizationId ?? null,
        plan_type: planType.toLowerCase().replace(" plan", ""),
        plan_format: "pcp_v2",
        effective_date: effectiveDate,
        annual_plan_date: annualDate,
        status: "draft",
        ai_generated: false,
        isCompleted: false,
        sections: {
          good_life: goodLife,
          important_to: importantTo,
          important_for: importantFor,
          goals,
          focus_areas: focusValues,
          emergency_plan: emergencyPlan,
          services_notes: servicesNotes,
          rights_notes: rightsNotes,
          team_notes: teamNotes,
          bsp_notes: bspNotes,
        },
        updated_at: serverTimestamp(),
      };

      if (pcpId) {
        await updateDoc(doc(db, "care_plans", pcpId), payload);
      } else {
        await addDoc(collection(db, "care_plans"), {
          ...payload,
          created_at: serverTimestamp(),
        });
      }
      toast.success("Draft saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save draft — check connection.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (pcpId) {
      navigate(`/people/${id}/care-plan/${pcpId}`);
    } else {
      toast("Preview unavailable", { description: "Save draft first to preview." });
    }
  };

  const complete = Object.values(sectionStatuses).filter((s) => s === "complete").length;
  const allComplete = complete === SECTIONS.length;

  const handleFinish = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload = {
        individual_id: id,
        personId: id,
        organizationId: individual?.organizationId ?? null,
        plan_type: planType.toLowerCase().replace(" plan", ""),
        plan_format: "pcp_v2",
        status: "In Progress",
        ai_generated: false,
        isCompleted: false,
        effective_date: effectiveDate,
        annual_plan_date: annualDate,
        internalDueDate: annualDate || null,
        goals: goals ?? [],
        services: [],
        team: [],
        history: [{ date: new Date().toLocaleDateString(), user: "Case Manager", action: "Plan created via section builder" }],
        supportNeeds: {
          workingWell: { value: "" },
          notWorking: { value: "" },
          preferences: { value: "" },
          healthSafety: { value: "" },
        },
        sections: {
          good_life: goodLife,
          important_to: importantTo,
          important_for: importantFor,
          goals,
          focus_areas: focusValues,
          emergency_plan: emergencyPlan,
          services_notes: servicesNotes,
          rights_notes: rightsNotes,
          team_notes: teamNotes,
          bsp_notes: bspNotes,
        },
        updated_at: serverTimestamp(),
      };

      let savedId: string;
      if (pcpId) {
        await updateDoc(doc(db, "care_plans", pcpId), payload);
        savedId = pcpId;
      } else {
        const docRef = await addDoc(collection(db, "care_plans"), {
          ...payload,
          created_at: serverTimestamp(),
        });
        savedId = docRef.id;
      }

      toast.success("PCP saved successfully!", { description: "Navigating to plan viewer…" });
      navigate(`/people/${id}/care-plan/${savedId}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save — check Firestore connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ICMShell title="PCP Builder" showAIPanel={false}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => navigate(`/people/${id}/care-plan`)}
          className="inline-flex items-center gap-1 text-[11.5px] text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Care Plan Board
        </button>
        <div className="h-4 w-px bg-icm-border" />
        <span className="text-[13px] font-semibold text-icm-text">
          {individual ? `${individual.last_name}, ${individual.first_name}` : "Loading…"}
        </span>
        <span className="text-icm-text-faint">·</span>
        <span className="text-[12.5px] text-icm-text-dim">{planType}</span>
        <div className="ml-auto flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin text-icm-text-dim" />}
          {allComplete && (
            <button
              onClick={handleFinish}
              className="h-9 px-5 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Finish & Save Plan →
            </button>
          )}
        </div>
      </div>

      {/* 3-panel layout */}
      <div
        className="flex rounded-xl border border-icm-border overflow-hidden bg-white"
        style={{ minHeight: "calc(100vh - 160px)" }}
      >
        {/* Left: Section navigator */}
        <BuilderSidebar
          sections={SECTIONS}
          statuses={sectionStatuses}
          activeKey={activeSection}
          onSelect={handleSelectSection}
          onSaveDraft={handleSaveDraft}
          onPreview={handlePreview}
        />

        {/* Center: Section form */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-5">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-icm-text-dim">
              §{activeSectionDef.number}
            </span>
            <h2 className="font-manrope font-extrabold text-[18px] text-icm-text">
              {activeSectionDef.label}
            </h2>
            {sectionStatuses[activeSection] === "complete" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[10.5px] font-semibold ring-1 ring-teal-200">
                <CheckCircle2 className="w-3 h-3" /> Complete
              </span>
            )}
          </div>

          {/* Section content */}
          {activeSection === "profile"     && <Section1Profile individual={individual} />}
          {activeSection === "good_life"   && <Section2GoodLife value={goodLife} onChange={setGoodLife} />}
          {activeSection === "important"   && (
            <Section3Important
              importantTo={importantTo}
              importantFor={importantFor}
              onToChange={setImportantTo}
              onForChange={setImportantFor}
            />
          )}
          {activeSection === "focus_areas" && (
            <Section4FocusAreas
              values={focusValues}
              onChange={(k, v) => setFocusValues((prev) => ({ ...prev, [k]: v }))}
            />
          )}
          {activeSection === "goals"       && <Section5Goals goals={goals} onChange={setGoals} />}
          {activeSection === "health"      && <Section6Health value={emergencyPlan} onChange={setEmergencyPlan} />}
          {activeSection === "services"    && (
            <SimpleSection
              label="Natural / Community Supports"
              value={servicesNotes}
              onChange={setServicesNotes}
              rows={4}
              placeholder="Describe natural and community supports (family, friends, community resources)..."
              preContent={
                <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 flex items-start justify-between gap-3">
                  <p className="text-[12px] text-icm-text">
                    <Sparkles className="w-3.5 h-3.5 text-icm-accent inline mr-1" />
                    I found services in your prior PCP and authorizations. Want me to import them?
                  </p>
                  <button onClick={() => toast.success("Services imported from prior PCP")} className="text-[11.5px] font-semibold text-icm-accent hover:underline shrink-0">
                    Import services →
                  </button>
                </div>
              }
            />
          )}
          {activeSection === "rights"      && (
            <div className="space-y-4">
              <div className="rounded-lg border border-icm-border bg-icm-bg/30 p-4">
                <p className="text-[12.5px] text-icm-text font-semibold mb-2">Standard DDA Rights & Responsibilities</p>
                <p className="text-[12px] text-icm-text-dim leading-relaxed">
                  Joe has been informed of his rights and responsibilities as a participant in the DDA Medicaid Waiver Program including: the right to make informed choices about services and providers, the right to privacy and confidentiality, the right to file grievances, the right to receive services in the most integrated community setting, and the right to a person-centered planning process.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date informed">
                  <input type="date" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px]" defaultValue={new Date().toISOString().split("T")[0]} />
                </FormField>
                <FormField label="Method">
                  <select className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px]">
                    <option>In-person discussion</option>
                    <option>Virtual meeting</option>
                    <option>Written materials provided</option>
                    <option>Guardian/Rep informed</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Notes (optional)">
                <TextArea value={rightsNotes} onChange={setRightsNotes} rows={3} placeholder="Any notes about the rights discussion..." />
              </FormField>
            </div>
          )}
          {activeSection === "team"        && (
            <SimpleSection
              label="Meeting notes (optional)"
              value={teamNotes}
              onChange={setTeamNotes}
              rows={4}
              placeholder="Notes from the PCP planning meeting..."
              preContent={
                <div className="rounded-xl border border-icm-border overflow-hidden mb-2">
                  <table className="w-full text-[12px]">
                    <thead className="bg-icm-bg/60">
                      <tr>
                        {["Name", "Role", "Present", "Signature Status"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-icm-border">
                      {[
                        { name: "Joseph Brown", role: "Individual", present: true, sig: "Not requested" },
                        { name: "Kathy Adams", role: "CCS", present: true, sig: "Signed" },
                        { name: "Linda Brown", role: "Guardian", present: true, sig: "Pending" },
                        { name: "Dr. R. Patel", role: "Provider", present: false, sig: "Not requested" },
                      ].map((t, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-icm-text">{t.name}</td>
                          <td className="px-3 py-2 text-icm-text-dim">{t.role}</td>
                          <td className="px-3 py-2">{t.present ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> : <Circle className="w-3.5 h-3.5 text-icm-text-faint" />}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${t.sig === "Signed" ? "bg-icm-green-soft text-icm-green" : t.sig === "Pending" ? "bg-icm-amber-soft text-icm-amber" : "bg-icm-bg border border-icm-border text-icm-text-faint"}`}>{t.sig}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          )}
          {activeSection === "bsp"         && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-indigo-600" />
                  <span className="text-[13px] font-medium text-icm-text">Individual has an active BSP</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="BSP Provider">
                  <TextInput value="Regional Support Team" onChange={() => {}} />
                </FormField>
                <FormField label="BSP Date">
                  <input type="date" defaultValue="2026-01-15" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px]" />
                </FormField>
              </div>
              <FormField label="BSP Summary">
                <TextArea value={bspNotes} onChange={setBspNotes} rows={3} placeholder="Brief summary of BSP strategies and focus areas..." />
              </FormField>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-indigo-600" />
                  <span className="text-[13px] font-medium text-icm-text">Individual has an active Nursing Care Plan</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-indigo-600" />
                  <span className="text-[13px] font-medium text-icm-text">Individual has active court involvement or conditions</span>
                </label>
              </div>
            </div>
          )}

          {/* Section footer */}
          <SectionFooter
            sectionNumber={activeSectionDef.number}
            totalSections={SECTIONS.length}
            onMarkComplete={markComplete}
            onNext={skipToNext}
          />
        </div>

        {/* Right: AI suggestions */}
        <AISuggestionsPanel
          sectionKey={activeSection}
          sectionLabel={activeSectionDef.label}
          onUse={(text) => {
            if (activeSection === "good_life") setGoodLife((prev) => prev ? `${prev} ${text}` : text);
            toast.success("Suggestion added");
          }}
        />
      </div>
    </ICMShell>
  );
};

export default PersonCarePlanBuilder;
