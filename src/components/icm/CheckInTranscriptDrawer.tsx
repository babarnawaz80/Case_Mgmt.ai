import { useEffect, useState } from "react";
import { Bot, X, Tag, ListChecks, AlertCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateCheckInStatus, type AICheckInSession } from "@/lib/aiCheckIns";

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString();
}

interface Props {
  session: AICheckInSession | null;
  onClose: () => void;
  showCaseManager?: boolean;
  onMarkReviewed?: (id: string) => void;
}

export function CheckInTranscriptDrawer({ session, onClose, showCaseManager, onMarkReviewed }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(!!session);
  }, [session]);

  if (!session) return null;

  function handleApply() {
    toast.success("Outputs queued for review in My Work.");
  }
  function handleReview() {
    if (!session) return;
    updateCheckInStatus(session.id, "Reviewed");
    onMarkReviewed?.(session.id);
    toast.success("Marked as reviewed");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-hidden={!open}>
      <div
        className={cn(
          "absolute inset-0 bg-icm-text/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full sm:w-[560px] bg-icm-panel border-l border-icm-border flex flex-col transition-transform",
          "shadow-[0_25px_70px_-20px_rgba(15,23,42,0.18)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="px-6 py-5 border-b border-icm-border/60 bg-gradient-to-r from-icm-bg/40 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1",
                  session.urgent
                    ? "bg-gradient-to-br from-icm-red-soft to-icm-red-soft/60 text-icm-red ring-icm-red/15"
                    : "bg-gradient-to-br from-icm-accent-soft to-icm-accent-soft/60 text-icm-accent ring-icm-accent/15"
                )}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-manrope font-bold text-[17px] text-icm-text tracking-tight truncate">
                    {session.individualName}
                  </h2>
                  {session.urgent && (
                    <span className="px-2 py-0.5 rounded-lg bg-icm-red-soft text-icm-red text-[10px] font-extrabold uppercase tracking-widest border border-icm-red/15">
                      Urgent
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                  AI Care Assistant Check-In
                  {showCaseManager && <> · CM: {session.caseManager}</>}
                </div>
                <div className="text-[11px] text-icm-text-faint font-geist mt-0.5">
                  {fmtDate(session.startedAt)} · {fmtTime(session.startedAt)} · {session.durationLabel}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-icm-border bg-icm-panel text-icm-text-faint hover:text-icm-text shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {session.urgent && (
            <div className="rounded-2xl border border-icm-red/20 bg-icm-red-soft p-4 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-icm-red mt-0.5 shrink-0" />
              <p className="text-[12.5px] font-geist text-icm-text leading-relaxed">
                Safety language was detected in this conversation. Please follow up with the individual
                directly and document the contact.
              </p>
            </div>
          )}

          {session.detectedTopics.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-extrabold text-icm-text-faint mb-2">
                <Tag className="w-3 h-3" /> Detected topics
              </div>
              <div className="flex flex-wrap gap-1.5">
                {session.detectedTopics.map((t) => (
                  <span
                    key={t.key}
                    className={cn(
                      "px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-tight",
                      t.key === "crisis"
                        ? "bg-icm-red-soft text-icm-red border border-icm-red/15"
                        : "bg-icm-accent-soft text-icm-accent border border-icm-accent/15"
                    )}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-extrabold text-icm-text-faint mb-3">
              <MessageSquare className="w-3 h-3" /> Transcript
            </div>
            <div className="rounded-2xl border border-icm-border bg-icm-bg/50 p-4 space-y-3">
              {session.transcript.map((m) => {
                const isBot = m.role === "bot";
                return (
                  <div key={m.id} className={cn("flex", isBot ? "justify-start" : "justify-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-[13px] font-geist max-w-[85%] shadow-sm",
                        isBot
                          ? "bg-icm-panel border border-icm-border/60 text-icm-text rounded-bl-md"
                          : "bg-icm-accent text-white rounded-br-md"
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {session.tasks.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-extrabold text-icm-text-faint mb-2">
                <ListChecks className="w-3 h-3" /> Tasks auto-created
              </div>
              <ul className="space-y-2">
                {session.tasks.map((t) => {
                  const critical = t.priority === "Critical";
                  return (
                    <li
                      key={t.id}
                      className={cn(
                        "rounded-2xl border px-4 py-3",
                        critical
                          ? "border-icm-red/20 bg-icm-red-soft/50"
                          : "border-icm-border bg-icm-bg/60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-xl border-[2.5px] bg-white mt-0.5 shrink-0 flex items-center justify-center",
                            critical ? "border-icm-red/25" : "border-icm-border"
                          )}
                        >
                          {critical && <div className="w-2.5 h-2.5 bg-icm-red rounded-[3px]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-manrope font-bold text-[13.5px] text-icm-text tracking-tight">
                            {t.name}
                          </div>
                          <div className="text-[11.5px] text-icm-text-dim font-geist font-semibold mt-1 flex items-center gap-3 flex-wrap">
                            <span>Due {t.dueDate}</span>
                            <span className="text-icm-text-faint">•</span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest",
                                critical
                                  ? "bg-icm-red-soft text-icm-red"
                                  : "bg-icm-bg text-icm-text-dim"
                              )}
                            >
                              {t.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-icm-border/60 flex items-center justify-end gap-2 bg-icm-bg/40">
          <button
            onClick={handleReview}
            className="h-10 px-4 rounded-2xl text-[12px] font-geist font-black text-icm-text bg-white border border-icm-border shadow-sm hover:bg-icm-bg/60 active:scale-95 transition-all"
          >
            Mark as Reviewed
          </button>
          <button
            onClick={handleApply}
            className="h-10 px-5 rounded-2xl text-[12px] font-geist font-bold text-white bg-icm-accent hover:bg-icm-accent/90 shadow-[0_10px_25px_-5px_rgba(59,130,246,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.55)] active:scale-95 transition-all"
          >
            Apply to Notes →
          </button>
        </footer>
      </aside>
    </div>
  );
}
