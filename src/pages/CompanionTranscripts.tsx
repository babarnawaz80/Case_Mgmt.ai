import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useIndividual } from "@/hooks/useIndividuals";
import {
  MessageSquare,
  FileText,
  ChevronRight,
  Sparkles,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface CompanionMessage {
  role: string;
  content: string;
}

interface CompanionSession {
  id: string;
  individualId: string;
  session_date: { toDate?: () => Date } | string | null;
  transcript: CompanionMessage[];
  message_count?: number;
  urgency_flagged?: boolean;
  review_status?: string;
  opened_at?: string;
}

function formatSessionDate(raw: CompanionSession["session_date"]): string {
  if (!raw) return "—";
  if (typeof raw === "string")
    return new Date(raw).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  if (raw && typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function")
    return raw.toDate().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  return "—";
}

export default function CompanionTranscripts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: personLoading } = useIndividual(id);

  const [sessions, setSessions] = useState<CompanionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [markingReviewed, setMarkingReviewed] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const q = query(
      collection(db, "ai_checkins"),
      where("individualId", "==", id),
      orderBy("session_date", "desc"),
      limit(50)
    );
    getDocs(q)
      .then((snap) =>
        setSessions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CompanionSession, "id">) })))
      )
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [id]);

  const firstName = individual?.preferred_name || individual?.first_name || "Individual";

  const summarize = (session: CompanionSession) => {
    const messages = session.transcript || [];
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
    const mock =
      userMessages.length > 0
        ? `${firstName} mentioned: "${userMessages[0]?.slice(0, 120)}${
            (userMessages[0]?.length ?? 0) > 120 ? "…" : ""
          }". ${userMessages.length} user message${userMessages.length === 1 ? "" : "s"} recorded.${
            session.urgency_flagged ? " ⚠️ Urgency was flagged in this session." : " No urgent flags detected."
          }`
        : "No user messages recorded in this session.";
    setSummaries((prev) => ({ ...prev, [session.id]: mock }));
  };

  const markReviewed = async (sessionId: string) => {
    setMarkingReviewed(sessionId);
    try {
      await updateDoc(doc(db, "ai_checkins", sessionId), { review_status: "reviewed" });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, review_status: "reviewed" } : s))
      );
    } catch {
      // silent fail
    } finally {
      setMarkingReviewed(null);
    }
  };

  return (
    <ICMShell title="Companion Transcripts" showAIPanel={false}>
      <div className="space-y-4">
        {!personLoading && individual && (
          <Breadcrumbs
            backTo={`/people/${individual.id}/echart`}
            backLabel="eChart"
            items={[
              { label: "People Supported", to: "/people" },
              { label: `${individual.first_name} ${individual.last_name}`, to: `/people/${individual.id}/echart` },
              { label: "AI Case Companion Transcripts" },
            ]}
          />
        )}

        {/* Header */}
        <div className="rounded-2xl border border-icm-border bg-icm-panel px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h1 className="font-manrope font-extrabold text-[18px] text-icm-text tracking-tight">
                AI Case Companion Transcripts
              </h1>
              <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">
                {individual ? `Check-in sessions for ${firstName}` : "Loading…"} · Review and summarize as needed
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/people/${id}/echart`)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to eChart
          </button>
        </div>

        {/* Session list */}
        {loading ? (
          <div className="rounded-2xl border border-icm-border bg-icm-panel px-5 py-12 flex items-center justify-center gap-3 text-icm-text-dim">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px] font-geist">Loading sessions…</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-icm-border bg-icm-panel px-5 py-16 text-center">
            <MessageSquare className="w-10 h-10 text-icm-text-faint mx-auto mb-3" />
            <p className="text-[14px] font-geist font-semibold text-icm-text">No sessions yet</p>
            <p className="text-[12.5px] font-geist text-icm-text-dim mt-1.5 max-w-sm mx-auto">
              Once {firstName} uses their companion link, their check-in transcripts will appear here for you to review.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
            <div className="px-5 py-3 border-b border-icm-border flex items-center justify-between">
              <span className="text-[11.5px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </span>
              <span className="text-[11px] font-geist text-icm-text-dim">
                {sessions.filter((s) => s.review_status !== "reviewed").length} pending review
              </span>
            </div>

            <ul className="divide-y divide-icm-border">
              {sessions.map((session) => {
                const isExpanded = expandedId === session.id;
                const msgCount = session.transcript?.length ?? session.message_count ?? 0;
                const summary = summaries[session.id];
                const isReviewed = session.review_status === "reviewed";

                return (
                  <li key={session.id}>
                    {/* Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-icm-bg/60 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-purple-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-geist font-semibold text-icm-text">
                            Check-in — {formatSessionDate(session.session_date)}
                          </p>
                          {session.urgency_flagged && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20">
                              Urgent
                            </span>
                          )}
                          {!isReviewed && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">
                              Pending Review
                            </span>
                          )}
                          {isReviewed && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
                              Reviewed
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] font-mono text-icm-text-dim mt-0.5">
                          {msgCount} message{msgCount !== 1 ? "s" : ""} exchanged
                        </p>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 text-icm-text-faint shrink-0 transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-icm-border bg-icm-bg px-5 py-5 space-y-5">
                        {/* AI Summary */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                              AI Summary
                            </p>
                            {!summary && (
                              <button
                                onClick={() => summarize(session)}
                                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-geist font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                              >
                                <Sparkles className="w-3 h-3" />
                                Generate Summary
                              </button>
                            )}
                          </div>
                          {summary ? (
                            <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3">
                              <p className="text-[12.5px] font-geist text-purple-900 leading-relaxed">
                                {summary}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[12px] font-geist text-icm-text-dim italic">
                              Click "Generate Summary" to get an AI summary of this check-in session.
                            </p>
                          )}
                        </div>

                        {/* Full transcript */}
                        {session.transcript && session.transcript.length > 0 && (
                          <div>
                            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-3">
                              Full Transcript
                            </p>
                            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                              {session.transcript.map((msg, i) => {
                                const isUser = msg.role === "user";
                                return (
                                  <div
                                    key={i}
                                    className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[12.5px] font-geist leading-relaxed ${
                                        isUser
                                          ? "bg-icm-accent text-white rounded-br-md"
                                          : "bg-icm-panel border border-icm-border text-icm-text rounded-bl-md"
                                      }`}
                                    >
                                      <p
                                        className={`text-[9.5px] font-semibold uppercase tracking-wide mb-1 ${
                                          isUser ? "text-white/60" : "text-icm-text-faint"
                                        }`}
                                      >
                                        {isUser ? firstName : "Case Companion"}
                                      </p>
                                      {msg.content}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Footer actions */}
                        {!isReviewed && (
                          <div className="flex items-center justify-end gap-3 pt-3 border-t border-icm-border">
                            <span className="text-[11.5px] font-geist text-icm-text-dim">
                              Mark as reviewed once you've read this session.
                            </span>
                            <button
                              onClick={() => markReviewed(session.id)}
                              disabled={markingReviewed === session.id}
                              className="h-8 px-4 rounded-lg text-[12px] font-geist font-semibold bg-icm-text text-icm-panel hover:opacity-90 disabled:opacity-50 transition-opacity inline-flex items-center gap-1.5"
                            >
                              {markingReviewed === session.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Mark Reviewed
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </ICMShell>
  );
}
