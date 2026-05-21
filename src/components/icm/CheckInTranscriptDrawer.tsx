import { useEffect, useState } from "react";
import { Bot, X, Tag, ListChecks } from "lucide-react";
import { toast } from "sonner";
import {
  updateCheckInStatus,
  type AICheckInSession,
} from "@/lib/aiCheckIns";

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
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] text-teal-700 font-semibold">
              <Bot className="w-3.5 h-3.5" /> AI Care Assistant Check-In
              {session.urgent && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                  URGENT
                </span>
              )}
            </div>
            <h2 className="mt-1 font-semibold text-gray-900 truncate">{session.individualName}</h2>
            <div className="text-[11.5px] text-gray-500">
              {showCaseManager && <>Case Manager: {session.caseManager} · </>}
              {fmtDate(session.startedAt)} · {fmtTime(session.startedAt)} · {session.durationLabel}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {session.detectedTopics.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                <Tag className="w-3 h-3" /> Detected topics
              </div>
              <div className="flex flex-wrap gap-1.5">
                {session.detectedTopics.map((t) => (
                  <span
                    key={t.key}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      t.key === "crisis"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                    }`}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Transcript</div>
            <div className="space-y-3">
              {session.transcript.map((m) => {
                const isBot = m.role === "bot";
                return (
                  <div key={m.id} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                    <div
                      className={
                        isBot
                          ? "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-[13px] max-w-[85%]"
                          : "bg-teal-500 text-white rounded-2xl rounded-br-md px-3 py-2 text-[13px] max-w-[85%]"
                      }
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
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                <ListChecks className="w-3 h-3" /> Tasks auto-created
              </div>
              <ul className="space-y-2">
                {session.tasks.map((t) => (
                  <li
                    key={t.id}
                    className={`rounded-lg border px-3 py-2 text-[12.5px] ${
                      t.priority === "Critical"
                        ? "border-rose-200 bg-rose-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-gray-900">{t.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Due {t.dueDate} · Priority {t.priority}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50">
          <button
            onClick={handleApply}
            className="h-9 px-3 rounded-lg text-[12.5px] font-semibold bg-teal-500 text-white hover:bg-teal-600"
          >
            Apply to Notes →
          </button>
          <button
            onClick={handleReview}
            className="h-9 px-3 rounded-lg text-[12.5px] font-semibold border border-gray-300 text-gray-700 hover:bg-white"
          >
            Mark as Reviewed
          </button>
        </footer>
      </aside>
    </div>
  );
}
