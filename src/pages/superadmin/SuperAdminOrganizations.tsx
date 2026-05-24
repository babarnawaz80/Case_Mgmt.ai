// Super Admin — Organizations Page
// Lists all organizations, create new org + admin user, suspend/reactivate/delete
import { useState, useEffect, useCallback } from 'react';
import {
  collection, getDocs, doc, updateDoc,
  setDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SuperAdminLayout } from '@/components/superadmin/SuperAdminLayout';
import {
  Search, Plus, Eye, Pause, Play, X,
  Loader2, Copy, Check, Building2, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const FIREBASE_API_KEY = 'AIzaSyCCDjSN6OIu-VODP7mcqz8IPRk43NRKphE';

interface OrgDoc {
  id: string;
  name: string;
  state?: string;
  status?: string;
  totalUsers?: number;
  creditBalance?: number;
  monthlyAISpend?: number;
  createdAt?: any;
  ai_features_enabled?: boolean;
}

interface NewOrgForm {
  orgName: string;
  state: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  creditBalance: string;
}

const EMPTY_FORM: NewOrgForm = {
  orgName: '',
  state: '',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
  creditBalance: '500',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function slugify(name: string): string {
  return 'org_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function SACard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border p-5', className)}
         style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'active';
  const map: Record<string, { bg: string; text: string }> = {
    active:    { bg: 'rgba(20,184,166,0.15)', text: '#14b8a6' },
    suspended: { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
    trial:     { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  };
  const c = map[s] ?? map.active;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: c.bg, color: c.text }}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 rounded text-slate-400 hover:text-teal-400 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function InputField({
  label, value, onChange, placeholder, type = 'text', required = false,
  hint, action,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
  hint?: string; action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-slate-400 text-[12px] font-semibold uppercase tracking-wider">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {action}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full px-3 py-2.5 rounded-lg text-[13px] text-white outline-none transition-all focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
      />
      {hint && <p className="text-slate-500 text-[11px] mt-1">{hint}</p>}
    </div>
  );
}

export default function SuperAdminOrganizations() {
  const [orgs, setOrgs] = useState<OrgDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewOrgForm>(EMPTY_FORM);
  const [viewOrg, setViewOrg] = useState<OrgDoc | null>(null);
  const [successCreds, setSuccessCreds] = useState<{ email: string; password: string; orgName: string } | null>(null);

  const fetchOrgs = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'organizations'), orderBy('name')));
      setOrgs(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrgDoc)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  function setField(k: keyof NewOrgForm) {
    return (v: string) => setForm(f => ({ ...f, [k]: v }));
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, adminPassword: generatePassword() });
    setSuccessCreds(null);
    setCreating(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.orgName.trim() || !form.adminEmail.trim() || !form.adminPassword.trim()) return;
    setSaving(true);

    try {
      // ── Step 1: Create Firebase Auth user via REST API ──────────────────
      const signUpResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.adminEmail.trim().toLowerCase(),
            password: form.adminPassword,
            returnSecureToken: true,
          }),
        }
      );
      const signUpData = await signUpResp.json();
      if (signUpData.error) {
        throw new Error(signUpData.error.message ?? 'Failed to create user account');
      }
      const newUid: string = signUpData.localId;

      // ── Step 2: Create organization document ────────────────────────────
      const orgId = slugify(form.orgName);
      await setDoc(doc(db, 'organizations', orgId), {
        id: orgId,
        name: form.orgName.trim(),
        state: form.state.trim().toUpperCase() || 'MD',
        status: 'active',
        ai_features_enabled: true,
        creditBalance: parseInt(form.creditBalance, 10) || 500,
        monthlyAISpend: 0,
        totalUsers: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // ── Step 3: Create user document in Firestore ────────────────────────
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: form.adminEmail.trim().toLowerCase(),
        displayName: `${form.adminFirstName.trim()} ${form.adminLastName.trim()}`.trim() || 'Admin User',
        firstName: form.adminFirstName.trim() || 'Admin',
        lastName: form.adminLastName.trim() || 'User',
        role: 'admin',
        organizationId: orgId,
        caseload: [],
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: null,
      });

      // ── Success ──────────────────────────────────────────────────────────
      setSuccessCreds({
        email: form.adminEmail.trim().toLowerCase(),
        password: form.adminPassword,
        orgName: form.orgName.trim(),
      });
      toast({ title: `✅ "${form.orgName}" created with admin account` });
      await fetchOrgs();
    } catch (err: any) {
      toast({
        title: 'Failed to create organization',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  function closeCreate() {
    setCreating(false);
    setSuccessCreds(null);
    setForm(EMPTY_FORM);
  }

  async function handleSuspend(org: OrgDoc) {
    await updateDoc(doc(db, 'organizations', org.id), { status: 'suspended', ai_features_enabled: false });
    toast({ title: `${org.name} suspended`, description: 'AI features disabled.' });
    fetchOrgs();
  }

  async function handleReactivate(org: OrgDoc) {
    await updateDoc(doc(db, 'organizations', org.id), { status: 'active', ai_features_enabled: true });
    toast({ title: `${org.name} reactivated` });
    fetchOrgs();
  }



  const filtered = orgs.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.state?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminLayout title="Organizations">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-white font-manrope font-bold text-[22px]">Organizations</h2>
            <p className="text-slate-400 text-[13px] mt-0.5">{orgs.length} total organizations on the platform</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)' }}
          >
            <Plus className="w-4 h-4" /> Create New Organization
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or state…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-[13px] text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
          />
        </div>

        {/* Table */}
        <SACard>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                    {['Name', 'State', 'Status', 'Users', 'Credits', 'AI Spend/mo', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-slate-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-500">No organizations found</td></tr>
                  )}
                  {filtered.map(org => (
                    <tr key={org.id} className="border-b hover:bg-white/[0.02] transition-colors"
                        style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                      <td className="py-3 px-3 text-white font-medium">{org.name}</td>
                      <td className="py-3 px-3 text-slate-300">{org.state ?? '—'}</td>
                      <td className="py-3 px-3"><StatusBadge status={org.status} /></td>
                      <td className="py-3 px-3 text-slate-300">{org.totalUsers ?? 0}</td>
                      <td className="py-3 px-3 text-teal-400 font-mono">{org.creditBalance?.toLocaleString() ?? 0}</td>
                      <td className="py-3 px-3 text-slate-300 font-mono">${(org.monthlyAISpend ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {org.createdAt?.toDate?.()?.toLocaleDateString() ?? '—'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewOrg(org)} title="View Details"
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {org.status === 'suspended' ? (
                            <button onClick={() => handleReactivate(org)} title="Reactivate"
                              className="p-1.5 rounded text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 transition-all">
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handleSuspend(org)} title="Suspend"
                              className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SACard>
      </div>

      {/* ── Create Organization Modal ─────────────────────────────────────── */}
      {creating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
               style={{ background: '#12122a', border: '1px solid rgba(99,102,241,0.3)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b"
                 style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" />
                <h3 className="text-white font-bold text-[16px]">Create New Organization</h3>
              </div>
              <button onClick={closeCreate} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success State — show credentials */}
            {successCreds ? (
              <div className="p-6 space-y-5">
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)' }}>
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-teal-400 font-bold text-[15px]">{successCreds.orgName} is live!</p>
                  <p className="text-slate-400 text-[12px] mt-1">Send these credentials to your customer's admin</p>
                </div>

                <div className="space-y-3">
                  <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Admin Login Credentials</p>

                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div>
                      <p className="text-slate-500 text-[11px] mb-1">Login URL</p>
                      <div className="flex items-center justify-between">
                        <p className="text-white font-mono text-[13px]">https://app.casemanagement.ai</p>
                        <CopyButton text="https://app.casemanagement.ai" />
                      </div>
                    </div>
                    <div className="h-px" style={{ background: 'rgba(99,102,241,0.15)' }} />
                    <div>
                      <p className="text-slate-500 text-[11px] mb-1">Email Address</p>
                      <div className="flex items-center justify-between">
                        <p className="text-white font-mono text-[13px]">{successCreds.email}</p>
                        <CopyButton text={successCreds.email} />
                      </div>
                    </div>
                    <div className="h-px" style={{ background: 'rgba(99,102,241,0.15)' }} />
                    <div>
                      <p className="text-slate-500 text-[11px] mb-1">Temporary Password</p>
                      <div className="flex items-center justify-between">
                        <p className="text-white font-mono text-[14px] tracking-wider">{successCreds.password}</p>
                        <CopyButton text={successCreds.password} />
                      </div>
                    </div>
                  </div>

                  {/* Copy all button */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `CaseManagement.AI — New Account\n\nOrganization: ${successCreds.orgName}\nLogin URL: https://app.casemanagement.ai\nEmail: ${successCreds.email}\nPassword: ${successCreds.password}\n\nPlease log in and change your password on first sign-in.`
                      );
                      toast({ title: 'Credentials copied to clipboard' });
                    }}
                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)' }}
                  >
                    Copy All Credentials
                  </button>
                </div>

                <button onClick={closeCreate}
                  className="w-full py-2 rounded-xl text-[13px] text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  Done
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleCreate} className="p-6 space-y-5">
                {/* Organization Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <p className="text-indigo-400 text-[11px] font-semibold uppercase tracking-wider">Organization Details</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <InputField label="Organization Name" required value={form.orgName}
                        onChange={setField('orgName')} placeholder="Sunrise Support Services" />
                    </div>
                    <InputField label="State" value={form.state}
                      onChange={v => setField('state')(v.toUpperCase().slice(0, 2))}
                      placeholder="MD" hint="2-letter code" />
                  </div>
                  <InputField label="Starting AI Credits" value={form.creditBalance}
                    onChange={setField('creditBalance')} placeholder="500"
                    hint="Credits available for AI features" />
                </div>

                <div className="h-px" style={{ background: 'rgba(99,102,241,0.15)' }} />

                {/* Admin User Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    <p className="text-teal-400 text-[11px] font-semibold uppercase tracking-wider">Admin User Account</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="First Name" value={form.adminFirstName}
                      onChange={setField('adminFirstName')} placeholder="Jane" />
                    <InputField label="Last Name" value={form.adminLastName}
                      onChange={setField('adminLastName')} placeholder="Smith" />
                  </div>
                  <InputField label="Admin Email" required type="email" value={form.adminEmail}
                    onChange={setField('adminEmail')} placeholder="admin@sunrisesupport.com" />
                  <InputField
                    label="Temporary Password"
                    required
                    value={form.adminPassword}
                    onChange={setField('adminPassword')}
                    placeholder="Temp password"
                    hint="Customer will use this to log in for the first time"
                    action={
                      <button type="button"
                        onClick={() => setField('adminPassword')(generatePassword())}
                        className="text-teal-400 text-[11px] hover:underline">
                        Generate
                      </button>
                    }
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-1">
                  <button type="button" onClick={closeCreate}
                    className="px-4 py-2 rounded-lg text-[13px] text-slate-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    disabled={saving || !form.orgName.trim() || !form.adminEmail.trim() || !form.adminPassword.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)' }}>
                    {saving ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5" /> Create Organization</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── View Details Modal ────────────────────────────────────────────── */}
      {viewOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-lg rounded-xl p-6 space-y-4"
               style={{ background: '#1a1a3a', border: '1px solid rgba(99,102,241,0.3)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-[16px]">{viewOrg.name}</h3>
              <button onClick={() => setViewOrg(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                ['ID', viewOrg.id],
                ['State', viewOrg.state ?? '—'],
                ['Status', viewOrg.status ?? 'active'],
                ['Total Users', viewOrg.totalUsers ?? 0],
                ['Credit Balance', (viewOrg.creditBalance ?? 0).toLocaleString()],
                ['Monthly AI Spend', `$${(viewOrg.monthlyAISpend ?? 0).toFixed(2)}`],
                ['AI Features', viewOrg.ai_features_enabled ? 'Enabled' : 'Disabled'],
                ['Created', viewOrg.createdAt?.toDate?.()?.toLocaleDateString() ?? '—'],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg p-3"
                     style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="text-slate-500 text-[11px] mb-0.5">{k}</div>
                  <div className="text-white">{v as string}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setViewOrg(null)}
              className="w-full py-2 rounded-lg text-[13px] text-slate-400 hover:text-white transition-colors mt-2"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
