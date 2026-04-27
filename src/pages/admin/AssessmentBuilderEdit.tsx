import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { useRole } from "@/contexts/RoleContext";
import {
  AssessmentSection,
  AssessmentTemplate,
  Question,
  QuestionType,
  getTemplate,
  templates,
} from "@/data/assessments";
import {
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  Type,
  AlignLeft,
  Hash,
  CheckSquare,
  ListChecks,
  Sliders,
  Star,
  Calculator,
  HandHeart,
  Calendar as CalendarIcon,
  CalendarRange,
  Table as TableIcon,
  Repeat,
  Heading2,
  Info,
  Minus,
  FileUp,
  Signature,
  PencilLine,
  Settings,
  Eye,
  Save,
  Send,
} from "lucide-react";

interface Group {
  group: string;
  items: { type: QuestionType; label: string; icon: any; desc: string }[];
}

const LIBRARY: Group[] = [
  {
    group: "Text Input",
    items: [
      { type: "short_text", label: "Short Text", icon: Type, desc: "Single line input" },
      { type: "long_text", label: "Long Text / Narrative", icon: AlignLeft, desc: "Multi-line textarea" },
      { type: "number", label: "Number", icon: Hash, desc: "Numeric input with min/max" },
    ],
  },
  {
    group: "Choice",
    items: [
      { type: "yes_no", label: "Yes / No", icon: CheckSquare, desc: "Two-option radio" },
      { type: "yes_no_na", label: "Yes / No / N/A", icon: CheckSquare, desc: "Three-option radio" },
      { type: "single_select", label: "Single Select (Dropdown)", icon: ListChecks, desc: "One answer from list" },
      { type: "single_radio", label: "Single Select (Radio)", icon: ListChecks, desc: "Short option lists" },
      { type: "multi_select", label: "Multi Select", icon: ListChecks, desc: "Multiple answers allowed" },
    ],
  },
  {
    group: "Scale & Scoring",
    items: [
      { type: "likert", label: "Likert Scale", icon: Sliders, desc: "1-5 or 1-7 scale" },
      { type: "rating", label: "Rating Scale", icon: Star, desc: "Numeric 1-10" },
      { type: "scored_choice", label: "Scored Choice", icon: Calculator, desc: "Each option has a score" },
      { type: "independence_level", label: "Independence Level", icon: HandHeart, desc: "8-level ADL/IADL scale" },
    ],
  },
  {
    group: "Date & Time",
    items: [
      { type: "date", label: "Date", icon: CalendarIcon, desc: "Date picker" },
      { type: "date_range", label: "Date Range", icon: CalendarRange, desc: "Start + end date" },
    ],
  },
  {
    group: "Structured",
    items: [
      { type: "table", label: "Table / Grid", icon: TableIcon, desc: "Rows and columns" },
      { type: "repeating_group", label: "Repeating Group", icon: Repeat, desc: "Add multiple instances" },
    ],
  },
  {
    group: "Display",
    items: [
      { type: "section_header", label: "Section Header", icon: Heading2, desc: "Bold heading" },
      { type: "instructions", label: "Instructions", icon: Info, desc: "Read-only guidance" },
      { type: "divider", label: "Divider", icon: Minus, desc: "Visual separator" },
    ],
  },
  {
    group: "File & Signature",
    items: [
      { type: "file_upload", label: "File Upload", icon: FileUp, desc: "Single or multiple files" },
      { type: "esignature", label: "e-Signature", icon: Signature, desc: "Capture signature" },
      { type: "date_initials", label: "Date + Initials", icon: PencilLine, desc: "Lightweight sign-off" },
    ],
  },
];

const defaultLabel: Record<QuestionType, string> = {
  short_text: "New short text question",
  long_text: "New long text question",
  number: "New number question",
  yes_no: "New yes/no question",
  yes_no_na: "New yes/no/N/A question",
  single_select: "New single select",
  single_radio: "New single select (radio)",
  multi_select: "New multi select",
  likert: "New Likert scale question",
  rating: "New rating question",
  scored_choice: "New scored choice question",
  independence_level: "New independence level question",
  date: "New date question",
  date_range: "New date range question",
  table: "New table",
  repeating_group: "New repeating group",
  section_header: "Section header",
  instructions: "Instructions text",
  divider: "Divider",
  file_upload: "Upload file",
  esignature: "Signature",
  date_initials: "Date + initials",
};

let _idSeed = Date.now();
const newId = (prefix: string) => `${prefix}-${++_idSeed}`;

function emptyTemplate(): AssessmentTemplate {
  return {
    id: newId("tpl"),
    name: "Untitled Template",
    type: "Custom",
    description: "",
    version: "v1.0",
    status: "draft",
    updatedAt: new Date().toLocaleDateString("en-US"),
    scoringEnabled: true,
    estimatedMinutes: 20,
    frequency: "One-time",
    signatureRequirements: {
      caseManager: true,
      individual: false,
      guardian: false,
      supervisor: false,
    },
    loc: { low: 25, moderate: 50, high: 75 },
    sections: [
      { id: newId("s"), name: "Section 1", questions: [] },
    ],
  };
}

function makeQuestion(type: QuestionType): Question {
  const base: Question = { id: newId("q"), type, label: defaultLabel[type] };
  switch (type) {
    case "single_select":
    case "single_radio":
    case "multi_select":
      return { ...base, options: [{ label: "Option 1" }, { label: "Option 2" }] };
    case "scored_choice":
      return {
        ...base,
        showScore: true,
        useForLOC: false,
        options: [
          { label: "Option 1", score: 0 },
          { label: "Option 2", score: 1 },
          { label: "Option 3", score: 2 },
        ],
      };
    case "likert":
      return { ...base, likertPoints: 5, likertLabels: ["Never", "Rarely", "Sometimes", "Often", "Always"] };
    case "rating":
      return { ...base, min: 1, max: 10 };
    case "number":
      return { ...base, unit: "" };
    case "instructions":
      return { ...base, body: "Add guidance text here." };
    default:
      return base;
  }
}

export default function AssessmentBuilderEdit() {
  const { isAdmin } = useRole();
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const initial = useMemo<AssessmentTemplate>(() => {
    if (templateId && templateId !== "new") {
      const t = getTemplate(templateId);
      if (t) {
        // Deep-clone to avoid mutating the shared mock.
        return JSON.parse(JSON.stringify(t)) as AssessmentTemplate;
      }
    }
    return emptyTemplate();
  }, [templateId]);

  const [tpl, setTpl] = useState<AssessmentTemplate>(initial);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    initial.sections[0]?.id ?? null,
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);

  if (!isAdmin) return <AdminOnly />;

  function updateSection(id: string, fn: (s: AssessmentSection) => AssessmentSection) {
    setTpl((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? fn(s) : s)),
    }));
  }
  function addSection() {
    const s: AssessmentSection = {
      id: newId("s"),
      name: `Section ${tpl.sections.length + 1}`,
      questions: [],
    };
    setTpl((prev) => ({ ...prev, sections: [...prev.sections, s] }));
    setActiveSectionId(s.id);
  }
  function removeSection(id: string) {
    setTpl((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== id) }));
  }
  function addQuestion(sectionId: string, type: QuestionType) {
    updateSection(sectionId, (s) => ({ ...s, questions: [...s.questions, makeQuestion(type)] }));
  }
  function updateQuestion(sectionId: string, qid: string, patch: Partial<Question>) {
    updateSection(sectionId, (s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    }));
  }
  function removeQuestion(sectionId: string, qid: string) {
    updateSection(sectionId, (s) => ({ ...s, questions: s.questions.filter((q) => q.id !== qid) }));
  }
  function publish() {
    if (tpl.sections.length === 0 || tpl.sections.every((s) => s.questions.length === 0)) {
      alert("Add at least one section with at least one question before publishing.");
      return;
    }
    setTpl((prev) => ({ ...prev, status: "published" }));
    // Persist into the in-memory list so runtime can pick it up.
    const idx = templates.findIndex((t) => t.id === tpl.id);
    if (idx >= 0) templates[idx] = { ...tpl, status: "published" };
    else templates.push({ ...tpl, status: "published" });
    alert("Template published. Case managers can now use it.");
  }

  return (
    <div className="flex h-screen w-full bg-icm-bg font-geist text-icm-text">
      {/* Question library */}
      <aside className="w-[300px] shrink-0 border-r border-icm-border bg-icm-panel overflow-y-auto p-4">
        <button
          onClick={() => navigate("/admin/assessment-builder")}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Templates
        </button>
        <h2 className="font-manrope font-bold text-[14px] text-icm-text">Question Types</h2>
        <p className="text-[11.5px] text-icm-text-dim mt-0.5 mb-3">
          Click into the active section
        </p>

        <div className="space-y-4">
          {LIBRARY.map((g) => (
            <div key={g.group}>
              <p className="text-[10px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint mb-1.5">
                {g.group}
              </p>
              <div className="space-y-1">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.type}
                      disabled={!activeSectionId}
                      onClick={() => activeSectionId && addQuestion(activeSectionId, it.type)}
                      className="w-full text-left rounded-lg border border-icm-border bg-icm-bg hover:border-icm-accent hover:bg-icm-accent-soft p-2 flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Icon className="w-3.5 h-3.5 text-icm-text-dim" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-geist font-medium text-icm-text leading-tight">
                          {it.label}
                        </p>
                        <p className="text-[10.5px] text-icm-text-faint leading-tight truncate">
                          {it.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-icm-bg/95 backdrop-blur-sm border-b border-icm-border px-6 py-3 flex items-center gap-3">
          <input
            value={tpl.name}
            onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
            className="font-manrope font-extrabold text-[20px] text-icm-text bg-transparent focus:outline-none flex-1 min-w-0"
          />
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 bg-icm-amber-soft text-icm-amber ring-icm-amber/20 uppercase">
            {tpl.status}
          </span>
          <span className="text-[10px] font-mono text-icm-text-faint">{tpl.version}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="h-9 w-9 rounded-xl border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save draft
          </button>
          <button
            onClick={publish}
            className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90"
          >
            <Send className="w-3.5 h-3.5" /> Publish template
          </button>
        </div>

        <div className="max-w-[900px] mx-auto p-6 space-y-4">
          {tpl.sections.map((section, idx) => {
            const isActive = section.id === activeSectionId;
            const isCollapsed = collapsed[section.id];
            return (
              <div
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={`rounded-xl border bg-icm-panel transition-all ${isActive ? "border-icm-accent shadow-elevated" : "border-icm-border"}`}
              >
                <div className="flex items-center gap-2 p-3 border-b border-icm-border">
                  <GripVertical className="w-4 h-4 text-icm-text-faint" />
                  <span className="w-6 h-6 rounded-full bg-icm-accent text-icm-panel text-[11px] font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <input
                    value={section.name}
                    onChange={(e) =>
                      updateSection(section.id, (s) => ({ ...s, name: e.target.value }))
                    }
                    className="font-manrope font-bold text-[14px] text-icm-text bg-transparent focus:outline-none flex-1 min-w-0"
                  />
                  <span className="text-[11px] font-mono text-icm-text-faint">
                    {section.questions.length} q
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }));
                    }}
                    className="text-[11px] text-icm-text-dim hover:text-icm-text px-2"
                  >
                    {isCollapsed ? "Expand" : "Collapse"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSection(section.id);
                    }}
                    className="w-7 h-7 rounded-lg text-icm-text-faint hover:text-icm-red hover:bg-icm-red-soft flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {section.questions.length === 0 && (
                      <div
                        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isActive ? "border-icm-accent bg-icm-accent-soft" : "border-icm-border"}`}
                      >
                        <p className="text-[12px] font-geist text-icm-text-dim">
                          {isActive
                            ? "Click a question type from the library to add it here."
                            : "Click this section to make it active, then add questions."}
                        </p>
                      </div>
                    )}
                    {section.questions.map((q, qIdx) => (
                      <QuestionEditor
                        key={q.id}
                        question={q}
                        index={qIdx + 1}
                        onChange={(patch) => updateQuestion(section.id, q.id, patch)}
                        onDelete={() => removeQuestion(section.id, q.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addSection}
            className="w-full h-11 rounded-xl border border-dashed border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:border-icm-border-strong hover:text-icm-text flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add section
          </button>
        </div>
      </main>

      {showSettings && (
        <SettingsPanel tpl={tpl} setTpl={setTpl} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  onChange,
  onDelete,
}: {
  question: Question;
  index: number;
  onChange: (patch: Partial<Question>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg p-3">
      <div className="flex items-center gap-2 mb-2">
        <GripVertical className="w-3.5 h-3.5 text-icm-text-faint" />
        <span className="text-[10px] font-mono font-bold text-icm-text-faint">Q{index}</span>
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 uppercase">
          {question.type.replace(/_/g, " ")}
        </span>
        <input
          value={question.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-[13px] font-geist font-semibold text-icm-text focus:outline-none"
        />
        <label className="flex items-center gap-1 text-[10px] text-icm-text-dim">
          <input
            type="checkbox"
            checked={!!question.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="accent-icm-accent"
          />
          Required
        </label>
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded text-icm-text-faint hover:text-icm-red hover:bg-icm-red-soft flex items-center justify-center"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <QuestionConfig question={question} onChange={onChange} />
    </div>
  );
}

function QuestionConfig({
  question,
  onChange,
}: {
  question: Question;
  onChange: (patch: Partial<Question>) => void;
}) {
  if (
    question.type === "single_select" ||
    question.type === "single_radio" ||
    question.type === "multi_select" ||
    question.type === "scored_choice"
  ) {
    const opts = question.options ?? [];
    const showScore = question.type === "scored_choice";
    return (
      <div className="space-y-1.5 ml-5">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={o.label}
              onChange={(e) => {
                const next = [...opts];
                next[i] = { ...o, label: e.target.value };
                onChange({ options: next });
              }}
              className="flex-1 h-7 px-2 rounded border border-icm-border bg-icm-panel text-[11.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
            />
            {showScore && (
              <input
                type="number"
                value={o.score ?? 0}
                onChange={(e) => {
                  const next = [...opts];
                  next[i] = { ...o, score: Number(e.target.value) };
                  onChange({ options: next });
                }}
                className="w-16 h-7 px-2 rounded border border-icm-border bg-icm-panel text-[11.5px] font-mono text-icm-text focus:outline-none focus:border-icm-accent"
              />
            )}
            <button
              onClick={() => onChange({ options: opts.filter((_, j) => j !== i) })}
              className="w-6 h-6 rounded text-icm-text-faint hover:text-icm-red flex items-center justify-center"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            onChange({
              options: [
                ...opts,
                { label: `Option ${opts.length + 1}`, ...(showScore ? { score: 0 } : {}) },
              ],
            })
          }
          className="text-[11px] font-geist font-semibold text-icm-accent hover:underline"
        >
          + Add option
        </button>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="ml-5 space-y-1">
        <label className="flex items-center gap-1.5 text-[11px] text-icm-text-dim">
          <input
            type="checkbox"
            checked={!!question.followUpIfYes}
            onChange={(e) =>
              onChange({
                followUpIfYes: e.target.checked
                  ? { type: "short_text", placeholder: "Describe…" }
                  : undefined,
              })
            }
            className="accent-icm-accent"
          />
          Show follow-up if Yes
        </label>
      </div>
    );
  }

  if (question.type === "likert") {
    return (
      <div className="ml-5 flex items-center gap-2 text-[11px] text-icm-text-dim">
        Points:
        <select
          value={question.likertPoints ?? 5}
          onChange={(e) => onChange({ likertPoints: Number(e.target.value) as 3 | 5 | 7 })}
          className="h-7 px-2 rounded border border-icm-border bg-icm-panel text-[11.5px] focus:outline-none"
        >
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={7}>7</option>
        </select>
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <div className="ml-5 flex items-center gap-2 text-[11px] text-icm-text-dim">
        Unit:
        <input
          value={question.unit ?? ""}
          onChange={(e) => onChange({ unit: e.target.value })}
          placeholder="lbs, years…"
          className="h-7 px-2 rounded border border-icm-border bg-icm-panel text-[11.5px] focus:outline-none"
        />
      </div>
    );
  }

  if (question.type === "instructions") {
    return (
      <textarea
        value={question.body ?? ""}
        onChange={(e) => onChange({ body: e.target.value })}
        rows={2}
        className="ml-5 w-[calc(100%-1.25rem)] rounded border border-icm-border bg-icm-panel p-2 text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
      />
    );
  }

  if (question.type === "independence_level") {
    return (
      <p className="ml-5 text-[11px] text-icm-text-faint italic">
        Renders the standard 8-level independence scale to case managers.
      </p>
    );
  }

  return null;
}

function SettingsPanel({
  tpl,
  setTpl,
  onClose,
}: {
  tpl: AssessmentTemplate;
  setTpl: (t: AssessmentTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] rounded-xl bg-icm-panel border border-icm-border shadow-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-manrope font-bold text-[16px] text-icm-text">Template Settings</h2>
          <button onClick={onClose} className="text-[12px] text-icm-text-dim hover:text-icm-text">
            Close
          </button>
        </div>

        <Field label="Type">
          <select
            value={tpl.type}
            onChange={(e) => setTpl({ ...tpl, type: e.target.value as AssessmentTemplate["type"] })}
            className="h-9 w-full px-2 rounded-lg border border-icm-border bg-icm-bg text-[12px]"
          >
            {(["Initial", "Annual", "Significant Change", "Transition", "Screening", "Custom"] as const).map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            value={tpl.description ?? ""}
            onChange={(e) => setTpl({ ...tpl, description: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-icm-border bg-icm-bg p-2 text-[12px]"
          />
        </Field>

        <Field label="Required frequency">
          <select
            value={tpl.frequency}
            onChange={(e) =>
              setTpl({ ...tpl, frequency: e.target.value as AssessmentTemplate["frequency"] })
            }
            className="h-9 w-full px-2 rounded-lg border border-icm-border bg-icm-bg text-[12px]"
          >
            {(["One-time", "Annual", "Semi-annual", "Quarterly", "As needed"] as const).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Estimated time (minutes)">
          <input
            type="number"
            value={tpl.estimatedMinutes}
            onChange={(e) => setTpl({ ...tpl, estimatedMinutes: Number(e.target.value) })}
            className="h-9 w-full px-2 rounded-lg border border-icm-border bg-icm-bg text-[12px]"
          />
        </Field>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-icm-text-faint mb-2 font-semibold">
            Signature requirements
          </p>
          {(["caseManager", "individual", "guardian", "supervisor"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-[12px] py-0.5">
              <input
                type="checkbox"
                checked={tpl.signatureRequirements[k]}
                onChange={(e) =>
                  setTpl({
                    ...tpl,
                    signatureRequirements: { ...tpl.signatureRequirements, [k]: e.target.checked },
                  })
                }
                className="accent-icm-accent"
              />
              {k === "caseManager" ? "Case manager" : k.charAt(0).toUpperCase() + k.slice(1)}
            </label>
          ))}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-icm-text-faint mb-2 font-semibold">
            LOC thresholds
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "moderate", "high"] as const).map((k) => (
              <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                <input
                  type="number"
                  value={tpl.loc[k]}
                  onChange={(e) =>
                    setTpl({ ...tpl, loc: { ...tpl.loc, [k]: Number(e.target.value) } })
                  }
                  className="h-9 w-full px-2 rounded-lg border border-icm-border bg-icm-bg text-[12px]"
                />
              </Field>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-semibold">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
