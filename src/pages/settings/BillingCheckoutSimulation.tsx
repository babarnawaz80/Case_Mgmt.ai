import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreditCard, ShieldCheck, ArrowLeft, Loader2, ArrowRight } from "lucide-react";

const PACKS: Record<string, { name: string; credits: number; price: number; desc: string }> = {
  starter: { name: "Starter", credits: 50000, price: 50, desc: "Perfect for small case management agencies." },
  standard: { name: "Standard", credits: 150000, price: 100, desc: "Best for mid-sized provider agencies." },
  professional: { name: "Professional", credits: 400000, price: 250, desc: "Designed for scaling, busy agencies." },
  agency: { name: "Agency", credits: 1000000, price: 500, desc: "Best value, enterprise caseload support." },
};

export default function BillingCheckoutSimulation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const packId = searchParams.get("pack_id") || "standard";
  const orgId = searchParams.get("org_id") || "demo-org-001";
  const sessionId = searchParams.get("session_id") || `sim_chk_${Date.now()}`;

  const pack = PACKS[packId.toLowerCase()] || PACKS.standard;

  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  const handleCardFormat = (val: string) => {
    const clean = val.replace(/\D/g, "").substring(0, 16);
    const parts = clean.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(" "));
  };

  const handleExpiryFormat = (val: string) => {
    const clean = val.replace(/\D/g, "").substring(0, 4);
    if (clean.length >= 2) {
      setExpiry(`${clean.substring(0, 2)}/${clean.substring(2)}`);
    } else {
      setExpiry(clean);
    }
  };

  const handleCvcFormat = (val: string) => {
    const clean = val.replace(/\D/g, "").substring(0, 3);
    setCvc(clean);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvc || !name) {
      toast.error("Please fill in all credit card details.");
      return;
    }
    
    setLoading(true);
    try {
      // Direct call to our secure simulated webhook endpoint
      const response = await fetch("https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/billing/simulate-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId,
          organizationId: orgId,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process payment session.");
      }

      const resData = await response.json();
      toast.success("Payment processed successfully!", {
        description: `Added ${resData.creditsAdded?.toLocaleString() || pack.credits.toLocaleString()} credits to your account.`,
      });

      // Redirect back to Settings AI Usage page
      navigate("/settings/ai-usage");
    } catch (err: any) {
      console.error(err);
      toast.error("Simulated payment failed", {
        description: err.message || "Failed to process sandbox checkout.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-inter flex flex-col md:flex-row">
      {/* Left side: Package Summary */}
      <div className="flex-1 bg-white border-r border-slate-200 p-8 md:p-16 flex flex-col justify-between max-w-xl">
        <button
          onClick={() => navigate("/settings/ai-usage")}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-[13px] font-medium transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to CaseManagement.AI
        </button>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="h-6 px-2.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold uppercase tracking-wider flex items-center">
              Stripe Sandbox
            </span>
            <span className="h-6 px-2.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider flex items-center">
              Simulation Mode
            </span>
          </div>

          <div>
            <p className="text-[14px] text-slate-400 font-medium">Subscribe or Buy</p>
            <h1 className="font-manrope font-extrabold text-[32px] text-slate-900 mt-1">
              {pack.credits.toLocaleString()} Credits
            </h1>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
              {pack.desc} Credits never expire and are added instantly.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-y border-slate-100 py-4">
            <div className="flex items-center justify-between py-2 text-[13.5px]">
              <span className="text-slate-500">{pack.name} Credit Pack</span>
              <span className="font-bold text-slate-900">${pack.price}.00</span>
            </div>
            <div className="flex items-center justify-between py-3 text-[14.5px] font-bold">
              <span className="text-slate-800">Total amount due</span>
              <span className="text-slate-900">${pack.price}.00</span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Powered by Stripe. Secured with AES-256 encryption.</span>
        </div>
      </div>

      {/* Right side: Payment form */}
      <div className="flex-1 p-8 md:p-16 flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-8">
          <h2 className="font-manrope font-bold text-[18px] text-slate-900 mb-6">
            Pay with Credit Card
          </h2>

          <form onSubmit={handlePay} className="space-y-4 text-[12.5px] font-geist">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Cardholder Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kathy Adams"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Card Info */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Card Details
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => handleCardFormat(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono"
                />
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Expiry */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Expiration
                </label>
                <input
                  type="text"
                  required
                  value={expiry}
                  onChange={(e) => handleExpiryFormat(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono text-center"
                />
              </div>

              {/* CVC */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  CVC
                </label>
                <input
                  type="text"
                  required
                  value={cvc}
                  onChange={(e) => handleCvcFormat(e.target.value)}
                  placeholder="123"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono text-center"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              By confirming, you authorize a mock charge of **${pack.price}.00** on the card ending in{" "}
              {cardNumber.slice(-4) || "4242"}.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold text-[13.5px] transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing sandbox payment...</span>
                </>
              ) : (
                <>
                  <span>Pay ${pack.price}.00</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
