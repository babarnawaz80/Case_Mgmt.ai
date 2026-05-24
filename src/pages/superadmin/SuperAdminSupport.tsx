// Super Admin — Support Notes Page
// Internal notes system per organization + recent login events
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminLayout } from '@/components/superadmin/SuperAdminLayout';
import { Plus, Loader2, Clock, StickyNote } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrgOption { id: string; name: string; }
interface SupportNote { id: string; content: string; created_by: string; created_at: any; }
interface LoginEvent { uid: string; displayName: string; lastLogin?: string; email?: string; }

export default function SuperAdminSupport() {
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [notes, setNotes] = useState<SupportNote[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [noteText, setNoteText] = useState('');
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDocs(collection(db, 'organizations')).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().name ?? d.id }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setOrgs(list);
      if (list.length > 0) setSelectedOrgId(list[0].id);
    }).finally(() => setLoadingOrgs(false));
  }, []);

  const loadOrgData = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoadingNotes(true);
    try {
      // Load notes for this org
      const notesRef = collection(db, 'support_notes', orgId, 'notes');
      const notesSnap = await getDocs(query(notesRef, orderBy('created_at', 'asc')));
      setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SupportNote)));

      // Load last 5 login events (users with this orgId, sorted by lastLogin)
      const usersSnap = await getDocs(collection(db, 'users'));
      const orgUsers = usersSnap.docs
        .map(d => ({ uid: d.id, ...d.data() } as LoginEvent & { organizationId?: string }))
        .filter(u => u.organizationId === orgId)
        .sort((a, b) => {
          if (!a.lastLogin && !b.lastLogin) return 0;
          if (!a.lastLogin) return 1;
          if (!b.lastLogin) return -1;
          return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
        })
        .slice(0, 5);
      setLoginEvents(orgUsers);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) loadOrgData(selectedOrgId);
  }, [selectedOrgId, loadOrgData]);

  async function handleAddNote() {
    if (!noteText.trim() || !selectedOrgId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'support_notes', selectedOrgId, 'notes'), {
        content: noteText.trim(),
        created_by: profile?.displayName ?? profile?.email ?? 'Platform Admin',
        created_at: serverTimestamp(),
      });
      toast({ title: 'Note saved' });
      setNoteText('');
      loadOrgData(selectedOrgId);
    } finally {
      setSaving(false);
    }
  }

  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  return (
    <SuperAdminLayout title="Support Notes">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-white font-manrope font-bold text-[22px]">Support Notes</h2>
            <p className="text-slate-400 font-geist text-[13px] mt-0.5">Internal notes per organization — visible to platform admins only</p>
          </div>
          {/* Org Selector */}
          {loadingOrgs ? (
            <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
          ) : (
            <select value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)}
              className="px-3 py-2 rounded-lg text-[13px] font-geist text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Notes Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Add Note */}
            <div className="rounded-xl border p-4 space-y-3"
                 style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
              <h3 className="text-white font-manrope font-semibold text-[14px] flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-indigo-400" />
                Add Note — {selectedOrg?.name ?? ''}
              </h3>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
                placeholder="Enter internal support note…"
                className="w-full px-3 py-2.5 rounded-lg text-[13px] font-geist text-white outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-geist font-semibold text-white disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)' }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Note
                </button>
              </div>
            </div>

            {/* Notes History */}
            <div className="rounded-xl border overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                <h3 className="text-white font-manrope font-semibold text-[14px]">Notes History</h3>
              </div>
              {loadingNotes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-geist text-[13px]">
                  No notes yet for this organization
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                  {[...notes].reverse().map(note => (
                    <div key={note.id} className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-indigo-400 font-geist text-[12px] font-semibold">{note.created_by}</span>
                        <span className="text-slate-600 font-geist text-[11px]">
                          {note.created_at?.toDate?.()?.toLocaleString() ?? '—'}
                        </span>
                      </div>
                      <p className="text-slate-200 font-geist text-[13px] leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Logins */}
          <div className="rounded-xl border overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)', height: 'fit-content' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2"
                 style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
              <Clock className="w-4 h-4 text-teal-400" />
              <h3 className="text-white font-manrope font-semibold text-[14px]">Recent Logins</h3>
            </div>
            {loadingNotes ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              </div>
            ) : loginEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-[12px] font-geist">No recent logins</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                {loginEvents.map(ev => (
                  <div key={ev.uid} className="px-4 py-3">
                    <div className="text-white font-geist text-[12px] font-medium">{(ev as any).displayName || (ev as any).email}</div>
                    <div className="text-slate-500 font-geist text-[11px] mt-0.5">
                      {ev.lastLogin ? new Date(ev.lastLogin).toLocaleString() : 'Never logged in'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
