import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  Mic,
  FileUp,
  ClipboardPaste,
  Music,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Printer,
  X,
  Plus,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useTeamMeetings,
  updateTeamMeeting,
  MEETING_TYPE_LABELS,
  MEETING_LOCATION_LABELS,
  type TeamMeeting,
  type TranscriptSource,
} from "@/hooks/useTeamMeetings";
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Scribe = the same real Deepgram live-transcription flow used by the home page Scribe button.
const ScribeFlow = lazy(() => import("@/components/ambient/AmbientFlowV2"));

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

const EXTRACTION_PROMPT = (transcriptText: string) => `
You are analyzing a team meeting transcript for a care management system.

Transcript:
${transcriptText}

Extract the following as JSON:
{
  "attendeesConfirmed": [{"name": "", "role": "", "organization": ""}],
  "agendaItemsCovered": [""],
  "decisions": [{"decision": "", "madeBy": ""}],
  "actionItems": [{"description": "", "assignedTo": "", "assignedToRole": "", "dueDate": "", "priority": "high|medium|low", "relatedGoal": ""}],
  "planChangesDiscussed": [{"changeType": "new_goal|modify_goal|new_service|other", "description": "", "requiresAmendment": true}],
  "complianceFlags": [{"flag": "", "severity": "urgent|warning|info", "suggestedAction": ""}],
  "nextMeetingDate": "",
  "nextMeetingType": "",
  "draftMinutesNarrative": "Two to four paragraph professional narrative summary..."
}

Return ONLY the JSON object.
`;

async function publishMeeting(
  meeting: TeamMeeting,
  checkedActionItems: any[],
  userProfile: any
): Promise<void> {
  const taskIds: string[] = [];

  for (const item of checkedActionItems) {
    const ref = await addDoc(collection(db, "tasks"), {
      title: item.description,
      assignedTo: userProfile.uid,
      assignedToName: item.assignedTo,
      individualId: meeting.individualId,
      individualName: meeting.individualName,
      dueDate: item.dueDate || "",
      priority: item.priority || "medium",
      status: "open",
      type: "Team Meeting",
      source: "team_meeting",
      sourceId: meeting.id,
      meetingType: meeting.meetingType,
      meetingDate: meeting.meetingDate,
      organizationId: meeting.organizationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    taskIds.push(ref.id);
  }

  await updateTeamMeeting(meeting.id, {
    status: "published",
    minutesPublishedAt: serverTimestamp() as any,
    minutesPublishedBy: userProfile.uid,
    minutesPublishedByName: userProfile.displayName,
    tasksCreated: taskIds,
  });

  await addDoc(collection(db, "audit_log"), {
    action: "team_meeting_published",
    targetId: meeting.id,
    individualId: meeting.individualId,
    actorId: userProfile.uid,
    actorName: userProfile.displayName,
    tasksCreated: taskIds.length,
    organizationId: meeting.organizationId,
    timestamp: serverTimestamp(),
  });
}

export default function TeamMeetingDetail() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [meeting, setMeeting] = useState<TeamMeeting | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch single meeting via onSnapshot
  useEffect(() => {
    if (!meetingId) return;
    const unsub = onSnapshot(doc(db, "team_meetings", meetingId), snap => {
      if (snap.exists()) {
        setMeeting({ id: snap.id, ...snap.data() } as TeamMeeting);
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [meetingId]);

  if (loading) {
    return (
      <ICMShell title="Team Meeting" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-2 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!meeting) {
    return (
      <ICMShell title="Team Meeting" showAIPanel={false}>
        <div className="text-center py-24 text-icm-text-dim text-[13px]">Meeting not found.</div>
      </ICMShell>
    );
  }

  const status = meeting.status;

  return (
    <ICMShell title="Team Meeting" showAIPanel={false}>
      <div className="space-y-5 max-w-4xl">
        {/* Back + breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/team-meetings")} className="hover:text-icm-text flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Team Meetings
          </button>
          <span className="text-icm-text-faint">›</span>
          <span className="text-icm-text">{meeting.individualName}</span>
        </nav>

        {/* Meeting header */}
        <MeetingHeader meeting={meeting} />

        {/* State router */}
        {(status === "scheduled" || status === "in_progress") && (
          <NoTranscriptState meeting={meeting} userProfile={userProfile} />
        )}
        {(status === "transcript_received" || status === "minutes_draft") && (
          <MinutesDraftState meeting={meeting} userProfile={userProfile} />
        )}
        {status === "published" && (
          <PublishedState meeting={meeting} />
        )}
      </div>
    </ICMShell>
  );
}

// ─── Meeting Header ───────────────────────────────────────────────────────────
function MeetingHeader({ meeting }: { meeting: TeamMeeting }) {
  function formatDate(ts: any) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    scheduled:           { label: "Scheduled",     cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
    in_progress:         { label: "In Progress",   cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    transcript_received: { label: "Processing…",  cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/30" },
    minutes_draft:       { label: "Needs Review", cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/30" },
    published:           { label: "Published ✓",  cls: "bg-icm-green-soft text-icm-green ring-icm-green/30" },
  };

  const badge = STATUS_BADGE[meeting.status] ?? { label: meeting.status, cls: "bg-icm-bg text-icm-text-dim ring-icm-border" };

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-[15px] font-manrope font-semibold text-icm-text">
              {MEETING_TYPE_LABELS[meeting.meetingType] ?? meeting.meetingType}
            </h1>
            <span className={`text-[11px] px-1.5 py-0.5 rounded ring-1 ${badge.cls}`}>{badge.label}</span>
          </div>
          <div className="text-[13px] font-medium text-icm-text mb-2">{meeting.individualName}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-icm-text-dim">
            <span>{formatDate(meeting.meetingDate)}</span>
            {meeting.startTime && <span>{meeting.startTime}{meeting.endTime ? `–${meeting.endTime}` : ""}</span>}
            {meeting.location && <span>{MEETING_LOCATION_LABELS[meeting.location]}</span>}
            {meeting.locationDetail && <span>{meeting.locationDetail}</span>}
          </div>
        </div>
      </div>

      {/* Attendees */}
      {meeting.attendees && meeting.attendees.length > 0 && (
        <div className="mt-3 pt-3 border-t border-icm-border">
          <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-1.5">Attendees</div>
          <div className="flex flex-wrap gap-1.5">
            {meeting.attendees.map((a: any, i: number) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-icm-bg ring-1 ring-icm-border text-icm-text">
                {a.name}{a.role ? ` · ${a.role}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Agenda */}
      {meeting.agenda && (
        <div className="mt-3 pt-3 border-t border-icm-border">
          <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-1">Agenda</div>
          <pre className="text-[12px] text-icm-text whitespace-pre-wrap font-geist">{meeting.agenda}</pre>
        </div>
      )}
    </div>
  );
}

// ─── State A: No Transcript ───────────────────────────────────────────────────
function NoTranscriptState({ meeting, userProfile }: { meeting: TeamMeeting; userProfile: any }) {
  const [activeTab, setActiveTab] = useState<"paste" | "file" | "audio" | null>(null);
  const [consent, setConsent] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showAmbient, setShowAmbient] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  async function processTranscript(text: string, source: TranscriptSource) {
    if (!consent) { toast.error("Please acknowledge participant consent first."); return; }
    if (!text.trim()) { toast.error("Transcript cannot be empty."); return; }
    setProcessing(true);
    try {
      // Save transcript and set status to transcript_received
      await updateTeamMeeting(meeting.id, {
        transcriptText: text,
        transcriptSource: source,
        status: "transcript_received",
        consentAcknowledged: true,
        consentAcknowledgedBy: userProfile?.uid,
        consentAcknowledgedAt: serverTimestamp() as any,
      });
      toast.info("Transcript saved. Running AI extraction…");

      // Call Gemini proxy
      const resp = await fetch(`${FUNCTIONS_BASE}/api/gemini-proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: EXTRACTION_PROMPT(text),
        }),
      });

      if (!resp.ok) throw new Error(`AI proxy error: ${resp.status}`);
      const raw = await resp.text();

      // Parse JSON from response
      let extracted: any = {};
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
      } catch {
        toast.warning("AI extraction partial — please review manually.");
      }

      await updateTeamMeeting(meeting.id, {
        attendees: extracted.attendeesConfirmed ?? meeting.attendees ?? [],
        agendaItemsCovered: extracted.agendaItemsCovered ?? [],
        decisions: extracted.decisions ?? [],
        actionItems: extracted.actionItems ?? [],
        planChangesDiscussed: extracted.planChangesDiscussed ?? [],
        complianceFlags: extracted.complianceFlags ?? [],
        nextMeetingDate: extracted.nextMeetingDate || undefined,
        nextMeetingType: extracted.nextMeetingType || undefined,
        minutesNarrative: extracted.draftMinutesNarrative ?? "",
        transcriptProcessedAt: serverTimestamp() as any,
        status: "minutes_draft",
      });
      toast.success("AI extraction complete — please review the draft minutes.");
    } catch (err) {
      console.error(err);
      toast.error("AI extraction failed — transcript saved, please continue manually.");
      await updateTeamMeeting(meeting.id, { status: "minutes_draft" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>, source: TranscriptSource) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    // VTT: strip cue headers
    if (file.name.endsWith(".vtt")) {
      const plain = text
        .replace(/WEBVTT.*\n/g, "")
        .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\n/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();
      await processTranscript(plain, source);
    } else {
      await processTranscript(text, source);
    }
  }

  return (
    <>
    {/* Scribe session — the same real Deepgram live-transcription flow as the home page */}
    {showAmbient && (
      <Suspense fallback={
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center gap-2 text-icm-text-dim">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-[13px]">Loading scribe session…</span>
        </div>
      }>
        <ScribeFlow
          defaultIndividualId={meeting.individualId}
          defaultIndividualName={meeting.individualName}
          onClose={() => setShowAmbient(false)}
        />
      </Suspense>
    )}

    <div className="space-y-4">
      {/* Consent checkbox */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded"
          />
          <div>
            <div className="text-[12.5px] font-medium text-icm-text">Consent Acknowledgment</div>
            <div className="text-[11.5px] text-icm-text-dim mt-0.5">
              I confirm that all meeting participants have been informed of and consented to recording or
              transcription of this meeting, in accordance with applicable state and federal laws.
            </div>
          </div>
        </label>
      </div>

      {/* Source options */}
      <div className="text-[13px] font-medium text-icm-text">Add transcript or recording</div>

      <div className="grid grid-cols-2 gap-3">
        {/* Ambient */}
        <div className={`rounded-xl border p-4 ${!consent ? "opacity-50" : "hover:border-icm-accent/40"} border-icm-border bg-icm-panel`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Mic className="w-4 h-4 text-icm-accent" />
            <span className="text-[12.5px] font-medium text-icm-text">Scribe</span>
          </div>
          <p className="text-[11.5px] text-icm-text-dim mb-3">Turn on the AI Scribe to listen and transcribe the meeting live.</p>
          <button
            disabled={!consent}
            onClick={() => setShowAmbient(true)}
            className="text-[11.5px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90 disabled:opacity-40"
          >
            Start Scribe
          </button>
        </div>

        {/* File upload */}
        <div className={`rounded-xl border p-4 ${!consent ? "opacity-50" : "hover:border-icm-accent/40 cursor-pointer"} border-icm-border bg-icm-panel`}>
          <div className="flex items-center gap-2 mb-1.5">
            <FileUp className="w-4 h-4 text-icm-accent" />
            <span className="text-[12.5px] font-medium text-icm-text">Upload Transcript File</span>
          </div>
          <p className="text-[11.5px] text-icm-text-dim mb-3">Upload a .vtt, .txt, .docx, or .pdf transcript file.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".vtt,.txt,.docx,.pdf"
            className="sr-only"
            onChange={e => handleFileInput(e, "file_upload")}
          />
          <button
            disabled={!consent || processing}
            onClick={() => fileRef.current?.click()}
            className="text-[11.5px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90 disabled:opacity-40 flex items-center gap-1.5"
          >
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Choose File
          </button>
        </div>

        {/* Paste */}
        <div
          className={`rounded-xl border p-4 col-span-2 ${!consent ? "opacity-50" : ""} border-icm-border bg-icm-panel`}
          onClick={() => consent && setActiveTab(activeTab === "paste" ? null : "paste")}
        >
          <div className="flex items-center gap-2 mb-1.5 cursor-pointer">
            <ClipboardPaste className="w-4 h-4 text-icm-accent" />
            <span className="text-[12.5px] font-medium text-icm-text">Paste Transcript</span>
          </div>
          {activeTab === "paste" && (
            <div className="space-y-2 mt-2" onClick={e => e.stopPropagation()}>
              <textarea
                rows={6}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste meeting transcript here…"
                className="w-full text-[12px] px-2.5 py-2 rounded-md border border-icm-border bg-white focus:outline-none focus:ring-1 focus:ring-icm-accent"
              />
              <button
                disabled={!pastedText.trim() || processing}
                onClick={() => processTranscript(pastedText, "manual_paste")}
                className="text-[11.5px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90 disabled:opacity-40 flex items-center gap-1.5"
              >
                {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Process Transcript
              </button>
            </div>
          )}
          {activeTab !== "paste" && (
            <p className="text-[11.5px] text-icm-text-dim">Click to expand and paste transcript text.</p>
          )}
        </div>

        {/* Audio upload */}
        <div className={`rounded-xl border p-4 col-span-2 ${!consent ? "opacity-50" : ""} border-icm-border bg-icm-panel`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Music className="w-4 h-4 text-icm-accent" />
            <span className="text-[12.5px] font-medium text-icm-text">Upload Audio File</span>
          </div>
          <p className="text-[11.5px] text-icm-text-dim mb-2">Upload .mp3, .mp4, .m4a, or .wav. Audio will be transcribed automatically.</p>
          <input
            ref={audioRef}
            type="file"
            accept=".mp3,.mp4,.m4a,.wav"
            className="sr-only"
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              toast.info("Audio transcription coming soon — please use file upload or paste transcript instead.");
            }}
          />
          <button
            disabled={!consent}
            onClick={() => audioRef.current?.click()}
            className="text-[11.5px] px-3 py-1.5 rounded-md border border-icm-border text-icm-text hover:bg-icm-bg disabled:opacity-40"
          >
            Choose Audio File
          </button>
        </div>
      </div>

      {processing && (
        <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft/30 p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-icm-amber animate-spin" />
          <span className="text-[12.5px] text-icm-text">AI is analyzing the transcript and extracting meeting data…</span>
        </div>
      )}
    </div>
    </>
  );
}

// ─── State B: Draft Review ────────────────────────────────────────────────────
function MinutesDraftState({ meeting, userProfile }: { meeting: TeamMeeting; userProfile: any }) {
  const [attendees, setAttendees] = useState<any[]>(meeting.attendees ?? []);
  const [decisions, setDecisions] = useState<any[]>(meeting.decisions ?? []);
  const [actionItems, setActionItems] = useState<any[]>(meeting.actionItems ?? []);
  const [planChanges, setPlanChanges] = useState<any[]>(meeting.planChangesDiscussed ?? []);
  const [narrative, setNarrative] = useState(meeting.minutesNarrative ?? "");
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set(actionItems.map((_, i) => i)));
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await updateTeamMeeting(meeting.id, {
        attendees,
        decisions,
        actionItems,
        planChangesDiscussed: planChanges,
        minutesNarrative: narrative,
      });
      toast.success("Draft saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    try {
      const checked = actionItems.filter((_, i) => checkedItems.has(i));
      await updateTeamMeeting(meeting.id, {
        attendees,
        decisions,
        actionItems,
        planChangesDiscussed: planChanges,
        minutesNarrative: narrative,
      });
      await publishMeeting(meeting, checked, userProfile);
      toast.success(`Meeting published · ${checked.length} task${checked.length !== 1 ? "s" : ""} created in My Work`);
      setShowPublishConfirm(false);
    } catch (err) {
      console.error(err);
      toast.error("Publish failed");
    } finally {
      setSaving(false);
    }
  }

  const PRIORITY_COLORS: Record<string, string> = {
    high: "text-icm-red",
    medium: "text-icm-amber",
    low: "text-icm-text-dim",
  };

  return (
    <div className="space-y-4">
      {/* Compliance flags */}
      {meeting.complianceFlags && meeting.complianceFlags.length > 0 && (
        <div className="rounded-xl border border-icm-red/20 bg-icm-red/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-icm-red" />
            <span className="text-[12.5px] font-medium text-icm-text">Compliance Flags ({meeting.complianceFlags.length})</span>
          </div>
          <div className="space-y-2">
            {meeting.complianceFlags.map((flag: any, i: number) => (
              <div key={i} className={`rounded-lg p-3 border ${
                flag.severity === "urgent" ? "border-icm-red/30 bg-icm-red/5" :
                flag.severity === "warning" ? "border-icm-amber/30 bg-icm-amber-soft/30" :
                "border-icm-border bg-icm-bg"
              }`}>
                <div className="text-[12px] font-medium text-icm-text">{flag.flag}</div>
                {flag.suggestedAction && (
                  <div className="text-[11.5px] text-icm-text-dim mt-0.5">→ {flag.suggestedAction}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendees */}
      <Section title="Attendees">
        <div className="space-y-1.5">
          {attendees.map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={a.name ?? ""}
                onChange={e => setAttendees(arr => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                placeholder="Name"
              />
              <input
                value={a.role ?? ""}
                onChange={e => setAttendees(arr => arr.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                placeholder="Role"
              />
              <button onClick={() => setAttendees(arr => arr.filter((_, j) => j !== i))} className="text-icm-text-dim hover:text-icm-red">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setAttendees(arr => [...arr, { name: "", role: "", organization: "" }])}
            className="text-[11.5px] text-icm-accent hover:underline"
          >
            + Add attendee
          </button>
        </div>
      </Section>

      {/* Decisions */}
      <Section title="Decisions Made">
        <div className="space-y-1.5">
          {decisions.map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={d.decision ?? ""}
                onChange={e => setDecisions(arr => arr.map((x, j) => j === i ? { ...x, decision: e.target.value } : x))}
                className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                placeholder="Decision…"
              />
              <input
                value={d.madeBy ?? ""}
                onChange={e => setDecisions(arr => arr.map((x, j) => j === i ? { ...x, madeBy: e.target.value } : x))}
                className="w-36 text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                placeholder="Made by"
              />
              <button onClick={() => setDecisions(arr => arr.filter((_, j) => j !== i))} className="text-icm-text-dim hover:text-icm-red">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setDecisions(arr => [...arr, { decision: "", madeBy: "" }])}
            className="text-[11.5px] text-icm-accent hover:underline"
          >
            + Add decision
          </button>
        </div>
      </Section>

      {/* Action items */}
      <Section title="Action Items (select to create My Work tasks on publish)">
        <div className="space-y-2">
          {actionItems.map((item: any, i: number) => (
            <div key={i} className="rounded-lg border border-icm-border bg-white p-3">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => setCheckedItems(s => {
                    const next = new Set(s);
                    next.has(i) ? next.delete(i) : next.add(i);
                    return next;
                  })}
                  className="mt-0.5 text-icm-text-dim"
                >
                  {checkedItems.has(i)
                    ? <CheckSquare className="w-4 h-4 text-icm-accent" />
                    : <Square className="w-4 h-4" />
                  }
                </button>
                <div className="flex-1 space-y-1.5">
                  <input
                    value={item.description ?? ""}
                    onChange={e => setActionItems(arr => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                    placeholder="Action description…"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      value={item.assignedTo ?? ""}
                      onChange={e => setActionItems(arr => arr.map((x, j) => j === i ? { ...x, assignedTo: e.target.value } : x))}
                      className="text-[11.5px] px-2 py-1 rounded-md border border-icm-border bg-white"
                      placeholder="Assigned to"
                    />
                    <input
                      type="date"
                      value={item.dueDate ?? ""}
                      onChange={e => setActionItems(arr => arr.map((x, j) => j === i ? { ...x, dueDate: e.target.value } : x))}
                      className="text-[11.5px] px-2 py-1 rounded-md border border-icm-border bg-white"
                    />
                    <select
                      value={item.priority ?? "medium"}
                      onChange={e => setActionItems(arr => arr.map((x, j) => j === i ? { ...x, priority: e.target.value } : x))}
                      className={`text-[11.5px] px-2 py-1 rounded-md border border-icm-border bg-white ${PRIORITY_COLORS[item.priority ?? "medium"]}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => {
                  setActionItems(arr => arr.filter((_, j) => j !== i));
                  setCheckedItems(s => {
                    const next = new Set<number>();
                    s.forEach(v => v < i ? next.add(v) : v > i ? next.add(v - 1) : null);
                    return next;
                  });
                }} className="text-icm-text-dim hover:text-icm-red mt-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setActionItems(arr => [...arr, { description: "", assignedTo: "", dueDate: "", priority: "medium" }]);
              setCheckedItems(s => new Set([...s, actionItems.length]));
            }}
            className="text-[11.5px] text-icm-accent hover:underline"
          >
            + Add action item
          </button>
        </div>
      </Section>

      {/* Plan changes */}
      {planChanges.length > 0 && (
        <Section title="Plan Changes Discussed">
          <div className="space-y-2">
            {planChanges.map((pc: any, i: number) => (
              <div key={i} className="rounded-lg border border-icm-amber/30 bg-icm-amber-soft/20 p-3 text-[12px]">
                <div className="font-medium text-icm-text">{pc.description}</div>
                <div className="text-icm-text-dim mt-0.5">
                  Type: {pc.changeType?.replace(/_/g, " ")}
                  {pc.requiresAmendment && " · Requires care plan amendment"}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Narrative */}
      <Section title="Meeting Minutes Narrative">
        <textarea
          rows={6}
          value={narrative}
          onChange={e => setNarrative(e.target.value)}
          className="w-full text-[12.5px] px-2.5 py-2 rounded-md border border-icm-border bg-white focus:outline-none focus:ring-1 focus:ring-icm-accent"
          placeholder="Professional narrative summary of the meeting…"
        />
      </Section>

      {/* Next meeting */}
      {(meeting.nextMeetingDate || meeting.nextMeetingType) && (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
          <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-1">Next Meeting Suggested</div>
          <div className="text-[12.5px] text-icm-text">
            {meeting.nextMeetingType && <span>{MEETING_TYPE_LABELS[meeting.nextMeetingType as any] ?? meeting.nextMeetingType}</span>}
            {meeting.nextMeetingDate && (
              <span className="text-icm-text-dim ml-2">
                · {meeting.nextMeetingDate?.toDate?.()?.toLocaleDateString?.() ?? meeting.nextMeetingDate}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-icm-border">
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="text-[12px] px-3 py-1.5 rounded-md border border-icm-border text-icm-text hover:bg-icm-bg disabled:opacity-60 flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Draft
        </button>
        <button
          onClick={() => setShowPublishConfirm(true)}
          className="text-[12px] px-4 py-1.5 rounded-md bg-icm-green text-white hover:bg-icm-green/90"
        >
          Sign & Publish →
        </button>
      </div>

      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-icm-green" />
              <h2 className="text-[14px] font-medium text-icm-text">Publish Meeting Minutes</h2>
            </div>
            <p className="text-[12.5px] text-icm-text-dim mb-4">
              This will publish the meeting minutes and create <strong>{checkedItems.size}</strong> My Work
              task{checkedItems.size !== 1 ? "s" : ""} from the checked action items. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="text-[12px] px-3 py-1.5 text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="text-[12px] px-4 py-1.5 rounded-md bg-icm-green text-white hover:bg-icm-green/90 disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── State C: Published ───────────────────────────────────────────────────────
function PublishedState({ meeting }: { meeting: TeamMeeting }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-icm-green">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[12.5px] font-medium">
            Published by {meeting.minutesPublishedByName ?? "—"} on{" "}
            {meeting.minutesPublishedAt?.toDate?.()?.toLocaleDateString?.() ?? "—"}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-icm-border text-icm-text hover:bg-icm-bg"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>

      {/* Narrative */}
      {meeting.minutesNarrative && (
        <Section title="Meeting Minutes">
          <div className="text-[12.5px] text-icm-text whitespace-pre-wrap leading-relaxed">{meeting.minutesNarrative}</div>
        </Section>
      )}

      {/* Decisions */}
      {meeting.decisions && meeting.decisions.length > 0 && (
        <Section title="Decisions">
          <ul className="space-y-1">
            {meeting.decisions.map((d: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-icm-text">
                <Circle className="w-3 h-3 mt-0.5 text-icm-text-dim shrink-0" />
                <span>{d.decision} {d.madeBy && <span className="text-icm-text-dim">— {d.madeBy}</span>}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Action items */}
      {meeting.actionItems && meeting.actionItems.length > 0 && (
        <Section title={`Action Items (${meeting.actionItems.length})`}>
          <div className="space-y-2">
            {meeting.actionItems.map((item: any, i: number) => (
              <div key={i} className="rounded-lg border border-icm-border bg-white p-3">
                <div className="text-[12.5px] font-medium text-icm-text">{item.description}</div>
                <div className="text-[11.5px] text-icm-text-dim mt-0.5 flex gap-3 flex-wrap">
                  {item.assignedTo && <span>Assigned: {item.assignedTo}</span>}
                  {item.dueDate && <span>Due: {item.dueDate}</span>}
                  {item.priority && <span className={`capitalize font-medium ${
                    item.priority === "high" ? "text-icm-red" : item.priority === "medium" ? "text-icm-amber" : "text-icm-text-dim"
                  }`}>{item.priority}</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Compliance flags */}
      {meeting.complianceFlags && meeting.complianceFlags.length > 0 && (
        <Section title="Compliance Flags">
          <div className="space-y-2">
            {meeting.complianceFlags.map((flag: any, i: number) => (
              <div key={i} className="rounded-lg border border-icm-amber/30 bg-icm-amber-soft/20 p-3 text-[12px]">
                <div className="font-medium text-icm-text">{flag.flag}</div>
                {flag.suggestedAction && <div className="text-icm-text-dim mt-0.5">→ {flag.suggestedAction}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Tasks created */}
      {meeting.tasksCreated && meeting.tasksCreated.length > 0 && (
        <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft/30 p-4 text-[12.5px] text-icm-text">
          <CheckCircle2 className="w-4 h-4 text-icm-green inline mr-1.5 -mt-0.5" />
          {meeting.tasksCreated.length} My Work task{meeting.tasksCreated.length !== 1 ? "s" : ""} were created from this meeting's action items.
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-3">{title}</div>
      {children}
    </div>
  );
}
