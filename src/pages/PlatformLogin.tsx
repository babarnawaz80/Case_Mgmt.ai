// PlatformLogin — Private login page for the SaaS platform owner (superadmin)
// URL: /platform-login  (share this internally only — not linked from customer app)
//
// Standalone — does NOT use AuthContext to avoid session-race issues.
// Signs in directly with Firebase SDK, checks role in Firestore, then hard-redirects.

import { useState } from 'react';
import { Loader2, Lock, Shield } from 'lucide-react';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import app from '@/lib/firebase';

const auth = getAuth(app);
const db   = getFirestore(app);

export default function PlatformLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign out any existing session first
      try { await signOut(auth); } catch { /* ignore */ }

      // Sign in with the provided credentials
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid  = cred.user.uid;

      // Check Firestore directly — no AuthContext involved
      const userDoc = await getDoc(doc(db, 'users', uid));
      const role = userDoc.exists() ? userDoc.data()?.role : null;

      if (role !== 'platform_admin') {
        // Wrong role — sign out immediately and show clear error
        await signOut(auth);
        setError(
          `This account does not have platform admin access (role: ${role ?? 'none'}). ` +
          `Contact your system administrator.`
        );
        setLoading(false);
        return;
      }

      // Role confirmed — hard redirect so AuthContext reloads cleanly
      window.location.replace('/super-admin/organizations');

    } catch (err: any) {
      const msg: string = err.message ?? '';
      if (msg.includes('wrong-password') || msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many failed attempts. Please wait a few minutes and try again.');
      } else {
        setError(msg || 'Sign in failed. Check your credentials.');
      }
      setLoading(false);
    }
  };

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
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@casemanagement.ai"
                autoComplete="username"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder:text-slate-600 text-[14px] outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[12px] font-semibold uppercase tracking-wider mb-2 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder:text-slate-600 text-[14px] outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-[13px] leading-snug">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-semibold text-[14.5px] shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/35 transition-all disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
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
