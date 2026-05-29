import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/casemanagement-logo.png";
import heroImg from "@/assets/login-hero.jpg";
import { signIn, resetPassword } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, MultiFactorError } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { isMFAError, getMFAResolver } from "@/lib/mfa";
import { MFAVerifyModal } from "@/components/auth/MFAVerifyModal";

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41.4 35.9 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const MicrosoftLogo = () => (
  <svg width="20" height="20" viewBox="0 0 23 23" aria-hidden="true">
    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
    <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
    <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
  </svg>
);

const testimonials = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarah.cm",
    text: "Documentation that used to take an hour is done before I leave the parking lot. Audit-ready every time.",
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Marcus Johnson",
    handle: "@marcus.lead",
    text: "Compliance flags catch things before they become exceptions. My supervisors finally trust the queue.",
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/32.jpg",
    name: "Priya Patel",
    handle: "@priya.ddd",
    text: "Feels like a teammate, not a tool. Cites the state guideline every single time.",
  },
];

const heroImage = heroImg;

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isPlatformAdmin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<import("firebase/auth").MultiFactorResolver | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // If already authenticated, redirect to the correct area
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(isPlatformAdmin ? "/super-admin" : "/home", { replace: true });
    }
  }, [isAuthenticated, isLoading, isPlatformAdmin, navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading("email");
    try {
      await signIn(email, password);
      // AuthContext detects auth change → navigates automatically
    } catch (error: any) {
      if (isMFAError(error)) {
        // User has MFA enrolled — show SMS challenge modal
        setMfaResolver(getMFAResolver(error as MultiFactorError));
        setLoading(null);
      } else {
        // Show the actual error message from getFriendlyAuthError so the user
        // (and developers) can see the real reason — wrong password, account
        // disabled, network failure, project suspended, etc.
        setAuthError((error as Error).message ?? "Sign-in failed. Please try again.");
        setLoading(null);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading("google");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Auto-provision Firestore user profile on first Google sign-in
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const nameParts = (user.displayName ?? "").split(" ");
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          first_name: nameParts[0] ?? "",
          last_name: nameParts.slice(1).join(" ") ?? "",
          role: "case_manager",
          organizationId: "org-1",
          createdAt: serverTimestamp(),
          authProvider: "google",
        });
      }
      // AuthContext will detect auth change and navigate automatically
    } catch (error: any) {
      if (isMFAError(error)) {
        setMfaResolver(getMFAResolver(error as MultiFactorError));
        setLoading(null);
      } else if (error?.code !== "auth/popup-closed-by-user") {
        toast.error("Google sign-in failed. Please try again.");
        setLoading(null);
      } else {
        setLoading(null);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Enter your email address first, then click Reset Password.");
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
      toast.success("Password reset email sent!", {
        description: "Check your inbox and follow the link to reset your password.",
      });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#faf7ff] via-white to-[#eef0ff]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <>
      {/* MFA SMS Challenge Modal — shown when user has MFA enrolled */}
      {mfaResolver && (
        <MFAVerifyModal
          resolver={mfaResolver}
          onSuccess={() => {
            setMfaResolver(null);
            // AuthContext will detect auth change → navigate to /home
          }}
          onCancel={() => {
            setMfaResolver(null);
            setLoading(null);
          }}
        />
      )}
    <div className="min-h-screen w-full flex bg-gradient-to-br from-[#faf7ff] via-white to-[#eef0ff] font-inter">
      {/* Left: form column */}
      <section className="relative flex-1 flex items-center justify-center px-6 py-10">
        {/* Ambient glow — logo palette */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-[460px] h-[460px] rounded-full bg-gradient-to-tr from-fuchsia-300/40 via-violet-300/30 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-10 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-indigo-300/40 via-blue-300/30 to-transparent blur-3xl" />

        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <img
              src={logo}
              alt="CaseManagement AI"
              className="h-9 w-auto select-none"
              draggable={false}
            />
            <p className="text-[11px] text-slate-500 mt-2 ml-0.5">
              The audit-grade AI companion for case managers
            </p>
          </div>

          <div className="space-y-1.5 mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] bg-gradient-to-r from-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome back
            </p>
            <h1 className="font-manrope text-4xl font-black tracking-tight text-slate-900">
              Sign in
            </h1>
            <p className="text-sm text-slate-500">
              Access your workspace and continue your case management work.
            </p>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-slate-600 mb-1.5 block">
                Email address
              </label>
              <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15 transition-all">
                <input
                  type="email"
                  name="email"
                  id="login-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  className="w-full bg-transparent outline-none px-4 h-12 text-[14.5px] text-slate-800 placeholder:text-slate-400"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-600 mb-1.5 block">
                Password
              </label>
              <div className="relative rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15 transition-all">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="login-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-transparent outline-none px-4 pr-12 h-12 text-[14.5px] text-slate-800 placeholder:text-slate-400"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="accent-violet-600 w-4 h-4 rounded" />
                Keep me signed in
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetSent}
                className="text-violet-600 hover:underline font-medium disabled:opacity-50"
              >
                {resetSent ? "Email sent ✓" : "Reset password"}
              </button>
            </div>

            {authError && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[13px]"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading !== null}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 text-white font-semibold text-[14.5px] shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all disabled:opacity-60"
            >
              {loading === "email" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
              Or continue with
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toast.info("Microsoft SSO coming soon.", { description: "Use email/password to sign in for now." })}
              disabled={loading !== null}
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
            >
              <MicrosoftLogo />
              <span className="text-[13.5px] font-semibold text-slate-800">Microsoft</span>
            </button>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading !== null}
              className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
            >
              {loading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <GoogleLogo />
              )}
              <span className="text-[13.5px] font-semibold text-slate-800">
                {loading === "google" ? "Signing in…" : "Google"}
              </span>
            </button>
          </div>

          <p className="text-[12.5px] text-slate-500 text-center mt-8">
            New to our platform?{" "}
            <button
              onClick={() => toast("Account creation is admin-provisioned. Contact your supervisor.")}
              className="text-violet-600 font-semibold hover:underline"
            >
              Create account
            </button>
          </p>
        </div>
      </section>

      {/* Right: hero + testimonials */}
      <section className="hidden lg:block relative flex-1 p-4">
        <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-900/20">
          <img
            src={heroImage}
            alt="Care team collaborating"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent" />

          <div className="absolute top-8 left-8 right-8 flex items-center justify-between text-white/90">
            <span className="text-[12px] font-semibold tracking-[0.2em] uppercase">
              HIPAA-compliant AI · SOC 2 in progress
            </span>
          </div>

          <div className="absolute bottom-8 left-8 right-8 grid grid-cols-1 xl:grid-cols-3 gap-3">
            {testimonials.map((t, i) => (
              <div
                key={t.handle}
                className={`rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 text-white ${
                  i === 0 ? "block" : i === 1 ? "hidden xl:block" : "hidden xl:block"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <img src={t.avatarSrc} alt={t.name} className="w-9 h-9 rounded-lg object-cover" />
                  <div className="leading-tight">
                    <p className="text-[13px] font-semibold">{t.name}</p>
                    <p className="text-[11px] text-white/60">{t.handle}</p>
                  </div>
                </div>
                <p className="text-[12.5px] leading-relaxed text-white/85">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
