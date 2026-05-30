// Super Admin — Organization Detail Page
// Route: /super-admin/organizations/:orgId
// Tabs: Overview | Users | Support Notes | Billing & AI Usage

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, doc, getDoc, getDocs, updateDoc, addDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminLayout } from '@/components/superadmin/SuperAdminLayout';
import {
  ChevronLeft, Building2, Users, CreditCard, StickyNote,
  Loader2, Plus, Clock, Zap, DollarSign, CheckCircle2, XCircle,
  Edit2, Save, X, AlertTriangle, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgData {
  id: string;
  name: string;
  state?: string;
  status?: string;
  plan?: string;
  creditBalance?: number;
  totalCreditsPurchased?: number;
  totalCreditsUsed?: number;
  amountPaid?: number;
  monthlyAISpend?: number;
  totalUsers?: number;
  userLimit?: number;
  ai_features_enabled?: boolean;
  createdAt?: any;
  stripeCustomerId?: string;
}

interface OrgUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  isActive?: boolean;
  lastLogin?: string;
}

interface SupportNote {
  id: string;
  content: string;
  created_by: string;
  created_at: any;
}

type Tab = 'overview' | 'users' | 'notes' | 'billing';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-slate-500 font-geist text-[11px] uppercase tracking-wider mb-0.5">{label}</p>
      {children ?? <p className="text-white font-geist text-[13.5px]">{value ?? '—'}</p>}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border p-5', className)}
         style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
      {children}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color = '#14b8a6' }: {
  icon: React.ElementType; label: string; value: string | number; color?: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-slate-400 text-[11px] font-geist font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-manrope font-bold text-[20px]">{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminOrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [tab, setTab]         = useState<Tab>('overview');
  const [org, setOrg]         = useState<OrgData | null>(null);
  const [users, setUsers]     = useState<OrgUser[]>([]);
  const [notes, setNotes]     = useState<SupportNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoaded, setUsersLoaded]   = useState(false);
  const [notesLoaded, setNotesLoaded]   = useState(false);

  // Editable fields
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput]     = useState('');
  const [savingLimit, setSavingLimit]   = useState(false);

  // Support notes
  const [noteText, setNoteText]   = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Load org
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const snap = await getDoc(doc(db, 'organizations', orgId));
      if (snap.exists()) {
        setOrg({ id: snap.id, ...snap.data() } as OrgData);
        setLimitInput(String(snap.data().userLimit ?? ''));
      }
      setLoading(false);
    })();
  }, [orgId]);

  // Load users when tab = users
  const loadUsers = useCallback(async () => {
    if (!orgId || usersLoaded) return;
    const snap = await getDocs(
      query(collection(db, 'users'), where('organizationId', '==', orgId))
    );
    setUsers(snap.docs.map(d => ({
      uid: d.id,
      email: d.data().email ?? '',
      displayName: d.data().displayName ?? d.data().email ?? '',
      role: d.data().role ?? 'case_manager',
      isActive: d.data().isActive !== false,
      lastLogin: d.data().lastLogin,
    })));
    setUsersLoaded(true);
  }, [orgId, usersLoaded]);

  // Load notes when tab = notes
  const loadNotes = useCallback(async () => {
    if (!orgId) return;
    const snap = await getDocs(
      query(collection(db, 'support_notes', orgId, 'notes'), orderBy('created_at', 'desc'))
    );
    setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportNote)));
    setNotesLoaded(true);
  }, [orgId]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'notes' && !notesLoaded) loadNotes();
  }, [tab, loadUsers, loadNotes, notesLoaded]);

  // Save user limit
  async function saveLimit() {
    if (!orgId) return;
    const n = parseInt(limitInput, 10);
    if (isNaN(n) || n < 1) { toast.error('Enter a valid number (minimum 1)'); return; }
    setSavingLimit(true);
    try {
      await updateDoc(doc(db, 'organizations', orgId), { userLimit: n });
      setOrg(o => o ? { ...o, userLimit: n } : o);
      setEditingLimit(false);
      toast.success(`User limit set to ${n}`);
    } catch { toast.error('Failed to save limit'); }
    finally { setSavingLimit(false); }
  }

  // Add support note
  async function addNote() {
    if (!noteText.trim() || !orgId) return;
    setSavingNote(true);
    try {
      await addDoc(collection(db, 'support_notes', orgId, 'notes'), {
        content: noteText.trim(),
        created_by: profile?.displayName ?? profile?.email ?? 'Platform Admin',
        created_at: serverTimestamp(),
      });
      setNoteText('');
      setNotesLoaded(false);
      await loadNotes();
      toast.success('Note saved');
    } finally { setSavingNote(false); }
  }

  // Derived counts
  const activeUsers = users.filter(u => u.isActive !== false).length;
  const userLimit = org?.userLimit ?? null;
  const atLimit = userLimit !== null && activeUsers >= userLimit;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview',       icon: Building2 },
    { key: 'users',    label: 'Users',           icon: Users },
    { key: 'notes',    label: 'Support Notes',   icon: StickyNote },
    { key: 'billing',  label: 'Billing & AI',    icon: CreditCard },
  ];

  if (loading) {
    return (
      <SuperAdminLayout title="Organization">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!org) {
    return (
      <SuperAdminLayout title="Organization">
        <div className="text-center py-24 text-slate-400">Organization not found.</div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout title={org.name}>
      <div className="space-y-5">
        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate('/super-admin/organizations')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[12.5px] font-geist mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Organizations
          </button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)' }}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-manrope font-bold text-[22px] leading-tight">{org.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    'text-[10px] font-geist font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                    org.status === 'suspended'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-teal-500/15 text-teal-400'
                  )}>
                    {org.status ?? 'Active'}
                  </span>
                  {org.plan && (
                    <span className="text-[11px] text-slate-500 font-geist">{org.plan}</span>
                  )}
                  <span className="text-[11px] text-slate-500 font-geist">{org.state}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-[13px] font-geist font-medium border-b-2 -mb-px transition-colors',
                  active
                    ? 'text-teal-400 border-teal-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile icon={Users}     label="Active Users"    value={org.totalUsers ?? 0}       color="#6366f1" />
              <StatTile icon={DollarSign} label="Credit Balance" value={(org.creditBalance ?? 0).toLocaleString()} color="#14b8a6" />
              <StatTile icon={Zap}       label="AI Spend (mo)"  value={`$${(org.monthlyAISpend ?? 0).toFixed(2)}`} color="#f59e0b" />
              <StatTile icon={Activity}  label="Credits Used"   value={(org.totalCreditsUsed ?? 0).toLocaleString()} color="#a855f7" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Org Info */}
              <Card>
                <h3 className="text-white font-manrope font-semibold text-[14px] mb-4">Organization Information</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Org ID"  value={org.id} />
                  <Field label="State"   value={org.state ?? '—'} />
                  <Field label="Plan"    value={org.plan ?? '—'} />
                  <Field label="Status"  value={org.status ?? 'Active'} />
                  <Field label="Created" value={org.createdAt?.toDate?.()?.toLocaleDateString() ?? '—'} />
                  <Field label="AI Features" value={org.ai_features_enabled ? 'Enabled' : 'Disabled'} />
                </div>
              </Card>

              {/* User Limit */}
              <Card>
                <h3 className="text-white font-manrope font-semibold text-[14px] mb-4">User Seat Limit</h3>
                <p className="text-slate-400 font-geist text-[12.5px] mb-4 leading-relaxed">
                  Set the maximum number of active users this organization can add. They will be blocked from adding more users once the limit is reached.
                </p>
                <div className="flex items-center gap-3">
                  {editingLimit ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        value={limitInput}
                        onChange={e => setLimitInput(e.target.value)}
                        className="w-24 px-3 py-2 rounded-lg text-white font-geist text-[14px] outline-none focus:ring-2 focus:ring-teal-500/30"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(99,102,241,0.3)' }}
                        autoFocus
                      />
                      <button onClick={saveLimit} disabled={savingLimit}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-[12px] font-geist font-semibold disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #6366f1)' }}>
                        {savingLimit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button onClick={() => { setEditingLimit(false); setLimitInput(String(org.userLimit ?? '')); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        {userLimit ? (
                          <div>
                            <span className="text-white font-manrope font-bold text-[28px]">{activeUsers}</span>
                            <span className="text-slate-400 font-geist text-[14px] ml-1">/ {userLimit} seats used</span>
                            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.round((activeUsers / userLimit) * 100))}%`,
                                  background: atLimit ? '#ef4444' : 'linear-gradient(90deg, #14b8a6, #6366f1)',
                                }}
                              />
                            </div>
                            {atLimit && (
                              <p className="text-red-400 text-[11.5px] font-geist mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> At limit — org cannot add more users
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-400 font-geist text-[13px]">No limit set — unlimited users</p>
                        )}
                      </div>
                      <button onClick={() => setEditingLimit(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white text-[12px] font-geist font-medium transition-colors border"
                        style={{ borderColor: 'rgba(99,102,241,0.25)', background: 'rgba(255,255,255,0.04)' }}>
                        <Edit2 className="w-3.5 h-3.5" />
                        {userLimit ? 'Change Limit' : 'Set Limit'}
                      </button>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-white font-manrope font-semibold text-[15px]">
                  {activeUsers} active user{activeUsers !== 1 ? 's' : ''}
                  {userLimit ? ` · ${userLimit - activeUsers} seat${userLimit - activeUsers !== 1 ? 's' : ''} remaining` : ' · No seat limit'}
                </p>
                <p className="text-slate-400 font-geist text-[12px] mt-0.5">Users registered under {org.name}</p>
              </div>
              {atLimit && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-geist font-semibold text-red-400"
                     style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  At seat limit — org cannot add more users
                </div>
              )}
            </div>

            {!usersLoaded ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
            ) : users.length === 0 ? (
              <Card><p className="text-slate-500 text-[13px] font-geist text-center py-6">No users found.</p></Card>
            ) : (
              <div className="rounded-xl border overflow-hidden"
                   style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(99,102,241,0.15)' }}>
                <table className="w-full text-[13px] font-geist">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                      {['Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.uid} className="border-b hover:bg-white/[0.02] transition-colors"
                          style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                        <td className="py-3 px-4 text-white font-medium">{u.displayName || '—'}</td>
                        <td className="py-3 px-4 text-slate-300">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.isActive !== false ? (
                            <span className="flex items-center gap-1 text-teal-400 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11.5px]">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SUPPORT NOTES TAB ────────────────────────────────────────────── */}
        {tab === 'notes' && (
          <div className="space-y-5">
            {/* Add note */}
            <Card>
              <h3 className="text-white font-manrope font-semibold text-[14px] mb-3 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-indigo-400" /> Add Internal Note
              </h3>
              <p className="text-slate-500 text-[12px] font-geist mb-3">
                Internal notes visible to platform admins only. Not shown to the organization's users.
              </p>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
                placeholder="Enter note about this organization (issues, billing discussions, support tickets, etc.)…"
                className="w-full px-3 py-2.5 rounded-lg text-white font-geist text-[13px] outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}
              />
              <div className="flex justify-end mt-3">
                <button onClick={addNote} disabled={!noteText.trim() || savingNote}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-geist font-semibold disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)' }}>
                  {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Note
                </button>
              </div>
            </Card>

            {/* Notes history */}
            <div className="rounded-xl border overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(99,102,241,0.15)' }}>
              <div className="px-4 py-3 border-b flex items-center gap-2"
                   style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                <Clock className="w-4 h-4 text-teal-400" />
                <h3 className="text-white font-manrope font-semibold text-[14px]">Notes History</h3>
                <span className="text-slate-500 text-[12px] ml-1">({notes.length})</span>
              </div>
              {!notesLoaded ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal-400" /></div>
              ) : notes.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-geist text-[13px]">
                  No notes yet for {org.name}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                  {notes.map(note => (
                    <div key={note.id} className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-indigo-400 font-geist text-[12px] font-semibold">{note.created_by}</span>
                        <span className="text-slate-600 font-geist text-[11px]">
                          {note.created_at?.toDate?.()?.toLocaleString() ?? '—'}
                        </span>
                      </div>
                      <p className="text-slate-200 font-geist text-[13px] leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BILLING & AI TAB ─────────────────────────────────────────────── */}
        {tab === 'billing' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile icon={DollarSign} label="Amount Paid"        value={`$${(org.amountPaid ?? 0).toLocaleString()}`}            color="#14b8a6" />
              <StatTile icon={Zap}        label="Credits Purchased"  value={(org.totalCreditsPurchased ?? 0).toLocaleString()}        color="#6366f1" />
              <StatTile icon={Activity}   label="Credits Used"       value={(org.totalCreditsUsed ?? 0).toLocaleString()}             color="#f59e0b" />
              <StatTile icon={CreditCard} label="Credit Balance"     value={(org.creditBalance ?? 0).toLocaleString()}                color="#a855f7" />
            </div>

            <Card>
              <h3 className="text-white font-manrope font-semibold text-[14px] mb-4">Billing Details</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Plan"           value={org.plan ?? '—'} />
                <Field label="Credit Balance" value={(org.creditBalance ?? 0).toLocaleString()} />
                <Field label="Monthly AI Spend" value={`$${(org.monthlyAISpend ?? 0).toFixed(2)}`} />
                <Field label="Total Paid (All Time)" value={`$${(org.amountPaid ?? 0).toLocaleString()}`} />
                <Field label="Stripe Customer ID" value={org.stripeCustomerId ?? 'Not connected'} />
                <Field label="AI Features" value={org.ai_features_enabled ? 'Enabled' : 'Disabled'} />
              </div>
            </Card>

            {/* Usage bar */}
            {(org.totalCreditsPurchased ?? 0) > 0 && (
              <Card>
                <h3 className="text-white font-manrope font-semibold text-[14px] mb-4">Credit Usage</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[12.5px] font-geist">
                    <span className="text-slate-400">Used</span>
                    <span className="text-white font-mono">
                      {(org.totalCreditsUsed ?? 0).toLocaleString()} / {(org.totalCreditsPurchased ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((org.totalCreditsUsed ?? 0) / (org.totalCreditsPurchased ?? 1)) * 100))}%`,
                        background: 'linear-gradient(90deg, #14b8a6, #6366f1)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-geist text-slate-500">
                    <span>{Math.round(((org.totalCreditsUsed ?? 0) / (org.totalCreditsPurchased ?? 1)) * 100)}% consumed</span>
                    <span>{(org.creditBalance ?? 0).toLocaleString()} remaining</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
