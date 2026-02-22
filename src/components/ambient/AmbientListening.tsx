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
  AlertTriangle,
  HeartPulse,
  Play,
  Users,
  Briefcase,
  ClipboardList,
  BarChart3,
  FileWarning,
  Home,
  ChevronRight,
  CheckCircle2,
  FileText,
  Clock,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AmbientListeningProps {
  individualName: string;
  onBack: () => void;
}

interface TranscriptEntry {
  role: "case_manager" | "individual" | "guardian" | "provider";
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
    text: "Good morning. Thanks for meeting with me today. How have things been going since our last visit?",
    tags: [],
  },
  {
    role: "individual",
    name: "Individual",
    time: "00:06",
    text: "Things have been okay. My PCS aide has been coming regularly, but I missed Day Hab twice last week because of transportation issues.",
    tags: [
      { label: "PCS", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
      { label: "Day Habilitation", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
      { label: "transportation issues", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
    ],
  },
  {
    role: "case_manager",
    name: "Kathy",
    time: "00:18",
    text: "I'm sorry to hear that. Let me note that. Are the transportation issues ongoing, or was it just last week?",
    tags: [],
  },
  {
    role: "individual",
    name: "Individual",
    time: "00:24",
    text: "It's been happening more often. The van service has been unreliable. Sometimes they just don't show up.",
    tags: [
      { label: "transportation barrier", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
    ],
  },
  {
    role: "case_manager",
    name: "Kathy",
    time: "00:32",
    text: "Okay, I'll flag that as a barrier. Let's also talk about your goals. Your PCP has a goal around community integration through Day Hab. How do you feel about your progress there?",
    tags: [
      { label: "PCP goal", color: "text-primary bg-primary/10 border-primary/30" },
      { label: "community integration", color: "text-primary bg-primary/10 border-primary/30" },
    ],
  },
  {
    role: "individual",
    name: "Individual",
    time: "00:44",
    text: "I like going when I can get there. I've been wanting to try the supported employment program too. My friend does it and says it's good.",
    tags: [
      { label: "supported employment", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
      { label: "new service interest", color: "text-green-500 bg-green-500/10 border-green-500/30" },
    ],
  },
  {
    role: "case_manager",
    name: "Kathy",
    time: "00:55",
    text: "That's great to hear. We'd need to add that to your plan. Your current authorization is at about 85% utilization for PCS, so let me check if we have room. Also, your LOC assessment is expiring next month — we'll need to get that renewed.",
    tags: [
      { label: "85% utilization", color: "text-red-500 bg-red-500/10 border-red-500/30" },
      { label: "LOC expiring", color: "text-red-500 bg-red-500/10 border-red-500/30" },
      { label: "service authorization", color: "text-primary bg-primary/10 border-primary/30" },
    ],
  },
  {
    role: "individual",
    name: "Individual",
    time: "01:10",
    text: "Oh okay. And I had a fall last week at home. I'm fine but my aide helped me up. I didn't go to the hospital or anything.",
    tags: [
      { label: "fall", color: "text-red-500 bg-red-500/10 border-red-500/30" },
      { label: "safety incident", color: "text-red-500 bg-red-500/10 border-red-500/30" },
    ],
  },
];

const mockEntities = {
  participants: [
    { name: "Kathy (Case Manager)", confidence: 99 },
    { name: "Individual (linked to iCM)", confidence: 99 },
  ],
  services: [
    { name: "Personal Care Services (PCS)", code: "H2015", confidence: 96 },
    { name: "Day Habilitation", code: "T2021", confidence: 94 },
    { name: "Supported Employment", code: "H2023", confidence: 88 },
  ],
  planItems: [
    { name: "Community integration goal discussed", confidence: 93 },
    { name: "Interest in Supported Employment — new service request", confidence: 88 },
    { name: "Schedule change needed (Day Hab missed)", confidence: 91 },
  ],
  utilization: [
    { name: "PCS authorization at 85% utilization", confidence: 95 },
    { name: "Cap threshold approaching (90% warning)", confidence: 90 },
  ],
  riskSafety: [
    { name: "Fall reported (no ER visit)", confidence: 94 },
    { name: "Supervision concern — aide present", confidence: 87 },
  ],
  assessments: [
    { name: "LOC assessment expiring next month", confidence: 96 },
    { name: "Renewal task needed", confidence: 92 },
  ],
  barriers: [
    { name: "Transportation — van service unreliable", confidence: 97 },
    { name: "Missed Day Hab due to no-show transport", confidence: 95 },
  ],
};

const mockSuggestions = [
  {
    action: "Create Service Authorization Draft",
    module: "Service Authorization",
    explanation: "Individual expressed interest in Supported Employment. A new authorization may be needed.",
  },
  {
    action: "Draft PCP Addendum",
    module: "PCP / ISP",
    explanation: "Add Supported Employment interest language and update community integration goal.",
  },
  {
    action: "Schedule ISP Review",
    module: "Workflow Manager",
    explanation: "Service changes discussed require ISP team review before implementation.",
  },
  {
    action: "Create LOC Renewal Task",
    module: "Assessments",
    explanation: "LOC assessment expires next month. Renewal must be scheduled.",
  },
  {
    action: "Flag Transportation Barrier",
    module: "Care Coordination",
    explanation: "Recurring transportation no-shows causing missed Day Hab sessions.",
  },
  {
    action: "Log Safety Incident",
    module: "Incident Reporting",
    explanation: "Individual reported a fall at home. No ER visit but should be documented.",
  },
  {
    action: "Trigger Cap Utilization Warning",
    module: "Utilization",
    explanation: "PCS utilization at 85%, approaching 90% cap threshold.",
  },
];

const sessionTypes = [
  "Family Call",
  "Provider Call",
  "Individual Meeting",
  "Team Meeting",
  "Other",
] as const;

type SessionType = (typeof sessionTypes)[number];

const draftTemplates: Record<SessionType, { title: string; module: string; fields: string[] }> = {
  "Family Call": {
    title: "Case Management Contact Note (Draft)",
    module: "Contact Notes",
    fields: [
      "Contact Type: Family Call",
      "Participants: Kathy (CM), Individual",
      "Reason for Contact: Routine check-in, service review",
      "Summary: Discussed PCS attendance, Day Hab transportation barriers, interest in Supported Employment, fall incident, LOC renewal timeline.",
      "Plan/Service Changes: Supported Employment exploration, transportation barrier resolution needed.",
      "Compliance Implications: LOC expiring — renewal required. PCS cap approaching 90%.",
      "Action Items: Schedule LOC renewal, draft PCP addendum for SE interest, flag transport barrier.",
      "Next Steps: Follow up in 2 weeks on transportation resolution and LOC scheduling.",
    ],
  },
  "Provider Call": {
    title: "Care Coordination Note (Draft)",
    module: "Care Coordination",
    fields: [
      "Service Delivery Summary: PCS aide attending regularly. Day Hab missed 2x due to transportation.",
      "Attendance/Schedule Notes: Transportation no-shows impacting Day Hab attendance.",
      "Incident Discussion: Individual reported fall at home — no ER visit, aide assisted.",
      "Compliance & Utilization Review: PCS at 85% utilization. LOC expiring next month.",
      "Required Actions: Resolve transportation, schedule LOC renewal, explore SE authorization.",
    ],
  },
  "Individual Meeting": {
    title: "Progress Note (Draft)",
    module: "Progress Notes",
    fields: [
      "Individual Report: Individual reports satisfaction with PCS but frustration with Day Hab transportation.",
      "Goal Review: Community integration goal impacted by missed sessions. Interest in Supported Employment.",
      "Health & Safety: Fall reported at home — no injury, no ER visit. Aide provided assistance.",
      "Service Satisfaction: Positive about PCS aide. Wants to explore employment services.",
      "Compliance Impact: LOC renewal needed. Authorization utilization nearing cap.",
      "Follow-Up: Transportation barrier resolution, LOC scheduling, SE interest to ISP team.",
    ],
  },
  "Team Meeting": {
    title: "Team Meeting Note (Draft)",
    module: "Case Notes",
    fields: [
      "Attendees: Kathy (CM), Individual",
      "Topics Discussed: Service delivery, transportation barriers, new service interest, safety incident, compliance timelines.",
      "Decisions Made: Pending — requires ISP team input.",
      "Action Items: LOC renewal, PCP addendum, transportation follow-up, incident documentation.",
    ],
  },
  Other: {
    title: "General Session Note (Draft)",
    module: "Case Notes",
    fields: [
      "Session Summary: Discussion covered current services, barriers, safety, and compliance timelines.",
      "Key Topics: PCS, Day Hab, transportation, Supported Employment interest, fall incident, LOC renewal.",
      "Follow-Up Required: Multiple action items generated — see suggestions.",
    ],
  },
};

type Screen = "consent" | "recording";

const AmbientListening = ({ individualName, onBack }: AmbientListeningProps) => {
  const [screen, setScreen] = useState<Screen>("consent");
  const [consentChecked, setConsentChecked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [visibleEntries, setVisibleEntries] = useState(0);
  const [activeTab, setActiveTab] = useState<"entities" | "suggestions" | "draft">("entities");
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screen !== "recording" || isPaused) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [screen, isPaused]);

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

  const roleIcon = (role: string) => {
    switch (role) {
      case "case_manager": return "CM";
      case "guardian": return "GD";
      case "provider": return "PR";
      default: return "IN";
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "case_manager": return "bg-primary/10 text-primary";
      case "guardian": return "bg-emerald-500/10 text-emerald-600";
      case "provider": return "bg-violet-500/10 text-violet-600";
      default: return "bg-orange-500/10 text-orange-600";
    }
  };

  if (screen === "consent") {
    return (
      <div className="flex flex-col h-full bg-background">
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
                    Recording will be processed by AI to generate draft documentation. All data is
                    encrypted and processed in compliance with HIPAA regulations. PHI minimization
                    applied. Audio auto-deletes after processing.
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
                  Individual/guardian has been informed and consents to ambient recording for documentation purposes.
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
            Ambient ON — Recording {formatTime(elapsedSeconds)}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Lock className="w-3.5 h-3.5" />
            Encrypted
          </div>
        </div>
      </header>

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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${roleColor(entry.role)}`}
                  >
                    {roleIcon(entry.role)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.role === "individual" ? individualName : entry.name}
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

        {/* Right: Structured Output */}
        <div className="w-[380px] shrink-0 flex flex-col">
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

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {activeTab === "entities" && (
              <>
                <EntitySection
                  icon={<Users className="w-4 h-4 text-primary" />}
                  title="Participants"
                  items={mockEntities.participants.map((e) => ({ name: e.name, detail: "", confidence: e.confidence }))}
                />
                <EntitySection
                  icon={<Briefcase className="w-4 h-4 text-blue-500" />}
                  title="Services Mentioned"
                  codeLabel="HCPCS"
                  items={mockEntities.services.map((e) => ({ name: e.name, detail: e.code, confidence: e.confidence }))}
                />
                <EntitySection
                  icon={<ClipboardList className="w-4 h-4 text-primary" />}
                  title="Plan / PCP Items"
                  items={mockEntities.planItems.map((e) => ({ name: e.name, detail: "", confidence: e.confidence }))}
                />
                <EntitySection
                  icon={<BarChart3 className="w-4 h-4 text-red-500" />}
                  title="Utilization / Caps"
                  items={mockEntities.utilization.map((e) => ({ name: e.name, detail: "", confidence: e.confidence }))}
                />
                <EntitySection
                  icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                  title="Risk & Safety"
                  items={mockEntities.riskSafety.map((e) => ({ name: e.name, detail: "", confidence: e.confidence }))}
                />
                <EntitySection
                  icon={<FileWarning className="w-4 h-4 text-orange-500" />}
                  title="Assessments & Documentation"
                  items={mockEntities.assessments.map((e) => ({ name: e.name, detail: "", confidence: e.confidence }))}
                />
                <EntitySection
                  icon={<Home className="w-4 h-4 text-orange-500" />}
                  title="Barriers / SDoH"
                  items={mockEntities.barriers.map((e) => ({ name: e.name, detail: "", confidence: e.confidence }))}
                />
              </>
            )}

            {activeTab === "suggestions" && (
              <div className="space-y-3">
                {mockSuggestions.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{s.action}</p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-muted-foreground">{s.explanation}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                        {s.module}
                      </span>
                      <button className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Create Draft
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "draft" && (
              <div className="space-y-4">
                {!selectedSessionType ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Select Session Type</p>
                    <p className="text-xs text-muted-foreground">
                      Choose the type of encounter to generate the appropriate draft template.
                    </p>
                    <div className="space-y-2">
                      {sessionTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedSessionType(type)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            {type}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedSessionType(null)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Change type
                      </button>
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                        {draftTemplates[selectedSessionType].module}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">
                        {draftTemplates[selectedSessionType].title}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Generated via Ambient · {formatTime(elapsedSeconds)}
                      </div>
                      <div className="border-t border-border my-2" />
                      <div className="space-y-2">
                        {draftTemplates[selectedSessionType].fields.map((field, i) => {
                          const [label, ...rest] = field.split(": ");
                          const value = rest.join(": ");
                          return (
                            <div key={i} className="text-sm">
                              <span className="font-medium text-foreground">{label}</span>
                              {value && <span className="text-foreground/80">: {value}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Draft only — will not write to iCM until reviewed and applied.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable entity section component
function EntitySection({
  icon,
  title,
  codeLabel,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  codeLabel?: string;
  items: { name: string; detail: string; confidence: number }[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-medium text-muted-foreground">
            {items.length}
          </span>
        </div>
        {codeLabel && (
          <span className="text-[10px] text-muted-foreground font-medium">{codeLabel}</span>
        )}
      </div>
      <div className="space-y-2">
        {items.map((e, i) => (
          <div key={i} className="flex items-center justify-between text-sm gap-2">
            <span className="text-foreground text-xs leading-snug">{e.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {e.detail && <span className="text-muted-foreground text-xs">{e.detail}</span>}
              <span className="text-green-500 text-xs font-medium">{e.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AmbientListening;
