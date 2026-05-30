import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Users2,
  Plus,
  Search,
  Calendar,
  Mic,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useAuth } from "@/contexts/AuthContext";
import { useIndividual } from "@/hooks/useIndividuals";
import {
  useTeamMeetings,
  MEETING_TYPE_LABELS,
  MEETING_LOCATION_LABELS,
  type MeetingType,
  type MeetingStatus,
} from "@/hooks/useTeamMeetings";
import { ScheduleMeetingModal } from "./TeamMeetings";

const STATUS_BADGE: Record<MeetingStatus, { label: string; cls: string }> = {
  scheduled:           { label: "Scheduled",     cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
  in_progress:         { label: "In Progress",   cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  transcript_received: { label: "Processing…",  cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/30" },
  minutes_draft:       { label: "Needs Review", cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/30" },
  published:           { label: "Published ✓",  cls: "bg-icm-green-soft text-icm-green ring-icm-green/30" },
};

export default function PersonTeamMeetings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { individual, loading: indLoading } = useIndividual(id);
  const { meetings, loading } = useTeamMeetings(id);
  const [search, setSearch] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  const filtered = meetings.filter(m =>
    !search ||
    MEETING_TYPE_LABELS[m.meetingType]?.toLowerCase().includes(search.toLowerCase()) ||
    (m.status as string).toLowerCase().includes(search.toLowerCase())
  );

  const personLabel = individual
    ? `${individual.last_name}, ${individual.first_name}`
    : "Person";

  const indName = individual
    ? `${individual.first_name} ${individual.last_name}`
    : "";

  function formatDate(ts: any): string {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <ICMShell title="Team Meetings" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/people")} className="hover:text-icm-text">People</button>
          <span className="text-icm-text-faint">›</span>
          {individual && (
            <>
              <button onClick={() => navigate(`/people/${id}/echart`)} className="hover:text-icm-text">
                {personLabel}
              </button>
              <span className="text-icm-text-faint">›</span>
            </>
          )}
          <span className="text-icm-text font-medium">Team Meetings</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-icm-text-dim" />
              <h1 className="text-lg font-manrope font-semibold text-icm-text">Team Meetings</h1>
              {!loading && (
                <span className="text-[11px] text-icm-text-dim">
                  {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {individual && (
              <p className="text-[12px] text-icm-text-dim mt-0.5">{indName}</p>
            )}
          </div>
          <button
            onClick={() => setShowSchedule(true)}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90"
          >
            <Plus className="w-3.5 h-3.5" />
            New Meeting
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings…"
            className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-md border border-icm-border bg-white focus:outline-none focus:ring-1 focus:ring-icm-accent"
          />
        </div>

        {/* Meeting list */}
        {loading || indLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-icm-text-dim">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px] font-geist">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-12 text-center">
            <Users2 className="w-8 h-8 text-icm-text-dim mx-auto mb-2" />
            <div className="text-[13px] text-icm-text-dim">No meetings found for this individual.</div>
            <button
              onClick={() => setShowSchedule(true)}
              className="mt-3 text-[12px] text-icm-accent hover:underline"
            >
              Schedule a meeting →
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
                        <span className="text-[13px] font-medium text-icm-text">
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
                        {m.location && <span>{MEETING_LOCATION_LABELS[m.location]}</span>}
                        {attendeeCount > 0 && <span>{attendeeCount} attendees</span>}
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
          onCreated={meetingId => { setShowSchedule(false); navigate(`/team-meetings/${meetingId}`); }}
          userProfile={userProfile}
          prefillIndividualId={id}
          prefillIndividualName={indName}
        />
      )}
    </ICMShell>
  );
}
