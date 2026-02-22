import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  Pause,
  Square,
  Shield,
  Lock,
  Waves,
  Activity,
  Pill,
  AlertTriangle,
  FlaskConical,
  HeartPulse,
  Play,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AmbientListeningProps {
  individualName: string;
  onBack: () => void;
}

interface TranscriptEntry {
  role: "case_manager" | "individual";
  name: string;
  time: string;
  text: string;
  tags: { label: string; color: string }[];
}

const mockTranscript: TranscriptEntry[] = [
  {
    role: "case_manager",
    name: "Kathy",
    time: "00:00",
    text: "Good morning, how are you feeling today?",
    tags: [],
  },
  {
    role: "individual",
    name: "Individual",
    time: "00:04",
    text: "Morning. I've been having these headaches again, mostly in the morning. And my blood pressure readings at home have been higher than usual.",
    tags: [
      { label: "headaches", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
      { label: "blood pressure readings", color: "text-primary bg-primary/10 border-primary/30" },
    ],
  },
  {
    role: "case_manager",
    name: "Kathy",
    time: "00:14",
    text: "I see. When did the headaches start, and how high have your readings been?",
    tags: [],
  },
  {
    role: "individual",
    name: "Individual",
    time: "00:19",
    text: "Started about two weeks ago. I've been seeing around 155 over 95 most mornings. I'm still taking the Lisinopril 10mg but I think it's not enough.",
    tags: [
      { label: "155 over 95", color: "text-primary bg-primary/10 border-primary/30" },
      { label: "Lisinopril 10mg", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
    ],
  },
  {
    role: "case_manager",
    name: "Kathy",
    time: "00:32",
    text: "Okay. Let me check your vitals now. Blood pressure is 148 over 92, heart rate 82, SpO2 97 percent. Any chest pain, shortness of breath, or vision changes?",
    tags: [
      { label: "148 over 92", color: "text-primary bg-primary/10 border-primary/30" },
      { label: "heart rate 82", color: "text-primary bg-primary/10 border-primary/30" },
      { label: "SpO2 97 percent", color: "text-primary bg-primary/10 border-primary/30" },
      { label: "chest pain", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
      { label: "shortness of breath", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
      { label: "vision changes", color: "text-red-500 bg-red-500/10 border-red-500/30" },
    ],
  },
  {
    role: "individual",
    name: "Individual",
    time: "00:48",
    text: "No chest pain or breathing issues. But I have been getting some blurry vision occasionally, especially in the mornings when the headaches are bad.",
    tags: [
      { label: "blurry vision", color: "text-red-500 bg-red-500/10 border-red-500/30" },
    ],
  },
];

const mockEntities = {
  symptoms: [
    { name: "headaches", code: "25064002", confidence: 94 },
    { name: "chest pain", code: "29857009", confidence: 91 },
    { name: "shortness of breath", code: "267036007", confidence: 90 },
    { name: "vision changes", code: "63102001", confidence: 88 },
    { name: "blurry vision", code: "111516008", confidence: 92 },
  ],
  medications: [
    { name: "Lisinopril 10mg", code: "314076", confidence: 99 },
  ],
  vitalSigns: [
    { name: "blood pressure readings", code: "85354-9", confidence: 97 },
    { name: "155 over 95", code: "85354-9", confidence: 96 },
    { name: "148 over 92", code: "85354-9", confidence: 99 },
    { name: "heart rate 82", code: "8867-4", confidence: 99 },
    { name: "SpO2 97 percent", code: "2708-6", confidence: 99 },
  ],
};

type Screen = "consent" | "recording";

const AmbientListening = ({ individualName, onBack }: AmbientListeningProps) => {
  const [screen, setScreen] = useState<Screen>("consent");
  const [consentChecked, setConsentChecked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [visibleEntries, setVisibleEntries] = useState(0);
  const [activeTab, setActiveTab] = useState<"entities" | "suggestions" | "draft">("entities");
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (screen !== "recording" || isPaused) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [screen, isPaused]);

  // Simulate transcript entries appearing
  useEffect(() => {
    if (screen !== "recording" || isPaused) return;
    if (visibleEntries >= mockTranscript.length) return;
    const timeout = setTimeout(() => {
      setVisibleEntries((v) => v + 1);
      if (transcriptRef.current) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [screen, isPaused, visibleEntries]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const initials = individualName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  if (screen === "consent") {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <header className="h-14 flex items-center gap-3 px-5 border-b border-border shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </button>
          <div className="w-px h-6 bg-border" />
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{individualName}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-muted-foreground text-xs">
            <Lock className="w-3.5 h-3.5" />
            Encrypted
          </div>
        </header>

        {/* Consent Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center max-w-lg"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Waves className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Ambient Listening</h1>
            <p className="text-muted-foreground text-center mb-8">
              Capture the encounter and automatically generate structured documentation.
            </p>

            <div className="w-full rounded-xl border border-border p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Recording Consent Required</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    This encounter will be recorded for documentation purposes. The recording will be
                    processed by AI to generate a draft note. All data is encrypted and processed in
                    compliance with HIPAA regulations.
                  </p>
                </div>
              </div>

              <div className="border-t border-border my-4" />

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground">
                  Individual has been informed and consents to ambient recording for documentation purposes.
                </span>
              </label>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
                <Lock className="w-3 h-3" />
                PHI minimization · End-to-end encryption · Auto-delete after processing
              </div>
            </div>

            <button
              disabled={!consentChecked}
              onClick={() => {
                setScreen("recording");
                setVisibleEntries(1);
              }}
              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <Mic className="w-4 h-4" />
              Start Recording
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Recording screen
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="h-14 flex items-center gap-3 px-5 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </button>
        <div className="w-px h-6 bg-border" />
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{individualName}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            Recording {formatTime(elapsedSeconds)}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Lock className="w-3.5 h-3.5" />
            Encrypted
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Transcript */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="px-5 py-3 border-b border-border flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Activity className="w-4 h-4 text-primary" />
              Live Transcript
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {visibleEntries} segments
            </span>
          </div>

          <div ref={transcriptRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <AnimatePresence>
              {mockTranscript.slice(0, visibleEntries).map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      entry.role === "case_manager"
                        ? "bg-primary/10 text-primary"
                        : "bg-orange-500/10 text-orange-600"
                    }`}
                  >
                    {entry.role === "case_manager" ? "CM" : "In"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.role === "case_manager" ? entry.name : individualName}
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.time}</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{entry.text}</p>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {entry.tags.map((tag, j) => (
                          <span
                            key={j}
                            className={`text-xs px-2 py-0.5 rounded-full border ${tag.color}`}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!isPaused && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Activity className="w-4 h-4 animate-pulse" />
                Listening...
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-center gap-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop & Process
            </button>
          </div>
        </div>

        {/* Right: Entities panel */}
        <div className="w-[360px] shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b border-border flex gap-1">
            {(["entities", "suggestions", "draft"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "entities" ? "Entities" : tab === "suggestions" ? "Suggestions" : "Draft Note"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {activeTab === "entities" && (
              <>
                {/* Symptoms */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold text-sm text-foreground">Symptom</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-medium text-muted-foreground">
                        {mockEntities.symptoms.length}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">SNOMED CT</span>
                  </div>
                  <div className="space-y-2">
                    {mockEntities.symptoms.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{e.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{e.code}</span>
                          <span className="text-green-500 text-xs font-medium">{e.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medications */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-sm text-foreground">Medication</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-medium text-muted-foreground">
                        {mockEntities.medications.length}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">RxNorm</span>
                  </div>
                  <div className="space-y-2">
                    {mockEntities.medications.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{e.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{e.code}</span>
                          <span className="text-green-500 text-xs font-medium">{e.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vital Signs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm text-foreground">Vital Sign</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-medium text-muted-foreground">
                        {mockEntities.vitalSigns.length}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">LOINC/UCUM</span>
                  </div>
                  <div className="space-y-2">
                    {mockEntities.vitalSigns.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{e.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{e.code}</span>
                          <span className="text-green-500 text-xs font-medium">{e.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "suggestions" && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Suggestions will appear as the conversation progresses.
              </div>
            )}

            {activeTab === "draft" && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Draft note will be generated when recording is stopped.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbientListening;
