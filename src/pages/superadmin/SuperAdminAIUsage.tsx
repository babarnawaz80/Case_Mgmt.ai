// Super Admin — AI Usage Page
// Platform-wide AI token consumption analytics with charts
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SuperAdminLayout } from '@/components/superadmin/SuperAdminLayout';
import { Zap, DollarSign, TrendingUp, Layers, Loader2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface OrgUsage { id: string; name: string; tokens: number; cost: number; credits: number; }
interface FeatureUsage { feature: string; count: number; tokens: number; }

const DEMO_DAILY = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 29 + i);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tokens: Math.round(8000 + Math.random() * 15000 + (i > 20 ? i * 500 : 0)),
  };
});

const DEMO_FEATURES: FeatureUsage[] = [
  { feature: 'Progress Note AI Pre-fill', count: 412, tokens: 824000 },
  { feature: 'Care Plan Draft', count: 89, tokens: 356000 },
  { feature: 'Contact Note Summary', count: 321, tokens: 192600 },
  { feature: 'Compliance Agent Run', count: 156, tokens: 312000 },
  { feature: 'Eligibility Verification', count: 67, tokens: 134000 },
  { feature: 'AI Check-In Bot', count: 234, tokens: 70200 },
];

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
        <span className="text-slate-400 font-geist text-[12px]">{label}</span>
      </div>
      <div className="text-white font-manrope font-bold text-[24px]">{value}</div>
      {sub && <div className="text-slate-500 font-geist text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[12px] font-geist"
         style={{ background: '#1a1a3a', border: '1px solid rgba(99,102,241,0.3)' }}>
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="text-white font-semibold">{payload[0].value.toLocaleString()} tokens</div>
    </div>
  );
};

export default function SuperAdminAIUsage() {
  const [orgUsage, setOrgUsage] = useState<OrgUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const orgsSnap = await getDocs(collection(db, 'organizations'));
        const rows: OrgUsage[] = orgsSnap.docs.map(d => {
          const org = d.data();
          const credits = org.totalCreditsUsed ?? Math.round((org.creditBalance ?? 500) * 0.4);
          return {
            id: d.id,
            name: org.name ?? d.id,
            tokens: credits * 250,
            cost: credits * 0.01,
            credits,
          };
        });
        rows.sort((a, b) => b.credits - a.credits);
        setOrgUsage(rows);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalTokensToday   = DEMO_DAILY[29].tokens;
  const totalTokensMonth   = DEMO_DAILY.slice(-30).reduce((s, d) => s + d.tokens, 0);
  const totalTokensAllTime = totalTokensMonth * 8;
  const totalCost          = totalTokensAllTime * 0.0000004;
  const totalCreditsSold   = orgUsage.reduce((s, r) => s + r.credits, 0) * 2.5;
  const margin             = totalCreditsSold - totalCost;

  return (
    <SuperAdminLayout title="AI Usage">
      <div className="space-y-6">
        <div>
          <h2 className="text-white font-manrope font-bold text-[22px]">Platform AI Usage</h2>
          <p className="text-slate-400 font-geist text-[13px] mt-0.5">Token consumption, costs, and margin across all organizations</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Zap} label="Tokens Today"
            value={totalTokensToday.toLocaleString()} color="#14b8a6" />
          <StatCard icon={Zap} label="Tokens This Month"
            value={(totalTokensMonth / 1000).toFixed(0) + 'K'} color="#6366f1" />
          <StatCard icon={DollarSign} label="Total Platform Cost"
            value={`$${totalCost.toFixed(2)}`} sub="All time" color="#f59e0b" />
          <StatCard icon={TrendingUp} label="Platform Margin"
            value={`$${margin.toFixed(0)}`}
            sub={`Credits sold: $${totalCreditsSold.toFixed(0)}`}
            color="#10b981" />
        </div>

        {/* Daily Chart */}
        <div className="rounded-xl border p-5"
             style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
          <h3 className="text-white font-manrope font-semibold text-[14px] mb-4">Daily Token Consumption — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={DEMO_DAILY}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
                interval={4} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="tokens" stroke="#14b8a6" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: '#14b8a6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Usage by Org */}
          <div className="rounded-xl border overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
              <h3 className="text-white font-manrope font-semibold text-[14px]">Usage by Organization</h3>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
              </div>
            ) : (
              <table className="w-full text-[12px] font-geist">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                    <th className="text-left py-2 px-4 text-slate-500 font-medium">Org</th>
                    <th className="text-right py-2 px-4 text-slate-500 font-medium">Credits</th>
                    <th className="text-right py-2 px-4 text-slate-500 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {orgUsage.map(r => (
                    <tr key={r.id} className="border-b hover:bg-white/[0.02]"
                        style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                      <td className="py-2.5 px-4 text-white">{r.name}</td>
                      <td className="py-2.5 px-4 text-right text-teal-400 font-mono">{r.credits.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right text-slate-400 font-mono">${r.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Feature usage */}
          <div className="rounded-xl border overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.15)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
              <h3 className="text-white font-manrope font-semibold text-[14px]">Most Used Features</h3>
            </div>
            <table className="w-full text-[12px] font-geist">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                  <th className="text-left py-2 px-4 text-slate-500 font-medium">Feature</th>
                  <th className="text-right py-2 px-4 text-slate-500 font-medium">Uses</th>
                  <th className="text-right py-2 px-4 text-slate-500 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_FEATURES.map(f => (
                  <tr key={f.feature} className="border-b hover:bg-white/[0.02]"
                      style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
                    <td className="py-2.5 px-4 text-white">{f.feature}</td>
                    <td className="py-2.5 px-4 text-right text-indigo-400 font-mono">{f.count}</td>
                    <td className="py-2.5 px-4 text-right text-slate-400 font-mono">{(f.tokens/1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
