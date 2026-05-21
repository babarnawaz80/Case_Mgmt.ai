import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

const MicrosoftLogo = () => (
  <svg width="20" height="20" viewBox="0 0 23 23" aria-hidden="true">
    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
    <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
    <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
  </svg>
);

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41.4 35.9 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"microsoft" | "google" | null>(null);

  const handleSSO = (provider: "microsoft" | "google") => {
    setLoading(provider);
    toast.success(`Signing in with ${provider === "microsoft" ? "Microsoft" : "Google"}…`, {
      description: "Demo SSO — no credentials required.",
    });
    setTimeout(() => {
      try {
        localStorage.setItem("cm_ai_demo_user", JSON.stringify({
          provider,
          name: provider === "microsoft" ? "Jordan Reyes" : "Jordan Reyes",
          email: "jordan.reyes@casemanagement.ai",
          loggedInAt: new Date().toISOString(),
        }));
      } catch {}
      navigate("/my-work");
    }, 900);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#f6f8fc] via-white to-[#eef3fb] flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-sky-300/40 via-blue-200/30 to-transparent blur-3xl" />
      <div className="absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full bg-gradient-to-tr from-indigo-200/40 via-cyan-200/30 to-transparent blur-3xl" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-gradient-to-r from-blue-100/40 to-transparent blur-3xl" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* Left brand panel */}
        <div className="hidden lg:flex flex-col gap-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-slate-800">
              Case Management <span className="text-blue-600">AI</span>
            </span>
          </div>

          <div>
            <h1 className="font-manrope text-5xl font-black tracking-tighter text-slate-900 leading-[1.02]">
              The audit-grade<br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                AI companion
              </span><br />
              for case managers.
            </h1>
            <p className="mt-5 text-slate-500 text-[15px] leading-relaxed max-w-md">
              Document faster, stay compliant with state guidelines, and let your AI agents handle the busywork — all under your review.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            {[
              "HIPAA-aligned. SOC 2 Type II in progress.",
              "Every AI action is reviewable, reversible, and auditable.",
              "Trusted by case management teams across 12 states.",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 text-sm text-slate-600">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right login card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 rounded-[2rem] blur-xl" />
          <div className="relative bg-white/80 backdrop-blur-2xl border border-white/70 rounded-[2rem] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] p-10">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-800">
                Case Management <span className="text-blue-600">AI</span>
              </span>
            </div>

            <div className="space-y-1.5 mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Welcome back</p>
              <h2 className="font-manrope text-3xl font-black tracking-tight text-slate-900">Sign in to your workspace</h2>
              <p className="text-sm text-slate-500">Continue with your organization's single sign-on provider.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSSO("microsoft")}
                disabled={loading !== null}
                className="group w-full flex items-center justify-center gap-3 h-14 px-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === "microsoft" ? (
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                ) : (
                  <MicrosoftLogo />
                )}
                <span className="text-[15px] font-semibold text-slate-800">Continue with Microsoft</span>
              </button>

              <button
                onClick={() => handleSSO("google")}
                disabled={loading !== null}
                className="group w-full flex items-center justify-center gap-3 h-14 px-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === "google" ? (
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                ) : (
                  <GoogleLogo />
                )}
                <span className="text-[15px] font-semibold text-slate-800">Continue with Google</span>
              </button>
            </div>

            <div className="flex items-center gap-3 my-7">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">SSO only</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-blue-700">Demo mode.</span> No credentials required — picking a provider signs you in as <span className="font-medium text-slate-800">Jordan Reyes</span>, a senior case manager.
              </p>
            </div>

            <p className="text-[11px] text-slate-400 text-center mt-8 leading-relaxed">
              By continuing, you agree to the Terms of Service and acknowledge the Privacy Policy.<br />
              Protected by enterprise-grade encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
