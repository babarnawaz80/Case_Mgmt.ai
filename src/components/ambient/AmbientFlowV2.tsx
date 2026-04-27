import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Shield,
  X,
  Mic,
  Pause,
  Play,
  Plus,
  Check,
  AlertTriangle,
  FileText,
  ClipboardList,
  ShieldAlert,
  ClipboardCheck,
  Clock,
  Copy,
  ChevronRight,
  CircleStop,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { people, type Person } from "@/data/people";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Step = "consent" | "recording" | "processing" | "review" | "success";
type SessionType =
  | "In-person visit"
  | "Phone call"
  | "Virtual meeting"
  | "Team meeting / Care conference"
  | "PCP / ISP meeting"
  | "Internal / Supervisor call (non-billable)";

const sessionTypes: SessionType[] = [
  "In-person visit",
  "Phone call",
  "Virtual meeting",
  "Team meeting / Care conference",
  "PCP / ISP meeting",
  "Internal / Supervisor call (non-billable)",
];

interface ExtractedItem {
  id: string;
  label: string;
  value: string;
  confidence?: number;
  requiresConfirm?: boolean;
}

interface ExtractGroup {
  id: string;
  title: string;
  icon: typeof FileText;
  borderClass: string; // tailwind border color
  bgClass: string;     // tint for header
  items: ExtractedItem[];
  destinationModule: string;
}

interface AmbientFlowV2Props {
  defaultIndividualId?: string;
  defaultIndividualName?: string;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock seed for Joseph Brown session
// ─────────────────────────────────────────────────────────────────────────────

const mockTranscript: { speaker: string; text: string; tags?: { word: string; tone: string }[] }[] = [
  {
    speaker: "Kathy",
    text: "Hi Joseph, thanks for having me today. I just wanted to check in on how things have been going with the day program.",
  },
  {
    speaker: "Joseph",
    text: "It's been good. I really like going. I was thinking I might want to try working part-time too.",
    tags: [
      { word: "working part-time", tone: "purple" },
    ],
  },
  {
    speaker: "Kathy",
    text: "That's great to hear. Let me note that down for your next ISP review.",
    tags: [{ word: "ISP review", tone: "amber" }],
  },
  {
    speaker: "Linda",
    text: "I do want to mention — at home, we've noticed some behavioral changes the last couple weeks. Joseph has been more withdrawn.",
    tags: [
      { word: "behavioral changes", tone: "red" },
      { word: "withdrawn", tone: "red" },
    ],
  },
  {
    speaker: "Kathy",
    text: "Thank you for sharing that, Linda. I'll loop in the behavioral support team and we'll follow up within two weeks.",
    tags: [
      { word: "behavioral support team", tone: "blue" },
      { word: "two weeks", tone: "amber" },
    ],
  },
  {
    speaker: "Joseph",
    text: "Okay. I'd like to keep doing the day program though.",
    tags: [{ word: "day program", tone: "green" }],
  },
];

const extractGroups: ExtractGroup[] = [
  {
    id: "contact_note",
    title: "Contact Note",
    icon: FileText,
    borderClass: "border-l-blue-500",
    bgClass: "bg-blue-50",
    destinationModule: "Contact Note",
    items: [
      { id: "cn_type", label: "Contact type", value: "In-person visit" },
      { id: "cn_purpose", label: "Purpose", value: "Quarterly check-in, service review" },
      { id: "cn_present", label: "Who was present", value: "Kathy Adams (CM), Joseph Brown, Joseph's mother Linda" },
      {
        id: "cn_details",
        label: "Details",
        value:
          "Discussed Joseph's satisfaction with current day program. He mentioned wanting to explore part-time employment. Mother expressed concern about recent behavioral changes at home.",
      },
      {
        id: "cn_concerns",
        label: "Issues / concerns",
        value: "Behavioral changes at home reported by mother.",
        confidence: 94,
      },
      {
        id: "cn_next",
        label: "Next steps",
        value: "Follow up with behavioral support team. Schedule employment exploration meeting.",
      },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: ClipboardCheck,
    borderClass: "border-l-emerald-500",
    bgClass: "bg-emerald-50",
    destinationModule: "Case Management",
    items: [
      { id: "tk_1", label: "Mark complete", value: "Schedule quarterly visit (was 76 days overdue)" },
      { id: "tk_2", label: "Mark complete", value: "Quarterly visit — in-person confirmed today" },
      { id: "tk_3", label: "Create new task", value: "Contact behavioral support team · Due: 2 weeks" },
    ],
  },
  {
    id: "isp",
    title: "ISP / Care Plan",
    icon: FileText,
    borderClass: "border-l-purple-500",
    bgClass: "bg-purple-50",
    destinationModule: "Care Plan / ISP",
    items: [
      {
        id: "isp_goal",
        label: "Goal note",
        value:
          "Joseph expressed interest in part-time employment. Recommend adding employment goal to next ISP review. [AI suggested — review before saving]",
      },
    ],
  },
  {
    id: "risk",
    title: "Risk & Safety",
    icon: ShieldAlert,
    borderClass: "border-l-rose-500",
    bgClass: "bg-rose-50",
    destinationModule: "Risk & Safety",
    items: [
      {
        id: "risk_1",
        label: "Flag",
        value:
          "Behavioral changes reported at home by primary caregiver. Severity: Low-Medium. Recommend monitoring.",
        confidence: 78,
        requiresConfirm: true,
      },
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring Form",
    icon: ClipboardList,
    borderClass: "border-l-amber-500",
    bgClass: "bg-amber-50",
    destinationModule: "Monitoring Form",
    items: [
      {
        id: "mon_1",
        label: "Current circumstances update",
        value:
          "No demographic changes reported. Primary caregiver (mother Linda) — no changes. Individual satisfaction with services: Positive.",
      },
      { id: "mon_2", label: "Type of review", value: "Quarterly" },
      {
        id: "mon_3",
        label: "Pre-fills",
        value: "4 of 8 required fields completed by AI.",
      },
    ],
  },
  {
    id: "billable",
    title: "Billable Activity",
    icon: Clock,
    borderClass: "border-l-slate-400",
    bgClass: "bg-slate-50",
    destinationModule: "Billable Activity",
    items: [
      { id: "bl_1", label: "Activity type", value: "Face-to-face visit" },
      { id: "bl_2", label: "Date", value: new Date().toLocaleDateString() },
      { id: "bl_3", label: "Duration", value: "47 minutes · Calculated units: 3 (15-min increments)" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tone tag rendering
// ─────────────────────────────────────────────────────────────────────────────

const toneClass = (tone?: string) => {
  switch (tone) {
    case "green":  return "bg-emerald-500/15 text-emerald-200";
    case "amber":  return "bg-amber-500/15 text-amber-200";
    case "red":    return "bg-rose-500/15 text-rose-200";
    case "blue":   return "bg-blue-500/15 text-blue-200";
    case "purple": return "bg-violet-500/15 text-violet-200";
    default: return "";
  }
};

const renderTranscriptLine = (line: typeof mockTranscript[number]) => {
  if (!line.tags || line.tags.length === 0) return line.text;
  let parts: (string | JSX.Element)[] = [line.text];
  line.tags.forEach((tag, idx) => {
    const next: (string | JSX.Element)[] = [];
    parts.forEach((p) => {
      if (typeof p !== "string") return next.push(p);
      const segs = p.split(tag.word);
      segs.forEach((s, i) => {
        if (i > 0) {
          next.push(
            <span key={`tag-${idx}-${i}`} className={`px-1 rounded ${toneClass(tag.tone)}`}>
              {tag.word}
            </span>
          );
        }
        if (s) next.push(s);
      });
    });
    parts = next;
  });
  return <>{parts}</>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main flow
// ─────────────────────────────────────────────────────────────────────────────

const AmbientFlowV2 = ({ defaultIndividualId, defaultIndividualName, onClose }: AmbientFlowV2Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("consent");

  // Step 1 state
  const seedPerson = defaultIndividualId
    ? people.find((p) => p.id === defaultIndividualId)
    : people.find((p) => p.firstName === "Joseph" && p.lastName === "Brown");
  const [selectedPerson, setSelectedPerson] = useState<Person | undefined>(seedPerson);
  const [personSearch, setPersonSearch] = useState("");
  const [personOpen, setPersonOpen] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("In-person visit");
  const [consent, setConsent] = useState(false);

  // Step 2 state
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Step 3 state
  const [progressStep, setProgressStep] = useState(0);
  const progressLines = [
    "✓ Transcription complete (156 words)",
    "✓ Extracting entities and action items...",
    "✓ Matching to modules...",
    "✓ Generating draft notes...",
    "✓ Building review summary...",
  ];

  // Step 4 state
  const [tab, setTab] = useState<"items" | "transcript">("items");
  const [includedItems, setIncludedItems] = useState<Set<string>>(
    () => new Set(extractGroups.flatMap((g) => g.items.map((i) => i.id)).filter((id) => id !== "bl_4"))
  );
  const [confirmedRisk, setConfirmedRisk] = useState(false);

  // Step 5 state
  const [undoSeconds, setUndoSeconds] = useState(60);

  const personName =
    selectedPerson ? `${selectedPerson.firstName}${selectedPerson.nickname ? ` (${selectedPerson.nickname})` : ""} ${selectedPerson.lastName}` :
    defaultIndividualName ?? "General / No individual";
  const personFirst = selectedPerson?.firstName ?? defaultIndividualName?.split(" ")[0] ?? "this person";

  // Recording timer + transcript reveal
  useEffect(() => {
    if (step !== "recording" || paused) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [step, paused]);

  useEffect(() => {
    if (step !== "recording" || paused) return;
    if (visibleLines >= mockTranscript.length) return;
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 1800);
    return () => clearTimeout(t);
  }, [step, paused, visibleLines]);

  // Processing animation → review
  useEffect(() => {
    if (step !== "processing") return;
    if (progressStep >= progressLines.length) {
      const t = setTimeout(() => setStep("review"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgressStep((s) => s + 1), 500);
    return () => clearTimeout(t);
  }, [step, progressStep]);

  // Undo timer
  useEffect(() => {
    if (step !== "success") return;
    if (undoSeconds <= 0) return;
    const t = setTimeout(() => setUndoSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, undoSeconds]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleItem = (id: string) =>
    setIncludedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const includedCount = includedItems.size;
  const totalCount = extractGroups.reduce((acc, g) => acc + g.items.length, 0);
  const moduleCount = extractGroups.filter((g) => g.items.some((i) => includedItems.has(i.id))).length;

  const riskItem = extractGroups.find((g) => g.id === "risk")?.items[0];
  const riskIncluded = riskItem ? includedItems.has(riskItem.id) : false;
  const needsRiskConfirm = riskIncluded && !confirmedRisk;

  const filteredPeople = people.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.nickname ?? ""}`.toLowerCase().includes(personSearch.toLowerCase())
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Consent overlay
  // ───────────────────────────────────────────────────────────────────────────
  if (step === "consent") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(10,10,10,0.85)" }}>
        <div className="w-[480px] bg-white rounded-xl p-6 shadow-2xl">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(215 94% 58%), hsl(265 70% 58%))" }}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-center font-display text-[20px] font-semibold text-icm-text mb-1.5">Start Ambient Session</h2>
          <p className="text-center text-[13px] text-icm-text-dim mb-5">
            AI will listen, transcribe, and extract everything automatically. Nothing saves until you review.
          </p>

          {/* Consent panel */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[12px] font-semibold text-amber-900">Before recording, confirm consent</span>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
              <span className="text-[12px] text-amber-900 leading-snug">
                I confirm <span className="font-semibold">{personName}</span> has verbally consented to this session being recorded and processed by AI.
              </span>
            </label>
          </div>

          {/* Individual selector */}
          <div className="mb-3 relative">
            <label className="text-[12px] font-medium text-icm-text-dim mb-1.5 block">Who is this session about?</label>
            <button
              onClick={() => setPersonOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-icm-border text-left text-[13px] hover:border-icm-border-strong"
            >
              <span className="text-icm-text">{personName}</span>
              <ChevronRight className={`w-3.5 h-3.5 text-icm-text-faint transition-transform ${personOpen ? "rotate-90" : ""}`} />
            </button>
            {personOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-white border border-icm-border rounded-lg shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-icm-border">
                  <Search className="w-3.5 h-3.5 text-icm-text-faint" />
                  <input
                    autoFocus
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    placeholder="Search people..."
                    className="flex-1 outline-none text-[13px] bg-transparent"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedPerson(undefined); setPersonOpen(false); setPersonSearch(""); }}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-icm-bg text-icm-text-dim italic"
                  >
                    General / No individual
                  </button>
                  {filteredPeople.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPerson(p); setPersonOpen(false); setPersonSearch(""); }}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-icm-bg text-icm-text"
                    >
                      {p.lastName}, {p.firstName}{p.nickname ? ` (${p.nickname})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Session type */}
          <div className="mb-5">
            <label className="text-[12px] font-medium text-icm-text-dim mb-1.5 block">Session type</label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as SessionType)}
              className="w-full px-3 py-2 rounded-lg border border-icm-border text-[13px] text-icm-text bg-white"
            >
              {sessionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button
            onClick={() => setStep("recording")}
            disabled={!consent}
            className="w-full py-2.5 rounded-lg bg-icm-text text-white text-[13px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Start Recording
          </button>
          <button onClick={onClose} className="w-full mt-2 text-[12px] text-icm-text-dim hover:text-icm-text">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Live recording
  // ───────────────────────────────────────────────────────────────────────────
  if (step === "recording") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0a0a0a" }}>
        {/* Top bar */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white text-[14px] font-medium">{personName}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">{sessionType}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[14px] text-white">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setConfirmCancel(true)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-5">
            {mockTranscript.slice(0, visibleLines).map((line, i) => (
              <div key={i} className="text-[15px] leading-[1.6] text-white/90">
                <span className="text-blue-400 font-semibold mr-2">{line.speaker}:</span>
                {renderTranscriptLine(line)}
              </div>
            ))}
            {visibleLines < mockTranscript.length && !paused && (
              <div className="flex gap-1 text-white/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="shrink-0 pb-10 pt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setPaused((p) => !p)}
              className="w-11 h-11 rounded-full border border-white/30 text-white/80 hover:bg-white/10 flex items-center justify-center"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setStep("processing")}
              className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] flex items-center justify-center transition-colors"
            >
              <CircleStop className="w-6 h-6" />
            </button>
            <button className="w-11 h-11 rounded-full border border-white/30 text-white/80 hover:bg-white/10 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[12px] text-white/50">Nothing is saved until you review and confirm.</p>
        </div>

        {/* Cancel confirm */}
        {confirmCancel && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60">
            <div className="w-[360px] bg-white rounded-xl p-5">
              <h3 className="font-display font-semibold text-[15px] text-icm-text mb-1">Cancel session?</h3>
              <p className="text-[13px] text-icm-text-dim mb-4">The recording and any captured transcript will be discarded.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2 rounded-lg border border-icm-border text-[13px] text-icm-text hover:bg-icm-bg">
                  Keep recording
                </button>
                <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-rose-500 text-white text-[13px] hover:bg-rose-600">
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Processing
  // ───────────────────────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 animate-pulse"
          style={{ background: "linear-gradient(135deg, hsl(215 94% 58%), hsl(265 70% 58%))" }}>
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-2.5 min-w-[320px]">
          {progressLines.slice(0, progressStep).map((l, i) => (
            <div key={i} className="text-[13px] text-white/80 font-mono animate-fade-in">{l}</div>
          ))}
          {progressStep < progressLines.length && (
            <div className="text-[13px] text-white/40 font-mono">
              {progressLines[progressStep]?.replace("✓", "•")}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 4: Review & Push
  // ───────────────────────────────────────────────────────────────────────────
  if (step === "review") {
    const moduleSummaries = extractGroups
      .filter((g) => g.items.some((i) => includedItems.has(i.id)))
      .map((g) => {
        const includedInGroup = g.items.filter((i) => includedItems.has(i.id));
        const lowConf = includedInGroup.some((i) => i.requiresConfirm && (g.id !== "risk" || !confirmedRisk));
        const incomplete = g.id === "monitoring";
        return {
          name: g.destinationModule,
          icon: g.icon,
          count: includedInGroup.length,
          status: lowConf ? "needsConfirm" : incomplete ? "incomplete" : "ready",
        };
      });

    return (
      <div className="fixed inset-0 z-[100] bg-icm-bg flex flex-col">
        {/* Header */}
        <div className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-icm-border bg-white">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-icm-accent" />
            <h2 className="font-display font-semibold text-[15px] text-icm-text">Review & push to modules</h2>
            <span className="text-[12px] text-icm-text-dim">· {personName} · {sessionType}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-icm-bg text-icm-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* LEFT 60% */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-icm-border">
            {/* Tabs */}
            <div className="shrink-0 px-6 pt-4 flex items-center gap-1 border-b border-icm-border">
              <button
                onClick={() => setTab("items")}
                className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === "items" ? "border-icm-text text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
              >
                Extracted items
              </button>
              <button
                onClick={() => setTab("transcript")}
                className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === "transcript" ? "border-icm-text text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
              >
                Full transcript
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === "items" ? (
                <div className="space-y-5">
                  {extractGroups.map((g) => {
                    const Icon = g.icon;
                    return (
                      <div key={g.id} className={`rounded-lg border border-icm-border bg-white border-l-4 ${g.borderClass}`}>
                        <div className={`flex items-center gap-2 px-4 py-2.5 ${g.bgClass} border-b border-icm-border rounded-tr-lg`}>
                          <Icon className="w-3.5 h-3.5 text-icm-text" />
                          <span className="text-[12px] font-semibold text-icm-text">{g.title}</span>
                          <span className="text-[11px] text-icm-text-dim">→ {g.destinationModule}</span>
                        </div>
                        <div className="divide-y divide-icm-border">
                          {g.items.map((item) => (
                            <label key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-icm-bg/50 cursor-pointer">
                              <Checkbox
                                checked={includedItems.has(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-0.5">{item.label}</p>
                                <p className="text-[13px] text-icm-text leading-snug">{item.value}</p>
                                {item.confidence !== undefined && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {item.confidence < 85 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                        <AlertTriangle className="w-3 h-3" /> AI confidence: {item.confidence}%
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-icm-text-faint">AI confidence: {item.confidence}%</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-icm-border p-5 relative">
                  <button
                    onClick={() => navigator.clipboard.writeText(mockTranscript.map(l => `${l.speaker}: ${l.text}`).join("\n\n"))}
                    className="absolute top-3 right-3 flex items-center gap-1 text-[11px] text-icm-text-dim hover:text-icm-text px-2 py-1 rounded border border-icm-border"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  <div className="space-y-4 max-w-2xl">
                    {mockTranscript.map((line, i) => (
                      <div key={i} className="text-[13.5px] leading-[1.6] text-icm-text">
                        <span className="text-icm-accent font-semibold mr-1.5">{line.speaker}:</span>
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 40% */}
          <div className="w-[40%] max-w-[480px] flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Summary */}
              <h3 className="text-[12px] uppercase tracking-wide font-semibold text-icm-text-faint mb-3">Review summary</h3>
              <div className="rounded-lg border border-icm-border p-4 space-y-2 mb-5">
                <SummaryRow label="Items selected" value={`${includedCount} of ${totalCount}`} />
                <SummaryRow label="Modules updated" value={String(moduleCount)} />
                <SummaryRow label="Tasks marked complete" value="2" />
                <SummaryRow label="New tasks created" value="1" />
                <SummaryRow label="Items needing confirmation" value={needsRiskConfirm ? "1" : "0"} accent={needsRiskConfirm} />
              </div>

              {/* Module destinations */}
              <h3 className="text-[12px] uppercase tracking-wide font-semibold text-icm-text-faint mb-3">Module destinations</h3>
              <div className="space-y-2 mb-5">
                {moduleSummaries.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-icm-border">
                      <Icon className="w-3.5 h-3.5 text-icm-text-dim shrink-0" />
                      <span className="text-[12.5px] text-icm-text flex-1 truncate">{m.name}</span>
                      <span className="text-[11px] text-icm-text-faint">{m.count}</span>
                      {m.status === "ready" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                          <Check className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                      {m.status === "needsConfirm" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5" /> Confirm
                        </span>
                      )}
                      {m.status === "incomplete" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirmation items */}
              {riskIncluded && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-5">
                  <p className="text-[12px] font-semibold text-amber-900 mb-2">Confirmation required</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={confirmedRisk} onCheckedChange={(c) => setConfirmedRisk(c === true)} className="mt-0.5" />
                    <span className="text-[12px] text-amber-900 leading-snug">
                      I confirm the risk/safety flag is accurate and should be saved.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="shrink-0 border-t border-icm-border p-4 space-y-2">
              <button
                onClick={() => setStep("success")}
                disabled={needsRiskConfirm || includedCount === 0}
                className="w-full py-2.5 rounded-lg bg-icm-text text-white text-[13px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Save & push to all modules →
              </button>
              <p className="text-[11px] text-icm-text-faint text-center">
                Writes to {moduleCount} modules simultaneously. Undoable for 60 seconds.
              </p>
              <button className="w-full py-2 rounded-lg border border-icm-border text-[12.5px] text-icm-text hover:bg-icm-bg">
                Review each module first
              </button>
              <button onClick={onClose} className="w-full text-[11.5px] text-icm-text-dim hover:text-icm-text py-1">
                Save as draft only (nothing pushed yet)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 5: Success
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <div className="w-[520px]">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center animate-scale-in">
            <Check className="w-8 h-8 text-emerald-600" strokeWidth={3} />
          </div>
        </div>
        <h2 className="text-center font-display font-bold text-[22px] text-icm-text mb-1">Done. {moduleCount} modules updated.</h2>
        <p className="text-center text-[13px] text-icm-text-dim mb-6">{personFirst}'s record is up to date.</p>

        <div className="rounded-xl border border-icm-border bg-white p-4 space-y-2 mb-5">
          <SuccessLine icon={FileText} text="Contact Note created" />
          <SuccessLine icon={ClipboardCheck} text="2 tasks marked complete, 1 new task created" />
          <SuccessLine icon={FileText} text="ISP goal note saved for next review" />
          <SuccessLine icon={ShieldAlert} text="Risk flag logged (Low-Medium)" />
          <SuccessLine icon={ClipboardList} text="Monitoring form partially updated (4/8 fields)" />
          <SuccessLine icon={Clock} text="Billable activity note created · 3 units" />
        </div>

        {undoSeconds > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12.5px] text-amber-900">
                Changed your mind? <button className="underline font-medium">Undo all changes</button>
              </span>
              <span className="text-[12px] font-mono text-amber-700">
                0:{undoSeconds.toString().padStart(2, "0")} remaining
              </span>
            </div>
            <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(undoSeconds / 60) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { onClose(); navigate("/dashboard"); }}
            className="flex-1 py-2.5 rounded-lg bg-icm-text text-white text-[13px] font-medium hover:opacity-90"
          >
            Back to dashboard
          </button>
          <button
            onClick={() => { onClose(); if (selectedPerson) navigate(`/people/${selectedPerson.id}/echart`); }}
            className="flex-1 py-2.5 rounded-lg border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg"
          >
            View {personFirst}'s eChart
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SummaryRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-[12.5px] text-icm-text-dim">{label}</span>
    <span className={`text-[12.5px] font-semibold ${accent ? "text-amber-600" : "text-icm-text"}`}>{value}</span>
  </div>
);

const SuccessLine = ({ icon: Icon, text }: { icon: typeof FileText; text: string }) => (
  <div className="flex items-center gap-2.5 text-[13px] text-icm-text">
    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
    <Icon className="w-3.5 h-3.5 text-icm-text-dim shrink-0" />
    <span>{text}</span>
  </div>
);

export default AmbientFlowV2;
