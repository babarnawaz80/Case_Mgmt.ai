import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, TrendingUp, DollarSign, Plus, CreditCard } from "lucide-react";

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

const historyRows = [
  { date: "05/01/2026", desc: "Credit pack purchased — Standard 150K", credits: "+150,000", balance: "150,000" },
  { date: "05/01/2026", desc: "May usage — Week 1", credits: "-18,240", balance: "131,760" },
  { date: "05/08/2026", desc: "May usage — Week 2", credits: "-21,890", balance: "109,870" },
  { date: "05/15/2026", desc: "May usage — Week 3", credits: "-33,420", balance: "76,450" },
  { date: "05/22/2026", desc: "May usage — Week 4 (est.)", credits: "-29,210", balance: "47,240" },
];

const packs = [
  { name: "Starter", credits: 50000, price: 50, sub: "~25 days for small caseloads", popular: false },
  { name: "Standard", credits: 150000, price: 100, sub: "~75 days for average agencies", popular: true },
  { name: "Professional", credits: 400000, price: 250, sub: "~6 months for busy agencies", popular: false },
  { name: "Agency", credits: 1000000, price: 500, sub: "~12 months · best value", popular: false },
];

export default function SettingsAIUsage() {
  const [balance, setBalance] = useState(47240);
  const [selectedPack, setSelectedPack] = useState<typeof packs[number] | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [lowAlerts, setLowAlerts] = useState(true);
  const [lowThreshold, setLowThreshold] = useState("20");
  const [dailyLimit, setDailyLimit] = useState(true);
  const [dailyLimitVal, setDailyLimitVal] = useState(3000);
  const [perUser, setPerUser] = useState(false);
  const [perUserVal, setPerUserVal] = useState(10000);

  const pctRemaining = Math.round((balance / 100000) * 100);

  const confirmPurchase = () => {
    if (!selectedPack) return;
    setBalance((b) => b + selectedPack.credits);
    toast.success(`${selectedPack.credits.toLocaleString()} credits added to your account`);
    setSelectedPack(null);
  };

  return (
    <SettingsLayout
      title="AI Usage & Credits"
      subtitle="Monitor token usage, manage credit balance, and set usage limits."
    >
      <div className="space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1 */}
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
              onClick={() => setSelectedPack(packs[1])}
              className="mt-3 inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Credits
            </button>
            <div className="mt-3 h-2 w-full rounded-full bg-icm-bg overflow-hidden">
              <div
                className="h-full bg-icm-amber"
                style={{ width: `${Math.min(100, pctRemaining)}%` }}
              />
            </div>
            <div className="text-[10.5px] text-icm-text-faint font-mono mt-1">{pctRemaining}% remaining</div>
          </div>
          {/* Card 2 */}
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-center gap-2 text-icm-text-dim text-[11.5px] font-geist uppercase tracking-wide">
              <TrendingUp className="w-3.5 h-3.5 text-icm-accent" /> This Month's Usage
            </div>
            <div className="font-manrope text-[32px] font-extrabold text-icm-text mt-2 tracking-tight">
              52,760
            </div>
            <div className="text-[12px] text-icm-text-dim font-geist">Credits used this month</div>
            <div className="text-[11.5px] text-icm-green font-geist mt-1">↑ 12% vs last month</div>
          </div>
          {/* Card 3 */}
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-center gap-2 text-icm-text-dim text-[11.5px] font-geist uppercase tracking-wide">
              <DollarSign className="w-3.5 h-3.5 text-icm-green" /> Estimated Cost
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

        {/* Chart */}
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

        {/* Usage by feature */}
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
                <tr className="font-semibold">
                  <td className="py-2.5 text-icm-text">TOTAL</td>
                  <td className="py-2.5 text-right font-mono">—</td>
                  <td className="py-2.5 text-right font-mono">52,760</td>
                  <td className="py-2.5 text-right font-mono">100%</td>
                  <td className="py-2.5 text-right font-mono">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Usage by staff */}
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

        {/* Controls */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Controls & Limits
          </h3>
          <div className="divide-y divide-icm-border">
            <ControlRow
              title="AI features enabled"
              subtitle="Turn off to pause all AI usage across the organization"
              control={<Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />}
            />
            <ControlRow
              title="Low balance alerts"
              subtitle="Alert admin when balance drops below threshold"
              control={
                <div className="flex items-center gap-2">
                  <Select value={lowThreshold} onValueChange={setLowThreshold}>
                    <SelectTrigger className="h-8 w-[80px] text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["10", "20", "30", "50"].map((v) => (
                        <SelectItem key={v} value={v}>{v}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch checked={lowAlerts} onCheckedChange={setLowAlerts} />
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
                    onChange={(e) => setDailyLimitVal(Number(e.target.value))}
                    disabled={!dailyLimit}
                    className="h-8 w-[100px] rounded-md border border-icm-border bg-icm-panel px-2 text-[12px] font-mono disabled:opacity-50"
                  />
                  <Switch checked={dailyLimit} onCheckedChange={setDailyLimit} />
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
                    onChange={(e) => setPerUserVal(Number(e.target.value))}
                    disabled={!perUser}
                    className="h-8 w-[100px] rounded-md border border-icm-border bg-icm-panel px-2 text-[12px] font-mono disabled:opacity-50"
                  />
                  <Switch checked={perUser} onCheckedChange={setPerUser} />
                </div>
              }
            />
          </div>
        </div>

        {/* Credit History */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Credit History
          </h3>
          <div className="overflow-x-auto">
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
                {historyRows.map((r, i) => (
                  <tr key={i} className="border-b border-icm-border/60">
                    <td className="py-2 font-mono text-icm-text-dim">{r.date}</td>
                    <td className="py-2 text-icm-text">{r.desc}</td>
                    <td
                      className={`py-2 text-right font-mono ${
                        r.credits.startsWith("+") ? "text-icm-green" : "text-icm-text"
                      }`}
                    >
                      {r.credits}
                    </td>
                    <td className="py-2 text-right font-mono">{r.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buy More Credits */}
        <div>
          <h3 className="font-manrope font-bold text-[14.5px] text-icm-text mb-3">
            Buy More Credits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {packs.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-xl border bg-icm-panel p-4 ${
                  p.popular ? "border-teal-500 ring-1 ring-teal-500/30" : "border-icm-border"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[9.5px] font-geist font-semibold bg-teal-600 text-white uppercase tracking-wide">
                    Most Popular
                  </span>
                )}
                <h4 className="font-manrope font-bold text-icm-text text-[14px]">{p.name}</h4>
                <div className="font-manrope text-[22px] font-extrabold text-icm-text mt-2">
                  {p.credits.toLocaleString()} credits
                </div>
                <div className="font-manrope text-[18px] font-bold text-teal-600 mt-1">
                  ${p.price}
                </div>
                <p className="text-[11.5px] text-icm-text-dim font-geist mt-2">{p.sub}</p>
                <button
                  onClick={() => setSelectedPack(p)}
                  className={`mt-3 w-full h-9 rounded-lg text-[12.5px] font-geist font-semibold transition-colors ${
                    p.popular
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "border border-icm-border text-icm-text hover:border-icm-border-strong"
                  }`}
                >
                  Purchase
                </button>
                <p className="text-[10.5px] text-icm-text-faint font-geist mt-2 text-center">
                  Credits never expire
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <Dialog open={!!selectedPack} onOpenChange={(o) => !o && setSelectedPack(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-manrope">Purchase Credits</DialogTitle>
          </DialogHeader>
          {selectedPack && (
            <div className="space-y-3 text-[13px] font-geist">
              <p className="text-icm-text">
                You are purchasing: <span className="font-semibold">{selectedPack.name}</span> —{" "}
                {selectedPack.credits.toLocaleString()} credits
              </p>
              <p className="text-icm-text font-semibold text-[15px]">
                Total: ${selectedPack.price}
              </p>
              <div className="rounded-lg border border-icm-border p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-icm-text-dim" />
                  <span className="text-icm-text">Visa ending in 4242</span>
                </div>
                <button className="text-[12px] text-teal-600 hover:underline">Change</button>
              </div>
              <p className="text-[11px] text-icm-text-faint">
                By purchasing you agree to our Terms of Service
              </p>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setSelectedPack(null)}
              className="h-9 px-4 rounded-lg border border-icm-border text-[12.5px] font-geist font-semibold text-icm-text hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={confirmPurchase}
              className="h-9 px-4 rounded-lg bg-teal-600 text-white text-[12.5px] font-geist font-semibold hover:bg-teal-700"
            >
              Confirm Purchase
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
