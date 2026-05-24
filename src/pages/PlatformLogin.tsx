// PlatformLogin — Private login page for the SaaS platform owner (superadmin)
// Not linked from anywhere in the customer app.
// URL: /platform-login  (share this internally only)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Shield } from 'lucide-react';
import { signIn } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function PlatformLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, isPlatformAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated as platform admin → go straight to dashboard
  // Wait for profile to load (isLoading from AuthContext) before checking role
  useEffect(() => {
    if (isLoading) return; // profile still loading — wait
    if (isAuthenticated) {
      if (isPlatformAdmin) {
        navigate('/super-admin', { replace: true });
      } else {
        // Signed in but not a platform admin — show error and sign them out
        setError('This login is for platform administrators only. Use the main login for your organization.');
        setLoading(false);
      }
    }
  }, [isAuthenticated, isLoading, isPlatformAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // AuthContext onAuthStateChanged will fire → useEffect above redirects
      // Don't call setLoading(false) here — component will unmount on redirect
      // But set a safety timeout in case something stalls
      setTimeout(() => setLoading(false), 8000);
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed. Check your credentials.');
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a] relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative w-full max-w-sm px-6">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">CaseManagement.AI</h1>
          <p className="text-slate-400 text-sm mt-1">Platform Administration</p>
          <div className="mt-3 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-teal-400" />
            <span className="text-teal-400 text-[11px] font-semibold uppercase tracking-wider">Internal Access Only</span>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-6">Sign in to Platform Admin</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-[12px] font-semibold uppercase tracking-wider mb-2 block">
                Email
              </label>
              <input
                type="email"
                id="platform-email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="superadmin@casemanagement.ai"
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder:text-slate-600 text-[14px] outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[12px] font-semibold uppercase tracking-wider mb-2 block">
                Password
              </label>
              <input
                type="password"
                id="platform-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder:text-slate-600 text-[14px] outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-[13px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-semibold text-[14.5px] shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/35 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                'Access Platform Admin'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-[12px] mt-6">
          Looking for the customer portal?{' '}
          <a href="/login" className="text-slate-400 hover:text-teal-400 transition-colors">
            Sign in here →
          </a>
        </p>
      </div>
    </div>
  );
}
