import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, FileText, ShieldCheck, Sparkles, Calendar, User, Building2, Lock, PenLine, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SignDocument() {
  const { token } = useParams();
  const navigate = useNavigate();

  // Mock doc derived from token (deterministic-feeling)
  const doc = {
    title: "Person-Centered Plan — Annual Review",
    docId: `PCP-${(token || "DEMO").slice(0, 6).toUpperCase()}`,
    individual: "Marcus Thompson",
    org: "Horizon Case Management Services",
    caseManager: "Jordan Reyes, LCSW",
    sentOn: "May 18, 2026",
    expiresOn: "Jun 1, 2026",
    state: "California",
    program: "HCBS Waiver — Adult Services",
  };

  const [agreed, setAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [mode, setMode] = useState<"type" | "draw">("type");
  const [signed, setSigned] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // Drawing canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };
  const end = () => { drawing.current = false; };
  const clearPad = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
  };

  const canSubmit = agreed && (mode === "type" ? typedName.trim().length > 1 : true);

  const submit = () => {
    if (mode === "draw" && !hasInk.current) {
      toast.error("Please draw your signature before submitting.");
      return;
    }
    if (!canSubmit) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSigned(true);
    toast.success("Signature recorded", {
      description: `${doc.docId} signed at ${new Date().toLocaleTimeString()}. Audit trail updated.`,
    });
  };

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white/80 backdrop-blur-2xl border border-white/70 rounded-[2rem] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-manrope text-3xl font-black tracking-tight text-slate-900">Document signed</h1>
          <p className="text-sm text-slate-500 mt-2">
            Thank you. A copy of <span className="font-medium text-slate-800">{doc.docId}</span> has been emailed to you and added to your record at {doc.org}.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left text-[12.5px] space-y-1.5 font-mono">
            <div className="flex justify-between"><span className="text-slate-500">Document</span><span className="text-slate-800">{doc.docId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Signer</span><span className="text-slate-800">{mode === "type" ? typedName : doc.individual}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Signed at</span><span className="text-slate-800">{new Date().toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">IP</span><span className="text-slate-800">198.51.100.42</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Audit ref</span><span className="text-slate-800">AUD-{Math.random().toString(36).slice(2, 10).toUpperCase()}</span></div>
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={() => toast.success("Download started", { description: "Signed PDF will arrive shortly." })} className="flex-1 h-11 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Download copy
            </button>
            <button onClick={() => navigate("/")} className="flex-1 h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8fc] via-white to-[#eef3fb]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/60">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow shadow-blue-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-slate-800">
              Case Management <span className="text-blue-600">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure signing session · 256-bit encrypted</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Document panel */}
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-xl border border-white/70 rounded-[1.75rem] shadow-[0_20px_50px_-20px_rgba(15,23,42,0.18)] overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Document for review</p>
              <h1 className="font-manrope text-2xl font-black tracking-tight text-slate-900 mt-1">{doc.title}</h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">{doc.docId} · {doc.program}</p>
            </div>

            <div className="px-7 py-5 grid grid-cols-2 gap-4 text-[12.5px] border-b border-slate-100">
              <InfoRow icon={User} label="Individual" value={doc.individual} />
              <InfoRow icon={Building2} label="Organization" value={doc.org} />
              <InfoRow icon={PenLine} label="Case Manager" value={doc.caseManager} />
              <InfoRow icon={Calendar} label="Sent" value={doc.sentOn} />
            </div>

            <div className="px-7 py-6 space-y-5 text-[13.5px] text-slate-700 leading-relaxed">
              <Section title="1. Purpose">
                This Person-Centered Plan documents the goals, supports, and services agreed upon between you and {doc.org}, in compliance with {doc.state} HCBS regulations.
              </Section>
              <Section title="2. Goals & Vision">
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Live independently in a shared-support apartment within 12 months.</li>
                  <li>Maintain part-time employment in retail with on-the-job coaching.</li>
                  <li>Expand social network through weekly community group participation.</li>
                </ul>
              </Section>
              <Section title="3. Services Authorized">
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Supported Living Services — 20 hrs/week</li>
                  <li>Employment Coaching — 8 hrs/week</li>
                  <li>Day Program — 3 days/week</li>
                  <li>Behavioral Health Consultation — monthly</li>
                </ul>
              </Section>
              {showFull && (
                <>
                  <Section title="4. Rights & Responsibilities">
                    You have the right to participate in all decisions about your plan, to request changes at any time, to receive services free from discrimination, and to file a grievance without retaliation.
                  </Section>
                  <Section title="5. Review Schedule">
                    This plan will be reviewed at minimum every 12 months, or sooner upon request or significant change in circumstances.
                  </Section>
                  <Section title="6. Acknowledgment">
                    By signing below, you acknowledge that this plan has been explained to you in a manner you understand, that you participated in its development, and that you agree to the services and goals described.
                  </Section>
                </>
              )}
              <button onClick={() => setShowFull(!showFull)} className="text-[12px] font-semibold text-blue-600 hover:underline">
                {showFull ? "Show less" : "Read full document →"}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5 px-2 text-[11.5px] text-slate-500">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>If anything in this plan is unclear or you'd like changes, contact <span className="font-medium text-slate-700">{doc.caseManager}</span> before signing.</span>
          </div>
        </div>

        {/* Signature panel */}
        <aside className="lg:sticky lg:top-20 h-fit space-y-4">
          <div className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[1.75rem] shadow-[0_20px_50px_-20px_rgba(15,23,42,0.2)] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Step 1</p>
            <h2 className="font-manrope text-lg font-black tracking-tight text-slate-900">Add your signature</h2>

            <div className="mt-4 flex gap-1.5 bg-slate-100 rounded-xl p-1">
              {(["type", "draw"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 h-8 rounded-lg text-[12px] font-semibold transition ${mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {m === "type" ? "Type" : "Draw"}
                </button>
              ))}
            </div>

            {mode === "type" ? (
              <div className="mt-4">
                <input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type your full legal name"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                {typedName.trim().length > 1 && (
                  <div className="mt-3 h-20 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center">
                    <span className="text-3xl text-slate-900" style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive' }}>
                      {typedName}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={120}
                  onPointerDown={start}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerLeave={end}
                  className="w-full h-32 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 touch-none cursor-crosshair"
                />
                <button onClick={clearPad} className="mt-2 text-[11px] text-slate-500 hover:text-slate-700 font-medium">Clear</button>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Step 2</p>
              <label className="mt-2 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-[12px] text-slate-600 leading-relaxed">
                  I have read and agree to the document above and consent to sign electronically per the <span className="text-blue-600 font-medium">E-SIGN Act</span>.
                </span>
              </label>
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[14px] font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Sign document
            </button>
            <p className="text-[10.5px] text-slate-400 text-center mt-3 leading-relaxed">
              Expires {doc.expiresOn} · Audit-logged & timestamped
            </p>
          </div>

          <button onClick={() => toast.success("Request sent", { description: `${doc.caseManager} will reach out shortly.` })} className="w-full h-11 rounded-2xl bg-white/70 backdrop-blur border border-white/70 text-[12.5px] font-semibold text-slate-700 hover:bg-white transition inline-flex items-center justify-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Request changes instead
          </button>
        </aside>
      </main>
    </div>
  );
}

const InfoRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) => (
  <div className="flex items-start gap-2.5">
    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-blue-600" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className="text-[13px] text-slate-800 font-medium">{value}</p>
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</h3>
    <div>{children}</div>
  </div>
);
