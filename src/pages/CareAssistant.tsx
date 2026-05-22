import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Mic, Send, CheckCircle2 } from "lucide-react";
import SiriOrb from "@/components/ui/siri-orb";
import logo from "@/assets/casemanagement-logo.png";
import {
  TOKEN_MAP,
  matchBotReply,
  buildSummary,
  buildTasks,
  topicLabel,
  appendCheckIn,
  type CheckInMessage,
  type TopicKey,
  type AICheckInSession,
} from "@/lib/aiCheckIns";

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function CareAssistant() {
  const { linkToken = "" } = useParams();
  const person = TOKEN_MAP[linkToken];

  if (!person) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6 font-inter">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center text-2xl">!</div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Link not recognized</h1>
          <p className="mt-2 text-sm text-gray-600">
            This link is not recognized. Please contact your case manager.
          </p>
        </div>
      </div>
    );
  }

  const [messages, setMessages] = useState<CheckInMessage[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [topics, setTopics] = useState<Set<TopicKey>>(new Set());
  const [urgent, setUrgent] = useState(false);
  const [ended, setEnded] = useState(false);
  const [startedAt] = useState(Date.now());
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ended]);


  const exchangeCount = useMemo(
    () => messages.filter((m) => m.role === "individual").length,
    [messages]
  );

  function finalize(allMessages: CheckInMessage[], topicSet: Set<TopicKey>, isUrgent: boolean) {
    const endedAt = Date.now();
    const seconds = Math.max(1, Math.round((endedAt - startedAt) / 1000));
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    const durationLabel = `${mm} min ${String(ss).padStart(2, "0")} sec`;
    const topicList = Array.from(topicSet);
    const session: AICheckInSession = {
      id: `CHK-${Date.now()}`,
      individualId: person.individualId,
      individualName: person.individualName,
      firstName: person.firstName,
      caseManager: person.caseManager,
      county: person.county,
      startedAt,
      endedAt,
      durationLabel,
      contactType: "Case Companion Check-In",
      transcript: allMessages,
      summary: buildSummary(person.firstName, topicList),
      detectedTopics: topicList.map((k) => ({ key: k, label: topicLabel(k) })),
      tasks: buildTasks(person.firstName, topicList),
      urgent: isUrgent,
      status: "Pending Review",
    };
    appendCheckIn(session);
    setEnded(true);
  }

  function send(textRaw: string) {
    const text = textRaw.trim();
    if (!text || ended) return;
    const userMsg: CheckInMessage = { id: `u-${Date.now()}`, role: "individual", text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");

    setTimeout(() => {
      const match = matchBotReply(text, person.firstName);
      const newTopics = new Set(topics);
      if (match.topic) newTopics.add(match.topic);
      const isUrgent = urgent || match.topic === "crisis";
      const botMsg: CheckInMessage = { id: `b-${Date.now()}`, role: "bot", text: match.reply, ts: Date.now() };
      const withBot = [...next, botMsg];
      setMessages(withBot);
      setTopics(newTopics);
      setUrgent(isUrgent);
      if (match.end) {
        setTimeout(() => finalize(withBot, newTopics, isUrgent), 600);
      }
    }, 700);
  }

  function handleEndSession() {
    finalize(messages, topics, urgent);
  }

  function toggleMic() {
    if (recording) {
      setRecording(false);
      // Mock: drop a fake transcript into the input for the user to review
      const samples = [
        "I'm not feeling well today",
        "I'd like to explore getting a job",
        "Everything is going well, thank you",
        "I want to change my day program",
      ];
      const pick = samples[Math.floor(Math.random() * samples.length)];
      setInput((prev) => (prev ? `${prev} ${pick}` : pick));
    } else {
      setRecording(true);
    }
  }

  // group messages by minute for timestamp display
  const grouped: { ts: number; items: CheckInMessage[] }[] = [];
  for (const m of messages) {
    const last = grouped[grouped.length - 1];
    if (last && Math.abs(m.ts - last.ts) < 60000 && last.items[0].role === m.role) {
      last.items.push(m);
    } else {
      grouped.push({ ts: m.ts, items: [m] });
    }
  }

  if (ended) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6 font-inter">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-gray-900">Thanks for checking in!</h1>
          <p className="mt-3 text-[15px] text-gray-700 leading-relaxed">
            Your care team has received your update. Your case manager will follow up with you soon.
          </p>
          <p className="mt-6 text-[12.5px] text-gray-500">
            You can close this window or come back anytime using the same link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101a2e] font-inter flex flex-col text-white">
      {/* Header */}
      <header className="pt-6 sm:pt-8 pb-4 px-4 sm:px-6 text-center flex flex-col items-center">
        <img
          src={logo}
          alt="CaseManagement AI"
          className="h-7 sm:h-8 w-auto select-none brightness-0 invert"
          draggable={false}
        />
        {/* Orb — centered, larger, responsive */}
        <div className="mt-8 sm:mt-12 flex justify-center w-full">
          <div className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px]">
            <SiriOrb
              size="100%"
              colors={{
                c1: "oklch(82% 0.18 195)",
                c2: "oklch(78% 0.22 330)",
                c3: "oklch(70% 0.18 280)",
              }}
              animationDuration={18}
            />
          </div>
        </div>
        <h1 className="mt-6 sm:mt-8 text-[22px] sm:text-[26px] font-semibold text-white">
          Hi {person.firstName} <span>👋</span>
        </h1>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-300 text-[12px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Your Case Companion is ready
        </div>
      </header>

      {/* Conversation */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 max-w-2xl w-full mx-auto"
      >
        <div className="space-y-4">
          {grouped.map((g, gi) => {
            const isBot = g.items[0].role === "bot";
            return (
              <div key={gi} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                <div className={`flex items-end gap-2 max-w-[85%] ${isBot ? "" : "flex-row-reverse"}`}>
                  {isBot && (
                    <div className="shrink-0">
                      <SiriOrb size="28px" animationDuration={14} />
                    </div>
                  )}
                  <div className="space-y-1">
                    {g.items.map((m) => (
                      <div
                        key={m.id}
                        className={
                          isBot
                            ? "bg-white/10 text-white/90 rounded-2xl rounded-bl-md px-4 py-2.5 text-[14.5px] leading-relaxed backdrop-blur-sm"
                            : "bg-[#5eead4] text-[#0b1220] rounded-2xl rounded-br-md px-4 py-2.5 text-[14.5px] leading-relaxed font-medium"
                        }
                      >
                        {m.text}
                      </div>
                    ))}
                    <div className={`text-[10.5px] text-white/40 ${isBot ? "text-left" : "text-right"}`}>
                      {fmtTime(g.ts)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {exchangeCount >= 2 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleEndSession}
              className="text-[12.5px] text-white/50 hover:text-[#5eead4] underline-offset-2 hover:underline"
            >
              Done for now? End this check-in →
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-[#0b1220]/80 backdrop-blur px-4 md:px-6 py-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-sm focus-within:border-[#5eead4]/60"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? "Listening..." : "Type your message..."}
              className="flex-1 bg-transparent outline-none text-[14.5px] text-white placeholder:text-white/40 py-1.5"
              disabled={recording}
            />
            {recording && (
              <div className="flex items-end gap-0.5 h-5 mr-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-[#5eead4] rounded-full animate-pulse"
                    style={{ height: `${6 + (i % 3) * 5}px`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Toggle microphone"
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition ${
                recording
                  ? "bg-[#5eead4] text-[#0b1220]"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {recording && (
                <span className="absolute inset-0 rounded-full ring-2 ring-[#5eead4]/40 animate-ping" />
              )}
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-full bg-[#5eead4] text-[#0b1220] flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
