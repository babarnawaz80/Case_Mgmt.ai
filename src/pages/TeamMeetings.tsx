import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users2,
  Plus,
  Search,
  Calendar,
  Mic,
  FileUp,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Trash2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useTeamMeetings,
  createTeamMeeting,
  MEETING_TYPE_LABELS,
  MEETING_LOCATION_LABELS,
  type MeetingType,
  type MeetingLocation,
  type MeetingStatus,
} from "@/hooks/useTeamMeetings";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect } from "react";

type StatusFilter = "all" | "needs_action" | "published" | "scheduled";

const STATUS_BADGE: Record<MeetingStatus, { label: string; cls: string }> = {
  scheduled:           { label: "Scheduled",      cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
  in_progress:         { label: "In Progress",    cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  transcript_received: { label: "Processing…",   cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/30" },
  minutes_draft:       { label: "Needs Review",  cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/30" },
  published:           { label: "Published ✓",   cls: "bg-icm-green-soft text-icm-green ring-icm-green/30" },
};

export default function TeamMeetings() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { meetings, loading } = useTeamMeetings();

  const [search, setSearch] = useState("");
  const [filterIndividual, setFilterIndividual] = useState("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<StatusFilter>("all");
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Derive individual list from meetings for filter dropdown
  const individuals = Array.from(
    new Map(meetings.map(m => [m.individualId, m.individualName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const needsActionCount = meetings.filter(m => m.status === "minutes_draft").length;

  const filtered = meetings.filter(m => {
    if (search && !m.individualName.toLowerCase().includes(search.toLowerCase()) &&
        !MEETING_TYPE_LABELS[m.meetingType]?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterIndividual !== "all" && m.individualId !== filterIndividual) return false;
    if (filterType !== "all" && m.meetingType !== filterType) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (statusTab === "needs_action" && m.status !== "minutes_draft") return false;
    if (statusTab === "published" && m.status !== "published") return false;
    if (statusTab === "scheduled" && m.status !== "scheduled") return false;
    return true;
  });

  function formatDate(ts: any): string {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <ICMShell title="Team Meetings" showAIPanel={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-icm-text-dim" />
              <h1 className="text-lg font-manrope font-semibold text-icm-text">Team Meetings</h1>
            </div>
            <p className="text-[12px] text-icm-text-dim mt-0.5">
              AI-powered meeting minutes — schedule, transcribe, extract, and publish in one workflow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTranscript(true)}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-icm-border text-icm-text hover:bg-icm-bg"
            >
              <FileUp className="w-3.5 h-3.5" />
              Upload / Paste Transcript
            </button>
            <button
              onClick={() => setShowSchedule(true)}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Meeting
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border pb-0">
          {(
            [
              { key: "all" as StatusFilter, label: "All", count: meetings.length },
              { key: "needs_action" as StatusFilter, label: "Needs Action", count: needsActionCount },
              { key: "published" as StatusFilter, label: "Published", count: meetings.filter(m => m.status === "published").length },
              { key: "scheduled" as StatusFilter, label: "Scheduled", count: meetings.filter(m => m.status === "scheduled").length },
            ] as { key: StatusFilter; label: string; count: number }[]
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
                statusTab === tab.key
                  ? "border-icm-accent text-icm-accent"
                  : "border-transparent text-icm-text-dim hover:text-icm-text"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded-full ${
                  statusTab === tab.key ? "bg-icm-accent-soft text-icm-accent" : "bg-icm-bg text-icm-text-dim"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-dim" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meetings…"
              className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-md border border-icm-border bg-white focus:outline-none focus:ring-1 focus:ring-icm-accent"
            />
          </div>
          <select
            value={filterIndividual}
            onChange={e => setFilterIndividual(e.target.value)}
            className="text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
          >
            <option value="all">All Individuals</option>
            {individuals.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
          >
            <option value="all">All Types</option>
            {(Object.entries(MEETING_TYPE_LABELS) as [MeetingType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
          >
            <option value="all">All Statuses</option>
            {(Object.entries(STATUS_BADGE) as [MeetingStatus, { label: string; cls: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Meeting list */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-icm-text-dim">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px] font-geist">Loading meetings…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-12 text-center">
            <Users2 className="w-8 h-8 text-icm-text-dim mx-auto mb-2" />
            <div className="text-[13px] text-icm-text-dim">No meetings found.</div>
            <button
              onClick={() => setShowSchedule(true)}
              className="mt-3 text-[12px] text-icm-accent hover:underline"
            >
              Schedule your first meeting →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => {
              const badge = STATUS_BADGE[m.status];
              const actionCount = m.actionItems?.length ?? 0;
              const attendeeCount = m.attendees?.length ?? 0;
              const flagCount = m.complianceFlags?.length ?? 0;
              const isDraft = m.status === "minutes_draft";
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-icm-border bg-icm-panel hover:border-icm-accent/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/team-meetings/${m.id}`)}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-icm-text">{m.individualName}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded ring-1 bg-icm-accent-soft text-icm-accent ring-icm-accent/20">
                          {MEETING_TYPE_LABELS[m.meetingType] ?? m.meetingType}
                        </span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ring-1 ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {flagCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] text-icm-red">
                            <AlertTriangle className="w-3 h-3" />
                            {flagCount} flag{flagCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11.5px] text-icm-text-dim flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(m.meetingDate)} {m.startTime && `· ${m.startTime}`}
                        </span>
                        {m.location && (
                          <span>{MEETING_LOCATION_LABELS[m.location]}</span>
                        )}
                        {attendeeCount > 0 && (
                          <span>{attendeeCount} attendees</span>
                        )}
                        {actionCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {actionCount} action item{actionCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {m.transcriptSource && (
                          <span className="inline-flex items-center gap-1">
                            <Mic className="w-3 h-3" />
                            {m.transcriptSource === "ambient" ? "Ambient" :
                             m.transcriptSource === "file_upload" ? "File upload" :
                             m.transcriptSource === "manual_paste" ? "Pasted" : "Audio"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isDraft ? (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/team-meetings/${m.id}`); }}
                          className="text-[11.5px] px-2.5 py-1.5 rounded-md bg-icm-amber text-white hover:bg-icm-amber/90 font-medium"
                        >
                          Review & Publish →
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/team-meetings/${m.id}`); }}
                          className="text-[11.5px] px-2.5 py-1.5 rounded-md border border-icm-border text-icm-text-dim hover:text-icm-text"
                        >
                          View →
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-icm-text-dim" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSchedule && (
        <ScheduleMeetingModal
          onClose={() => setShowSchedule(false)}
          onCreated={id => { setShowSchedule(false); navigate(`/team-meetings/${id}`); }}
          userProfile={userProfile}
        />
      )}

      {showTranscript && (
        <QuickTranscriptModal
          onClose={() => setShowTranscript(false)}
          meetings={meetings}
          onNavigate={id => { setShowTranscript(false); navigate(`/team-meetings/${id}`); }}
        />
      )}
    </ICMShell>
  );
}

// ─── Schedule Meeting Modal ───────────────────────────────────────────────────

interface Individual {
  id: string;
  first_name: string;
  last_name: string;
  organizationId: string;
}

function ScheduleMeetingModal({
  onClose,
  onCreated,
  userProfile,
  prefillIndividualId,
  prefillIndividualName,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  userProfile: any;
  prefillIndividualId?: string;
  prefillIndividualName?: string;
}) {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [indSearch, setIndSearch] = useState(prefillIndividualName ?? "");
  const [selectedInd, setSelectedInd] = useState<Individual | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>("annual_pcp");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("10:00");
  const [location, setLocation] = useState<MeetingLocation>("in_person");
  const [locationDetail, setLocationDetail] = useState("");
  const [agenda, setAgenda] = useState("");
  const [attendees, setAttendees] = useState<{ name: string; role: string }[]>([{ name: "", role: "" }]);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    // If prefilled, don't re-load
    if (prefillIndividualId && prefillIndividualName) {
      setSelectedInd({ id: prefillIndividualId, first_name: prefillIndividualName.split(" ")[0], last_name: prefillIndividualName.split(" ").slice(1).join(" "), organizationId: userProfile.organizationId });
      return;
    }
    const q = query(collection(db, "individuals"), where("organizationId", "==", userProfile.organizationId));
    const unsub = onSnapshot(q, snap => {
      setIndividuals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Individual)));
    }, () => {});
    return unsub;
  }, [userProfile?.organizationId, prefillIndividualId, prefillIndividualName]);

  const filteredInds = individuals.filter(i =>
    `${i.first_name} ${i.last_name}`.toLowerCase().includes(indSearch.toLowerCase())
  ).slice(0, 8);

  function addAttendeeRow() {
    setAttendees(a => [...a, { name: "", role: "" }]);
  }
  function removeAttendeeRow(idx: number) {
    setAttendees(a => a.filter((_, i) => i !== idx));
  }
  function updateAttendee(idx: number, field: "name" | "role", val: string) {
    setAttendees(a => a.map((x, i) => i === idx ? { ...x, [field]: val } : x));
  }

  async function handleSave() {
    if (!selectedInd) { toast.error("Select an individual."); return; }
    if (!date) { toast.error("Date is required."); return; }
    if (!userProfile?.organizationId) { toast.error("User profile not loaded. Try refreshing."); return; }

    // Validate date parsing before hitting Firestore
    const parsedDate = new Date(`${date}T${startTime || "09:00"}:00`);
    if (isNaN(parsedDate.getTime())) {
      toast.error("Invalid date or time format.");
      return;
    }

    setSaving(true);
    try {
      const id = await createTeamMeeting({
        organizationId: userProfile.organizationId,
        individualId: selectedInd.id,
        individualName: `${selectedInd.first_name} ${selectedInd.last_name}`,
        meetingType,
        meetingDate: Timestamp.fromDate(parsedDate),
        startTime: startTime || "09:00",
        location,
        // Use null instead of undefined — Firestore rejects undefined field values
        locationDetail: locationDetail.trim() || null,
        agenda: agenda.trim() || null,
        attendees: attendees.filter(a => a.name.trim()),
        status: "scheduled",
        consentAcknowledged: false,
        createdBy: userProfile.uid,
      } as any);
      toast.success("Meeting scheduled");
      onCreated(id);
    } catch (err: any) {
      console.error("[createTeamMeeting]", err);
      // Show a more useful error to help diagnose
      const msg = err?.message ?? String(err);
      if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
        toast.error("Permission denied — contact your administrator.");
      } else {
        toast.error(`Failed to schedule meeting: ${msg.slice(0, 80)}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-icm-border sticky top-0 bg-white z-10">
          <h2 className="text-[13.5px] font-medium text-icm-text">Schedule Team Meeting</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-icm-bg text-icm-text-dim"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Individual search */}
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1">Individual *</label>
            <div className="relative">
              <input
                value={indSearch}
                onChange={e => { setIndSearch(e.target.value); setShowDropdown(true); setSelectedInd(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name…"
                disabled={!!prefillIndividualId}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white disabled:bg-icm-bg"
              />
              {showDropdown && !prefillIndividualId && filteredInds.length > 0 && !selectedInd && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-icm-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredInds.map(i => (
                    <button
                      key={i.id}
                      onClick={() => { setSelectedInd(i); setIndSearch(`${i.first_name} ${i.last_name}`); setShowDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] text-icm-text hover:bg-icm-bg"
                    >
                      {i.first_name} {i.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Meeting type */}
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1">Meeting Type</label>
            <select
              value={meetingType}
              onChange={e => setMeetingType(e.target.value as MeetingType)}
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            >
              {(Object.entries(MEETING_TYPE_LABELS) as [MeetingType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white" />
            </div>
            <div>
              <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1.5">Location</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(MEETING_LOCATION_LABELS) as [MeetingLocation, string][]).map(([k, v]) => (
                <label key={k} className={`flex items-center gap-1.5 text-[11.5px] px-2.5 py-1.5 rounded-md border cursor-pointer ${
                  location === k ? "border-icm-accent bg-icm-accent-soft text-icm-accent" : "border-icm-border text-icm-text hover:bg-icm-bg"
                }`}>
                  <input type="radio" name="location" value={k} checked={location === k} onChange={() => setLocation(k)} className="sr-only" />
                  {v}
                </label>
              ))}
            </div>
          </div>

          {/* Location detail */}
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1">Location Detail (optional)</label>
            <input value={locationDetail} onChange={e => setLocationDetail(e.target.value)}
              placeholder="e.g. Conference Room A or Zoom link"
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white" />
          </div>

          {/* Attendees */}
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1">Attendees</label>
            <div className="space-y-1.5">
              {attendees.map((a, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    value={a.name}
                    onChange={e => updateAttendee(idx, "name", e.target.value)}
                    placeholder="Name"
                    className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                  />
                  <input
                    value={a.role}
                    onChange={e => updateAttendee(idx, "role", e.target.value)}
                    placeholder="Role"
                    className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                  />
                  <button onClick={() => removeAttendeeRow(idx)} className="text-icm-text-dim hover:text-icm-red">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addAttendeeRow} className="text-[11.5px] text-icm-accent hover:underline">
                + Add attendee
              </button>
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium block mb-1">Agenda (optional)</label>
            <textarea rows={3} value={agenda} onChange={e => setAgenda(e.target.value)}
              placeholder="1. ..."
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-icm-border flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="text-[12px] px-3 py-1.5 text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[12px] px-4 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90 disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Schedule Meeting
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Transcript Modal ───────────────────────────────────────────────────
function QuickTranscriptModal({
  onClose,
  meetings,
  onNavigate,
}: {
  onClose: () => void;
  meetings: ReturnType<typeof useTeamMeetings>["meetings"];
  onNavigate: (id: string) => void;
}) {
  const scheduledMeetings = meetings.filter(m => m.status === "scheduled" || m.status === "in_progress");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b border-icm-border">
          <h2 className="text-[13.5px] font-medium text-icm-text">Upload / Paste Transcript</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-icm-bg text-icm-text-dim"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12.5px] text-icm-text-dim">
            Select a scheduled meeting to add a transcript to, or go to a meeting's detail page directly.
          </p>
          {scheduledMeetings.length === 0 ? (
            <div className="text-[12px] text-icm-text-dim text-center py-4">
              No scheduled meetings found. Schedule a meeting first.
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledMeetings.map(m => (
                <button
                  key={m.id}
                  onClick={() => onNavigate(m.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-icm-border hover:border-icm-accent/40 bg-white"
                >
                  <div className="text-[12.5px] font-medium text-icm-text">{m.individualName}</div>
                  <div className="text-[11.5px] text-icm-text-dim">
                    {MEETING_TYPE_LABELS[m.meetingType]} · {m.meetingDate?.toDate?.()?.toLocaleDateString?.() ?? "—"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-icm-border flex justify-end">
          <button onClick={onClose} className="text-[12px] px-3 py-1.5 text-icm-text-dim hover:text-icm-text">Close</button>
        </div>
      </div>
    </div>
  );
}

export { ScheduleMeetingModal };
