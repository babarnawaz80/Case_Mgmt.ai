import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, TrendingUp, DollarSign, Plus, CreditCard, Loader2 } from "lucide-react";

const dailyUsage = Array.from({ length: 30 }, (_, i) => {
  const base = 1200 + i * 40;
  const noise = Math.round(Math.sin(i * 1.3) * 400 + Math.random() * 300);
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    credits: Math.max(400, base + noise),
  };
});

const featureRows = [
  { name: "Progress Note Pre-fill", actions: 142, credits: 8520, pct: "16.1%", avg: 60 },
  { name: "Monitoring Form Pre-fill", actions: 89, credits: 10680, pct: "20.2%", avg: 120 },
  { name: "PCP/ISP Generation", actions: 12, credits: 14400, pct: "27.3%", avg: 1200 },
  { name: "Compliance Agent Runs", actions: 8, credits: 9600, pct: "18.2%", avg: 1200 },
  { name: "Case Companion Bot", actions: 634, credits: 6340, pct: "12.0%", avg: 10 },
  { name: "Dashboard AI Brief", actions: 30, credits: 900, pct: "1.7%", avg: 30 },
  { name: "Billing Claim Scrub", actions: 67, credits: 2010, pct: "3.8%", avg: 30 },
  { name: "Other", actions: "—", credits: 310, pct: "0.6%", avg: "—" },
];

const staffRows = [
  { name: "Kathy Adams", role: "Case Manager", actions: 289, credits: 18420 },
  { name: "Maria Rodriguez", role: "Case Manager", actions: 201, credits: 12890 },
  { name: "James Park", role: "Case Manager", actions: 187, credits: 11340 },
  { name: "Jennie Thollander", role: "Supervisor", actions: 98, credits: 7890 },
  { name: "Brenda Smith", role: "Case Manager", actions: 156, credits: 2220 },
];

const packs = [
  { name: "Starter", credits: 50000, price: 50, sub: "~25 days for small caseloads", popular: false },
  { name: "Standard", credits: 150000, price: 100, sub: "~75 days for average agencies", popular: true },
  { name: "Professional", credits: 400000, price: 250, sub: "~6 months for busy agencies", popular: false },
  { name: "Agency", credits: 1000000, price: 500, sub: "~12 months · best value", popular: false },
];

export default function SettingsAIUsage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "demo-org-001";

  const [balance, setBalance] = useState(50000);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [lowAlerts, setLowAlerts] = useState(true);
  const [lowThreshold, setLowThreshold] = useState("20");
  const [dailyLimit, setDailyLimit] = useState(true);
  const [dailyLimitVal, setDailyLimitVal] = useState(3000);
  const [perUser, setPerUser] = useState(false);
  const [perUserVal, setPerUserVal] = useState(10000);

  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [isRedirectingCheckout, setIsRedirectingCheckout] = useState<string | null>(null);
  const [isRedirectingPortal, setIsRedirectingPortal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const pctRemaining = Math.round((balance / 150000) * 100);

  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(doc(db, "organizations", orgId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setBalance(d.credit_balance ?? 0);
        setAiEnabled(d.ai_features_enabled !== false);
        setLowAlerts(d.credit_alert_enabled !== false);
        setLowThreshold(String(d.credit_alert_threshold_pct ?? "20"));
        setDailyLimit((d.daily_credit_limit ?? 0) > 0);
        setDailyLimitVal(d.daily_credit_limit || 3000);
        setPaymentMethod(d.payment_method || null);
      }
    });
    return () => unsub();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    setIsLoadingHistory(true);
    const q = query(
      collection(db, "credit_history"),
      where("organizationId", "==", orgId),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => {
        const data = d.data();
        let formattedDate = "—";
        if (data.timestamp) {
          const dt = data.timestamp.toDate();
          formattedDate = `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
        }
        return {
          date: formattedDate,
          desc: data.description || "Credit adjustment",
          credits: data.amount > 0 ? `+${data.amount.toLocaleString()}` : data.amount.toLocaleString(),
          balance: data.balanceAfter ? data.balanceAfter.toLocaleString() : "—"
        };
      });
      setCreditHistory(logs);
      setIsLoadingHistory(false);
    }, (err) => {
      console.error("Credit history listener error:", err);
      setIsLoadingHistory(false);
    });
    return () => unsub();
  }, [orgId]);

  const updateOrgField = async (fields: Record<string, any>) => {
    try {
      await updateDoc(doc(db, "organizations", orgId), fields);
    } catch (err) {
      console.error("Failed to update organization controls:", err);
      toast.error("Failed to save limit controls.");
    }
  };

  const handlePurchase = async (pack: typeof packs[number]) => {
    setIsRedirectingCheckout(pack.name);
    try {
      const response = await fetch("/api/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.name.toLowerCase(),
          organizationId: orgId
        })
      });

      if (!response.ok) throw new Error("Failed to create checkout session");

      const resData = await response.json();
      if (resData.url) {
        window.location.href = resData.url;
      } else {
        throw new Error("Missing redirect URL in billing response.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Billing session failed", {
        description: err.message || "Could not connect to payment processor."
      });
      setIsRedirectingCheckout(null);
    }
  };

  const handleManageBilling = async () => {
    setIsRedirectingPortal(true);
    try {
      const response = await fetch("/api/api/billing/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId
        })
      });

      if (!response.ok) throw new Error("Failed to create portal session");

      const resData = await response.json();
      if (resData.url) {
        window.location.href = resData.url;
      } else {
        throw new Error("Missing portal URL in billing response.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Billing portal failed", {
        description: err.message || "Could not connect to payment portal."
      });
    } finally {
      setIsRedirectingPortal(false);
    }
  };

  return (
    <SettingsLayout
      title="AI Usage & Credits"
      subtitle="Monitor token usage, manage credit balance, and set usage limits."
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-center gap-2 text-icm-text-dim text-[11.5px] font-geist uppercase tracking-wide">
              <Zap className="w-3.5 h-3.5 text-teal-600" /> Credit Balance
            </div>
            <div className="font-manrope text-[32px] font-extrabold text-icm-text mt-2 tracking-tight">
              {balance.toLocaleString()}
            </div>
            <div className="text-[12px] text-icm-text-dim font-geist">Credits remaining</div>
            <div className="text-[11.5px] text-icm-text-faint font-geist mt-1">
              ~23 days at current usage rate
            </div>
            <button
              onClick={() => handlePurchase(packs[1])}
              disabled={isRedirectingCheckout !== null}
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {isRedirectingCheckout === packs[1].name ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add Credits
            </button>
            <div className="mt-3 h-2 w-full rounded-full bg-icm-bg overflow-hidden">
              <div
                className="h-full bg-icm-amber"
                style={{ width: `${Math.max(5, Math.min(100, pctRemaining))}%` }}
              />
            </div>
            <div className="text-[10.5px] text-icm-text-faint font-mono mt-1">{pctRemaining}% remaining</div>
          </div>
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-center gap-2 text-icm-text-dim text-[11.5px] font-geist uppercase tracking-wide">
              <TrendingUp className="w-3.5 h-3.5 text-icm-accent" /> This Month's Usage
            </div>
            <div className="font-manrope text-[32px] font-extrabold text-icm-text mt-2 tracking-tight">
              52,760
            </div>
            <div className="text-[12px] text-icm-text-dim font-geist">Credits used this month</div>
            <div className="text-[11.5px] text-icm-green font-geist mt-1 font-semibold">↑ 12% vs last month</div>
          </div>
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-center gap-2 text-icm-text-dim text-[11.5px] font-geist uppercase tracking-wide">
              <DollarSign className="w-3.5 h-3.5 text-icm-green" /> Estimated Spend
            </div>
            <div className="font-manrope text-[32px] font-extrabold text-icm-text mt-2 tracking-tight">
              $105.52
            </div>
            <div className="text-[12px] text-icm-text-dim font-geist">AI spend this month</div>
            <div className="text-[11.5px] text-icm-text-faint font-geist mt-1">
              Billed to your credit balance
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-manrope font-bold text-[14.5px] text-icm-text">
              Daily AI Usage — Last 30 Days
            </h3>
            <div className="text-[11px] font-geist text-icm-text-dim flex items-center gap-2">
              <span className="inline-block w-3 h-[2px] bg-teal-600" /> Credits used
              <span className="inline-block w-3 border-t border-dashed border-red-500 ml-2" /> Daily budget
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyUsage} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--icm-border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <ReferenceLine
                  y={3000}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{
                    value: "Daily budget limit: 3,000 credits",
                    position: "insideTopRight",
                    fill: "#dc2626",
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="credits"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-icm-border/60 pb-4 mb-4 gap-3">
            <div>
              <h3 className="font-manrope font-bold text-[14.5px] text-icm-text flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" /> Payment & Billing
              </h3>
              <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                Manage credit card, view billing statements, and download PDF invoices securely.
              </p>
            </div>
            <button
              onClick={handleManageBilling}
              disabled={isRedirectingPortal}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[12px] font-geist font-semibold transition"
            >
              {isRedirectingPortal ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CreditCard className="w-3.5 h-3.5" />
              )}
              Manage Cards & Invoices
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-icm-border bg-icm-bg flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              {paymentMethod ? (
                <>
                  <div className="text-[13px] font-bold text-icm-text">
                    {paymentMethod.brand} ending in {paymentMethod.last4}
                  </div>
                  <p className="text-[11px] text-icm-text-dim mt-0.5">
                    Expires {paymentMethod.expMonth}/{paymentMethod.expYear} · {paymentMethod.name} · Primary card
                  </p>
                </>
              ) : (
                <>
                  <div className="text-[13px] font-bold text-icm-text">
                    No credit card on file
                  </div>
                  <p className="text-[11px] text-icm-text-dim mt-0.5">
                    Click Manage Cards & Invoices to set up a credit card securely via Stripe Customer Billing.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Usage by Feature — This Month
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] font-geist">
              <thead>
                <tr className="text-icm-text-dim text-[11px] uppercase tracking-wide border-b border-icm-border">
                  <th className="text-left py-2 font-medium">Feature</th>
                  <th className="text-right py-2 font-medium">Actions</th>
                  <th className="text-right py-2 font-medium">Credits Used</th>
                  <th className="text-right py-2 font-medium">% of Total</th>
                  <th className="text-right py-2 font-medium">Avg per Action</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((r) => (
                  <tr key={r.name} className="border-b border-icm-border/60">
                    <td className="py-2 text-icm-text">{r.name}</td>
                    <td className="py-2 text-right font-mono">{r.actions}</td>
                    <td className="py-2 text-right font-mono">{r.credits.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono">{r.pct}</td>
                    <td className="py-2 text-right font-mono">{r.avg}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-icm-text">
                  <td className="py-2.5">TOTAL</td>
                  <td className="py-2.5 text-right font-mono">—</td>
                  <td className="py-2.5 text-right font-mono">52,760</td>
                  <td className="py-2.5 text-right font-mono">100%</td>
                  <td className="py-2.5 text-right font-mono">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Usage by Staff Member — This Month
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] font-geist">
              <thead>
                <tr className="text-icm-text-dim text-[11px] uppercase tracking-wide border-b border-icm-border">
                  <th className="text-left py-2 font-medium">Staff Member</th>
                  <th className="text-left py-2 font-medium">Role</th>
                  <th className="text-right py-2 font-medium">Actions</th>
                  <th className="text-right py-2 font-medium">Credits Used</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((r) => (
                  <tr key={r.name} className="border-b border-icm-border/60">
                    <td className="py-2 text-icm-text">{r.name}</td>
                    <td className="py-2 text-icm-text-dim">{r.role}</td>
                    <td className="py-2 text-right font-mono">{r.actions}</td>
                    <td className="py-2 text-right font-mono">{r.credits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Controls & Limits
          </h3>
          <div className="divide-y divide-icm-border">
            <ControlRow
              title="AI features enabled"
              subtitle="Turn off to pause all AI usage across the organization"
              control={<Switch checked={aiEnabled} onCheckedChange={(checked) => { setAiEnabled(checked); updateOrgField({ ai_features_enabled: checked }); }} />}
            />
            <ControlRow
              title="Low balance alerts"
              subtitle="Alert admin when balance drops below threshold"
              control={
                <div className="flex items-center gap-2">
                  <Select value={lowThreshold} onValueChange={(val) => { setLowThreshold(val); updateOrgField({ credit_alert_threshold_pct: Number(val) }); }}>
                    <SelectTrigger className="h-8 w-[80px] text-[12px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["10", "20", "30", "50"].map((v) => (
                        <SelectItem key={v} value={v}>{v}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch checked={lowAlerts} onCheckedChange={(checked) => { setLowAlerts(checked); updateOrgField({ credit_alert_enabled: checked }); }} />
                </div>
              }
            />
            <ControlRow
              title="Daily usage limit"
              subtitle="Pause AI after this many credits per day"
              control={
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={dailyLimitVal}
                    onChange={(e) => { const v = Number(e.target.value); setDailyLimitVal(v); if (dailyLimit) updateOrgField({ daily_credit_limit: v }); }}
                    disabled={!dailyLimit}
                    className="h-8 w-[100px] rounded-md border border-icm-border bg-background px-2 text-[12px] font-mono disabled:opacity-50 text-icm-text"
                  />
                  <Switch checked={dailyLimit} onCheckedChange={(checked) => { setDailyLimit(checked); updateOrgField({ daily_credit_limit: checked ? dailyLimitVal : 0 }); }} />
                </div>
              }
            />
            <ControlRow
              title="Per-user monthly limit"
              subtitle="Set a maximum per staff member per month"
              control={
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={perUserVal}
                    onChange={(e) => { const v = Number(e.target.value); setPerUserVal(v); if (perUser) updateOrgField({ per_user_limit: v }); }}
                    disabled={!perUser}
                    className="h-8 w-[100px] rounded-md border border-icm-border bg-background px-2 text-[12px] font-mono disabled:opacity-50 text-icm-text"
                  />
                  <Switch checked={perUser} onCheckedChange={(checked) => { setPerUser(checked); updateOrgField({ per_user_limit_enabled: checked }); if (checked) updateOrgField({ per_user_limit: perUserVal }); }} />
                </div>
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Credit History
          </h3>
          <div className="overflow-x-auto">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-6 text-icm-text-dim text-[12.5px] font-geist">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading transaction logs...
              </div>
            ) : creditHistory.length === 0 ? (
              <div className="text-center py-6 text-icm-text-dim text-[12.5px] font-geist">
                No billing adjustments or payments recorded yet.
              </div>
            ) : (
              <table className="w-full text-[12.5px] font-geist">
                <thead>
                  <tr className="text-icm-text-dim text-[11px] uppercase tracking-wide border-b border-icm-border">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Description</th>
                    <th className="text-right py-2 font-medium">Credits</th>
                    <th className="text-right py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.map((r, i) => (
                    <tr key={i} className="border-b border-icm-border/60">
                      <td className="py-2 font-mono text-icm-text-dim">{r.date}</td>
                      <td className="py-2 text-icm-text">{r.desc}</td>
                      <td
                        className={`py-2 text-right font-mono font-semibold ${
                          r.credits.startsWith("+") ? "text-icm-green" : "text-icm-text"
                        }`}
                      >
                        {r.credits}
                      </td>
                      <td className="py-2 text-right font-mono text-icm-text-dim">{r.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Buy More Credits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {packs.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-xl border bg-icm-panel p-4 flex flex-col justify-between ${
                  p.popular ? "border-teal-500 ring-1 ring-teal-500/30" : "border-icm-border"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[9.5px] font-geist font-semibold bg-teal-600 text-white uppercase tracking-wide">
                    Most Popular
                  </span>
                )}
                <div>
                  <h4 className="font-manrope font-bold text-icm-text text-[14px]">{p.name}</h4>
                  <div className="font-manrope text-[22px] font-extrabold text-icm-text mt-2">
                    {p.credits.toLocaleString()} credits
                  </div>
                  <div className="font-manrope text-[18px] font-bold text-teal-600 mt-1">
                    ${p.price}
                  </div>
                  <p className="text-[11.5px] text-icm-text-dim font-geist mt-2">{p.sub}</p>
                </div>
                <div>
                  <button
                    onClick={() => handlePurchase(p)}
                    disabled={isRedirectingCheckout !== null}
                    className={`mt-4 w-full h-9 rounded-lg text-[12.5px] font-geist font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      p.popular
                        ? "bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-600/50"
                        : "border border-icm-border text-icm-text hover:border-icm-border-strong disabled:opacity-50"
                    }`}
                  >
                    {isRedirectingCheckout === p.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    Purchase
                  </button>
                  <p className="text-[10.5px] text-icm-text-faint font-geist mt-2 text-center">
                    Credits never expire
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}

function ControlRow({
  title,
  subtitle,
  control,
}: {
  title: string;
  subtitle: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-[13px] font-geist font-semibold text-icm-text">{title}</div>
        <div className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">{subtitle}</div>
      </div>
      <div>{control}</div>
    </div>
  );
}
