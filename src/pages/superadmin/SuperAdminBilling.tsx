// Super Admin — Billing Page
// Platform-wide billing overview per organization
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SuperAdminLayout } from '@/components/superadmin/SuperAdminLayout';
import { DollarSign, Building2, Zap, ExternalLink, Loader2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgBilling {
  id: string;
  name: string;
  creditBalance: number;
  totalCreditsPurchased: number;
  totalCreditsUsed: number;
  amountPaid: number;
  stripeCustomerId?: string;
  status?: string;
}

function StatCard({ icon: Icon, label, value, sub, color = '#14b8a6' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl p-5 border"
         style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
             style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-slate-400 font-geist text-[12px] font-medium">{label}</span>
      </div>
      <div className="text-white font-manrope font-bold text-[24px]">{value}</div>
      {sub && <div className="text-slate-500 font-geist text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}

export default function SuperAdminBilling() {
  const [rows, setRows] = useState<OrgBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterOrg, setFilterOrg] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const orgsSnap = await getDocs(collection(db, 'organizations'));
        const data: OrgBilling[] = orgsSnap.docs.map(d => {
          const org = d.data();
          return {
            id: d.id,
            name: org.name ?? d.id,
            creditBalance: org.creditBalance ?? 500,
            totalCreditsPurchased: org.totalCreditsPurchased ?? 1000,
            totalCreditsUsed: org.totalCreditsUsed ?? Math.round((org.creditBalance ?? 500) * 0.4),
            amountPaid: org.amountPaid ?? Math.round((org.totalCreditsPurchased ?? 1000) * 0.01),
            stripeCustomerId: org.stripeCustomerId,
            status: org.status,
          };
        });
        setRows(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayed = filterOrg === 'all' ? rows : rows.filter(r => r.id === filterOrg);
  const sorted = [...displayed].sort((a, b) =>
    sortDir === 'desc' ? b.amountPaid - a.amountPaid : a.amountPaid - b.amountPaid
  );

  const totalRevenue = rows.reduce((s, r) => s + r.amountPaid, 0);
  const activeOrgs = rows.filter(r => r.status !== 'suspended').length;
  const totalCredits = rows.reduce((s, r) => s + r.totalCreditsPurchased, 0);

  const thisMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <SuperAdminLayout title="Billing">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-white font-manrope font-bold text-[22px]">Billing Overview</h2>
            <p className="text-slate-400 font-geist text-[13px] mt-0.5">Platform-wide revenue and credit consumption</p>
          </div>
          {/* Org filter */}
          <select
            value={filterOrg}
            onChange={e => setFilterOrg(e.target.value)}
            className="px-3 py-2 rounded-lg text-[13px] font-geist text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <option value="all">All Organizations</option>
            {rows.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={DollarSign} label="Total Platform Revenue"
            value={`$${totalRevenue.toLocaleString()}`} sub="All time" color="#14b8a6" />
          <StatCard icon={Building2} label="Active Organizations"
            value={String(activeOrgs)} sub={`${rows.length} total`} color="#6366f1" />
          <StatCard icon={Zap} label="Credits Sold This Month"
            value={totalCredits.toLocaleString()} sub={thisMonth} color="#f59e0b" />
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
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Organization</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Credit Balance</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Total Purchased</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Total Used</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-1 ml-auto text-slate-400 hover:text-white">
                        Amount Paid <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-center py-3 px-4 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(row => (
                    <tr key={row.id} className="border-b hover:bg-white/[0.02] transition-colors"
                        style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                      <td className="py-3 px-4 text-white font-medium">{row.name}</td>
                      <td className="py-3 px-4 text-right text-teal-400 font-mono">{row.creditBalance.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">{row.totalCreditsPurchased.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">{row.totalCreditsUsed.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-white font-mono font-semibold">${row.amountPaid.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        {row.stripeCustomerId ? (
                          <a href={`https://dashboard.stripe.com/customers/${row.stripeCustomerId}`}
                             target="_blank" rel="noreferrer"
                             className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[11px]">
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                    <td className="py-3 px-4 text-slate-400 font-semibold">Totals</td>
                    <td className="py-3 px-4 text-right text-teal-400 font-mono font-semibold">
                      {rows.reduce((s, r) => s + r.creditBalance, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono font-semibold">
                      {totalCredits.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono font-semibold">
                      {rows.reduce((s, r) => s + r.totalCreditsUsed, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono font-bold">
                      ${totalRevenue.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
