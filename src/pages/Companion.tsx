import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Phone, ShieldCheck, X } from "lucide-react";
import brandLogo from "@/assets/casemanagement-ai-logo.png";
import { getPerson } from "@/data/people";

/**
 * Decode a token like `cmp_<base64(personId)>` back to the person id.
 * Pure demo encoding — not secure, just opaque enough for the UX.
 */
function decodeToken(token: string | undefined): string | null {
  if (!token) return null;
  const raw = token.startsWith("cmp_") ? token.slice(4) : token;
  try {
    return atob(raw);
  } catch {
    return null;
  }
}

type TurnRole = "agent" | "user";
interface Turn {
  id: string;
  role: TurnRole;
  text: string;
}

/**
 * Demo conversation script. The voice agent walks through a friendly
 * daily check-in. Each user prompt is auto-played to simulate speech
 * recognition; each agent reply is animated as if streamed from a model.
 */
function buildScript(firstName: string): Array<{ user: string; agent: string }> {
  return [
    {
      user: "Hi, I just woke up.",
      agent: `Good morning, ${firstName}. I'm so glad to hear from you. How are you feeling this morning — rested, tired, or somewhere in between?`,
    },
    {
      user: "I'm a little tired but okay.",
      agent: `Thanks for telling me. I'll make a gentle note of that for your case manager. Did you take your morning medications yet?`,
    },
    {
      user: "Not yet, I'll take them now.",
      agent: `Perfect. I'll check back in fifteen minutes to confirm. Anything bothering you today that you'd like me to pass along — pain, mood, or anything else?`,
    },
    {
      user: "My knee hurts a little.",
      agent: `I'm sorry to hear that, ${firstName}. On a scale from one to ten, how strong is the knee pain right now?`,
    },
    {
      user: "About a four.",
      agent: `Got it — a four out of ten. I'll flag that for your care team so they can follow up. Would you like me to remind you to do your stretches this afternoon?`,
    },
  ];
}

const Companion = () => {
  const { token } = useParams<{ token: string }>();
  const personId = decodeToken(token);
  const person = personId ? getPerson(personId) : null;

  const firstName = person?.firstName ?? "Friend";
  const script = useMemo(() => buildScript(firstName), [firstName]);

  const [phase, setPhase] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const timers = useRef<number[]>([]);

  // Greet on connect
  useEffect(() => {
    if (!connected) return;
    setPhase("speaking");
    const greeting: Turn = {
      id: `greet-${Date.now()}`,
      role: "agent",
      text: `Hi ${firstName}, this is your AI companion. I'm here whenever you want to talk or check in. Tap the microphone when you're ready.`,
    };
    setTurns([greeting]);
    const t = window.setTimeout(() => setPhase("idle"), 3200);
    timers.current.push(t);
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [connected, firstName]);

  const handleTalk = () => {
    if (phase !== "idle") return;
    if (stepIndex >= script.length) {
      // Loop politely
      const t: Turn = {
        id: `wrap-${Date.now()}`,
        role: "agent",
        text: `Thanks for checking in today, ${firstName}. I'll be here whenever you need me.`,
      };
      setTurns((p) => [...p, t]);
      return;
    }
    const step = script[stepIndex];
    setPhase("listening");

    const t1 = window.setTimeout(() => {
      setTurns((p) => [...p, { id: `u-${stepIndex}`, role: "user", text: step.user }]);
      setPhase("thinking");
    }, 1600);

    const t2 = window.setTimeout(() => {
      setPhase("speaking");
      setTurns((p) => [...p, { id: `a-${stepIndex}`, role: "agent", text: step.agent }]);
    }, 2600);

    const t3 = window.setTimeout(() => {
      setPhase("idle");
      setStepIndex((i) => i + 1);
    }, 2600 + Math.min(5200, step.agent.length * 35));

    timers.current.push(t1, t2, t3);
  };

  const handleEnd = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setConnected(false);
    setPhase("idle");
    setTurns([]);
    setStepIndex(0);
  };

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-6">
        <div className="max-w-md text-center space-y-4">
          <img src={brandLogo} alt="CaseManagement AI" className="h-10 mx-auto" />
          <h1 className="font-display text-2xl font-bold">Link not valid</h1>
          <p className="text-muted-foreground">
            This companion link has expired or was not recognized. Please ask your case manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Consent / start screen
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border bg-card shadow-xl p-7 text-center space-y-5"
        >
          <img src={brandLogo} alt="CaseManagement AI" className="h-9 mx-auto" />
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold">Hi {firstName} 👋</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your case manager invited you to use your private AI voice companion. Tap below to start a conversation —
              you can talk about how you're feeling, ask questions, or just check in.
            </p>
          </div>
          <div className="rounded-2xl bg-secondary/60 border p-3 text-left text-xs text-muted-foreground flex gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              This link is private to you. Conversations are summarized for your care team to help support you better.
            </span>
          </div>
          <button
            onClick={() => setConnected(true)}
            className="w-full h-12 rounded-2xl text-white font-semibold gradient-primary shadow-lg hover:opacity-95 transition"
          >
            Start Talking
          </button>
          <p className="text-[11px] text-muted-foreground">Demo preview · No audio is recorded</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary to-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-background/70 backdrop-blur">
        <div className="flex items-center gap-2">
          <img src={brandLogo} alt="CaseManagement AI" className="h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Connected · {firstName}
        </div>
      </header>

      {/* Orb / status */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-4">
        <div className="relative w-56 h-56 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full gradient-primary opacity-30 blur-2xl"
            animate={{
              scale: phase === "speaking" ? [1, 1.15, 1] : phase === "listening" ? [1, 1.08, 1] : 1,
            }}
            transition={{ duration: 1.4, repeat: phase === "idle" ? 0 : Infinity }}
          />
          <motion.div
            className="absolute inset-6 rounded-full gradient-primary opacity-80"
            animate={{
              scale: phase === "speaking" ? [1, 1.06, 1] : phase === "listening" ? [1, 1.03, 1] : 1,
            }}
            transition={{ duration: 1.1, repeat: phase === "idle" ? 0 : Infinity }}
          />
          <div className="relative w-28 h-28 rounded-full bg-background/90 border shadow-inner flex items-center justify-center">
            {phase === "listening" ? (
              <Mic className="w-10 h-10 text-primary" />
            ) : phase === "thinking" ? (
              <span className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            ) : phase === "speaking" ? (
              <span className="flex items-end gap-1 h-8">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 rounded-full bg-primary"
                    animate={{ height: ["20%", "100%", "40%", "80%", "30%"] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }}
                    style={{ height: "30%" }}
                  />
                ))}
              </span>
            ) : (
              <Mic className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
        </div>
        <p className="mt-6 text-sm font-medium text-foreground">
          {phase === "listening"
            ? "Listening…"
            : phase === "thinking"
              ? "Thinking…"
              : phase === "speaking"
                ? "Speaking…"
                : "Tap the mic to talk"}
        </p>
      </div>

      {/* Transcript */}
      <div className="max-w-xl w-full mx-auto px-5 pb-4 space-y-3 max-h-[34vh] overflow-y-auto">
        <AnimatePresence initial={false}>
          {turns.slice(-5).map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${
                  t.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border text-foreground"
                }`}
              >
                {t.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="px-6 pb-10 pt-2 flex items-center justify-center gap-4">
        <button
          onClick={() => setMuted((m) => !m)}
          className="w-12 h-12 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Mute"
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          onClick={handleTalk}
          disabled={phase !== "idle"}
          className="w-16 h-16 rounded-full gradient-primary text-white shadow-xl flex items-center justify-center disabled:opacity-60 hover:scale-105 transition"
          aria-label="Talk"
        >
          <Mic className="w-7 h-7" />
        </button>
        <button
          onClick={handleEnd}
          className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
          aria-label="End call"
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
};

export default Companion;
