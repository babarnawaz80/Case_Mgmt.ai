// Super Admin — All Users Page
// Shows every user across all organizations with search, filter, and actions
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SuperAdminLayout } from '@/components/superadmin/SuperAdminLayout';
import { Search, KeyRound, UserX, UserCheck, Trash2, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface UserRow {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  orgName?: string;
  lastLogin?: string;
  isActive?: boolean;
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    platform_admin: { bg: 'rgba(99,102,241,0.2)',  text: '#818cf8' },
    admin:          { bg: 'rgba(20,184,166,0.15)', text: '#14b8a6' },
    supervisor:     { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    case_manager:   { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  };
  const r = role ?? 'case_manager';
  const c = map[r] ?? map.case_manager;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold whitespace-nowrap"
          style={{ background: c.bg, color: c.text }}>
      {r.replace('_', ' ')}
    </span>
  );
}

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  const fetchAll = useCallback(async () => {
    try {
      // Load orgs first for name lookup
      const orgSnap = await getDocs(collection(db, 'organizations'));
      const orgMap: Record<string, string> = {};
      orgSnap.docs.forEach(d => { orgMap[d.id] = (d.data().name as string) ?? d.id; });
      setOrgs(orgMap);

      // Load all users
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const rows: UserRow[] = usersSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          displayName: data.displayName ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
          email: data.email,
          role: data.role,
          organizationId: data.organizationId,
          orgName: orgMap[data.organizationId] ?? data.organizationId ?? '—',
          lastLogin: data.lastLogin,
          isActive: data.isActive ?? true,
        };
      });
      setUsers(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleResetPassword(user: UserRow) {
    if (!user.email) return;
    await sendPasswordResetEmail(auth, user.email);
    toast({ title: 'Password reset email sent', description: user.email });
  }

  async function handleSuspend(user: UserRow) {
    await updateDoc(doc(db, 'users', user.id), { isActive: false });
    toast({ title: `${user.displayName} suspended` });
    fetchAll();
  }

  async function handleReactivate(user: UserRow) {
    await updateDoc(doc(db, 'users', user.id), { isActive: true });
    toast({ title: `${user.displayName} reactivated` });
    fetchAll();
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`Permanently remove user "${user.email}"? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'users', user.id));
    toast({ title: 'User removed', variant: 'destructive' });
    fetchAll();
  }

  const orgList = Object.entries(orgs);

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.orgName?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchOrg = orgFilter === 'all' || u.organizationId === orgFilter;
    return matchSearch && matchRole && matchOrg;
  });

  return (
    <SuperAdminLayout title="All Users">
      <div className="space-y-5">
        <div>
          <h2 className="text-white font-manrope font-bold text-[22px]">All Users</h2>
          <p className="text-slate-400 font-geist text-[13px] mt-0.5">{users.length} users across {Object.keys(orgs).length} organizations</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, or org…"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-[13px] font-geist text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)' }} />
          </div>
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="pl-8 pr-8 py-2 rounded-lg text-[13px] font-geist text-white outline-none appearance-none cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <option value="all">All Roles</option>
              <option value="platform_admin">Platform Admin</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="case_manager">Case Manager</option>
            </select>
          </div>
          <div>
            <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-[13px] font-geist text-white outline-none appearance-none cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <option value="all">All Organizations</option>
              {orgList.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] font-geist">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                    {['Name', 'Email', 'Role', 'Organization', 'Last Login', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-slate-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-500">No users found</td></tr>
                  )}
                  {filtered.map(user => (
                    <tr key={user.id} className="border-b hover:bg-white/[0.02] transition-colors"
                        style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                      <td className="py-3 px-3 text-white font-medium">{user.displayName || '—'}</td>
                      <td className="py-3 px-3 text-slate-300">{user.email}</td>
                      <td className="py-3 px-3"><RoleBadge role={user.role} /></td>
                      <td className="py-3 px-3 text-slate-300">{user.orgName}</td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          user.isActive !== false ? 'text-teal-400' : 'text-red-400',
                        )}
                        style={{
                          background: user.isActive !== false
                            ? 'rgba(20,184,166,0.15)' : 'rgba(239,68,68,0.15)',
                        }}>
                          {user.isActive !== false ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleResetPassword(user)} title="Reset Password"
                            className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {user.isActive !== false ? (
                            <button onClick={() => handleSuspend(user)} title="Suspend"
                              className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(user)} title="Reactivate"
                              className="p-1.5 rounded text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 transition-all">
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(user)} title="Remove"
                            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
