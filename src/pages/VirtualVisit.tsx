import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  Users,
  MessageSquare,
  PhoneOff,
  MoreVertical,
  Sparkles,
  X,
  ChevronLeft,
  Send,
  Activity,
} from "lucide-react";
import ReviewApplyModal from "@/components/ambient/ReviewApplyModal";
import { demoToast } from "@/lib/demoToast";
import { toast } from "@/hooks/use-toast";

type Phase = "in-call" | "ending" | "processing" | "review";

interface TranscriptLine {
  speaker: string;
  text: string;
  time: string;
  entities?: { label: string; type: "service" | "risk" | "date" | "goal" }[];
  isNote?: boolean;
}

const seedTranscript: TranscriptLine[] = [
  {
    speaker: "Kathy Adams",
    text: "Hi Joseph, hi Linda. Thanks for joining today. How has the week been?",
    time: "00:12",
  },
  {
    speaker: "Linda Brown",
    text: "It's been okay. Joseph has been sleeping less and a bit more agitated in the evenings.",
    time: "00:31",
    entities: [{ label: "behavioral change", type: "risk" }],
  },
  {
    speaker: "Joseph Brown",
    text: "I want to look for a part-time job at the bakery downtown.",
    time: "01:04",
    entities: [{ label: "employment goal", type: "goal" }],
  },
  {
    speaker: "Kathy Adams",
    text: "That's great. Let's also talk about your ISP renewal — it's overdue by about 25 days.",
    time: "01:42",
    entities: [
      { label: "ISP renewal", type: "service" },
      { label: "25 days overdue", type: "date" },
    ],
  },
];

const aiChips = [
  "ISP renewal mentioned →",
  "Employment goal discussed →",
  "Behavioral concern flagged →",
];

const VirtualVisit = () => {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const personName = params.get("name") ?? "Joseph Brown";
  const personId = params.get("person") ?? "1";
  const purpose = params.get("purpose") ?? "Quarterly check-in";

  const [phase, setPhase] = useState<Phase>("in-call");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>(
    seedTranscript.slice(0, 1)
  );
  const [quickNote, setQuickNote] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [processStep, setProcessStep] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Tick duration
  useEffect(() => {
    if (phase !== "in-call") return;
    const id = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Stream transcript lines progressively
  useEffect(() => {
    if (phase !== "in-call") return;
    if (transcript.length >= seedTranscript.length) return;
    const id = setTimeout(() => {
      setTranscript((t) => [...t, seedTranscript[t.length]]);
    }, 6000);
    return () => clearTimeout(id);
  }, [transcript.length, phase]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript]);

  // Processing animation
  useEffect(() => {
    if (phase !== "processing") return;
    if (processStep >= 6) {
      const id = setTimeout(() => setPhase("review"), 600);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setProcessStep((s) => s + 1), 700);
    return () => clearTimeout(id);
  }, [phase, processStep]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const endVisit = () => {
    setPhase("processing");
    setProcessStep(0);
    setShowEndConfirm(false);
  };

  const addQuickNote = () => {
    if (!quickNote.trim()) return;
    setTranscript((t) => [
      ...t,
      {
        speaker: "Note",
        text: quickNote,
        time: fmtTime(duration),
        isNote: true,
      },
    ]);
    setQuickNote("");
  };

  const askAi = () => {
    if (!aiQuery.trim()) return;
    toast({
      title: "AI response",
      description: `Reference only — not added to transcript.`,
    });
    setAiQuery("");
  };

  if (phase === "review") {
    return (
      <ReviewApplyModal
        open={true}
        onClose={() => navigate(`/people/${personId}/echart`)}
        onApply={() => {
          toast({
            title: "Documentation pushed",
            description: "Visit Summary, Contact Note, and tasks updated.",
          });
          navigate(`/people/${personId}/echart`);
        }}
        onEditDraft={() => {
          navigate(`/people/${personId}/visit-summary`);
        }}
      />
    );
  }

  if (phase === "processing") {
    const steps = [
      { label: `Visit ended (${fmtTime(duration)})`, duration: fmtTime(duration) },
      { label: "Transcription complete (1,247 words)" },
      { label: "Extracting entities..." },
      { label: "Identifying action items..." },
      { label: "Matching to modules..." },
      { label: "Building documentation..." },
      { label: "Complete" },
    ];
    return (
      <div className="fixed inset-0 z-50 bg-icm-bg flex items-center justify-center">
        <div className="w-full max-w-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl ai-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-manrope font-bold text-[16px] text-icm-text">
                Processing your visit
              </h2>
              <p className="text-[12px] font-geist text-icm-text-dim">
                {personName} · {purpose}
              </p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {steps.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: i <= processStep ? 1 : 0.3,
                  x: 0,
                }}
                className="flex items-center gap-2.5 text-[13px] font-geist"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < processStep
                      ? "bg-icm-green text-white"
                      : i === processStep
                      ? "bg-icm-accent text-white animate-pulse"
                      : "bg-icm-border text-icm-text-dim"
                  }`}
                >
                  {i < processStep ? "✓" : ""}
                </span>
                <span className={i <= processStep ? "text-icm-text" : "text-icm-text-faint"}>
                  {s.label}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <div className="h-14 bg-[#141414] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-white/60 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <VideoIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-manrope font-bold text-white truncate">
              Virtual Visit · <span className="text-white/60 font-normal">{personName}</span>
            </p>
            <p className="text-[10.5px] font-geist text-white/50">{purpose}</p>
          </div>
          <div className="ml-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-icm-red/20 ring-1 ring-icm-red/30">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-red animate-pulse" />
            <span className="text-[11px] font-mono font-semibold text-icm-red tabular-nums">
              {fmtTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-geist text-white/50">
          <Users className="w-3 h-3" />
          Kathy Adams · {personName} · Linda Brown
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes((v) => !v)}
            className={`h-8 px-2.5 rounded-lg text-[11.5px] font-geist font-medium inline-flex items-center gap-1.5 transition-colors ${
              showNotes
                ? "bg-icm-accent text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Notes
          </button>
          <button
            onClick={() => demoToast("Visit options menu")}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Video area */}
        <div className="flex-1 relative bg-[#0a0a0a] p-4 flex flex-col gap-3">
          {/* Top tiles row */}
          <div className="grid grid-cols-2 gap-3 h-32 shrink-0">
            <ParticipantTile name={personName} initials="JB" speaking={false} />
            <ParticipantTile name="Linda Brown" initials="LB" speaking={true} />
          </div>

          {/* Main video */}
          <div className="flex-1 rounded-xl bg-gradient-to-br from-[#1f2937] via-[#111827] to-[#0b1220] relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-manrope font-bold mx-auto mb-3 ring-2 ring-white/15">
                  LB
                </div>
                <p className="text-white/80 font-geist text-[14px]">Linda Brown</p>
                <p className="text-white/40 font-geist text-[11.5px] mt-0.5">
                  Speaking
                </p>
              </div>
            </div>

            {/* Self view */}
            <div className="absolute bottom-3 right-3 w-40 h-28 rounded-lg bg-gradient-to-br from-[#374151] to-[#1f2937] ring-1 ring-white/15 overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white text-[11px] font-manrope font-bold mx-auto">
                  KA
                </div>
                <p className="text-white/70 text-[10px] font-geist mt-1">You</p>
              </div>
              {muted && (
                <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-icm-red flex items-center justify-center">
                  <MicOff className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Ambient indicator */}
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-icm-accent/20 ring-1 ring-icm-accent/40 backdrop-blur-sm">
              <Mic className="w-3 h-3 text-icm-accent animate-pulse" />
              <span className="text-[10.5px] font-geist font-bold text-white uppercase tracking-wider">
                Ambient on
              </span>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="h-16 bg-[#141414] rounded-xl flex items-center justify-center gap-2 shrink-0 px-4">
            <ControlButton
              icon={muted ? MicOff : Mic}
              label={muted ? "Unmute" : "Mute"}
              active={muted}
              onClick={() => setMuted(!muted)}
            />
            <ControlButton
              icon={cameraOff ? VideoOff : VideoIcon}
              label={cameraOff ? "Start camera" : "Stop camera"}
              active={cameraOff}
              onClick={() => setCameraOff(!cameraOff)}
            />
            <ControlButton icon={ScreenShare} label="Share" />
            <ControlButton icon={Users} label="People" />
            <ControlButton icon={MessageSquare} label="Chat" />
            <div className="w-px h-8 bg-white/10 mx-1" />
            <button
              onClick={() => setShowEndConfirm(true)}
              className="h-10 px-5 rounded-xl bg-icm-red hover:brightness-110 text-white text-[12.5px] font-geist font-semibold inline-flex items-center gap-1.5 shadow-lg"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End visit
            </button>
          </div>
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {showNotes && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="border-l border-white/5 bg-[#141414] flex flex-col min-h-0 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-icm-accent" />
                  <p className="font-manrope font-bold text-[12.5px] text-white">
                    Live transcript
                  </p>
                </div>
                <button
                  onClick={() => setShowNotes(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto p-3 space-y-2.5"
              >
                {transcript.map((line, i) => (
                  <div key={i}>
                    {line.isNote ? (
                      <div className="rounded-lg bg-icm-amber/10 ring-1 ring-icm-amber/30 px-2.5 py-1.5">
                        <p className="text-[10px] font-geist font-bold text-icm-amber uppercase tracking-wider">
                          [Note] {line.time}
                        </p>
                        <p className="text-[12px] font-geist text-white/90 mt-0.5">
                          {line.text}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-geist font-semibold text-white/80">
                            {line.speaker}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">
                            {line.time}
                          </span>
                        </div>
                        <p className="text-[12px] font-geist text-white/70 leading-relaxed">
                          {line.text}
                        </p>
                        {line.entities && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {line.entities.map((e, j) => (
                              <EntityChip key={j} {...e} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* AI chips */}
              <div className="px-3 py-2 border-t border-white/5 shrink-0">
                <p className="text-[9.5px] font-geist font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  AI suggestions (preview)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiChips.map((c, i) => (
                    <span
                      key={i}
                      className="text-[10.5px] font-geist text-icm-accent bg-icm-accent/15 px-2 py-0.5 rounded-full ring-1 ring-icm-accent/25"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick note */}
              <div className="px-3 py-2 border-t border-white/5 shrink-0">
                <div className="flex gap-1.5">
                  <input
                    placeholder="Add a note..."
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addQuickNote()}
                    className="flex-1 h-8 px-2.5 rounded-lg bg-white/5 text-white text-[12px] font-geist placeholder:text-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-icm-accent/50"
                  />
                  <button
                    onClick={addQuickNote}
                    className="w-8 h-8 rounded-lg bg-icm-accent hover:brightness-110 text-white flex items-center justify-center"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Ask AI */}
              <div className="px-3 py-2 border-t border-white/5 shrink-0 bg-black/20">
                <p className="text-[9.5px] font-geist font-semibold text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Ask AI · reference only
                </p>
                <div className="flex gap-1.5">
                  <input
                    placeholder={`Ask about ${personName.split(" ")[0]}...`}
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askAi()}
                    className="flex-1 h-8 px-2.5 rounded-lg bg-white/5 text-white text-[12px] font-geist placeholder:text-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-icm-accent/50"
                  />
                  <button
                    onClick={askAi}
                    className="w-8 h-8 rounded-lg ai-gradient text-white flex items-center justify-center"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* End confirm */}
      <AnimatePresence>
        {showEndConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70"
              onClick={() => setShowEndConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-icm-panel rounded-2xl border border-icm-border shadow-2xl w-full max-w-sm pointer-events-auto p-5">
                <h3 className="font-manrope font-bold text-[15px] text-icm-text">
                  End visit for everyone?
                </h3>
                <p className="text-[12px] font-geist text-icm-text-dim mt-1.5">
                  Ambient transcript will be processed and you'll review the
                  documentation before pushing to modules.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={endVisit}
                    className="h-10 rounded-xl bg-icm-red text-white text-[12.5px] font-geist font-semibold hover:brightness-110"
                  >
                    End for everyone
                  </button>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="h-10 rounded-xl border border-icm-border text-icm-text text-[12.5px] font-geist font-medium hover:bg-icm-bg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const entityToneClass: Record<string, string> = {
  service: "bg-icm-green/15 text-icm-green ring-icm-green/30",
  risk: "bg-icm-red/15 text-icm-red ring-icm-red/30",
  date: "bg-icm-amber/15 text-icm-amber ring-icm-amber/30",
  goal: "bg-icm-accent/15 text-icm-accent ring-icm-accent/30",
};

function EntityChip({
  label,
  type,
}: {
  label: string;
  type: "service" | "risk" | "date" | "goal";
}) {
  return (
    <span
      className={`text-[10px] font-geist font-medium px-1.5 py-0.5 rounded ring-1 ${entityToneClass[type]}`}
    >
      {label}
    </span>
  );
}

function ParticipantTile({
  name,
  initials,
  speaking,
}: {
  name: string;
  initials: string;
  speaking: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl bg-gradient-to-br from-[#1f2937] to-[#0b1220] overflow-hidden ring-1 transition-colors ${
        speaking ? "ring-icm-green/60" : "ring-white/10"
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white text-[14px] font-manrope font-bold">
          {initials}
        </div>
      </div>
      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
        <span className="text-[10px] font-geist text-white">{name}</span>
      </div>
      {speaking && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-icm-green animate-pulse" />
      )}
    </div>
  );
}

function ControlButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
        active
          ? "bg-icm-red text-white"
          : "bg-white/5 hover:bg-white/15 text-white/80"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export default VirtualVisit;
