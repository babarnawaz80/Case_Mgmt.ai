import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { CreditCard, Plus, ArrowLeft, Loader2, FileText, Check, Shield } from "lucide-react";

interface CardInfo {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  name: string;
}

const INITIAL_CARDS: CardInfo[] = [
  { brand: "Visa", last4: "4242", expMonth: "12", expYear: "2028", name: "Kathy Adams" },
  { brand: "Mastercard", last4: "5555", expMonth: "08", expYear: "2029", name: "Billing Dept" },
];

const INVOICES = [
  { date: "05/01/2026", number: "INV-2026-042", amount: "$100.00", pack: "Standard 150K Credits" },
  { date: "04/10/2026", number: "INV-2026-031", amount: "$50.00", pack: "Starter 50K Credits" },
  { date: "03/15/2026", number: "INV-2026-018", amount: "$250.00", pack: "Professional 400K Credits" },
];

export default function BillingPortalSimulation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orgId = searchParams.get("org_id") || "demo-org-001";

  const [cards, setCards] = useState<CardInfo[]>(INITIAL_CARDS);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("Sunrise Care Services");

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getDoc(doc(db, "organizations", orgId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setOrgName(d.name || "Sunrise Care Services");
          
          if (d.payment_method) {
            // Reconstruct cards array with active payment_method as primary
            const pm = d.payment_method;
            const pmCard: CardInfo = {
              brand: pm.brand || "Visa",
              last4: pm.last4 || "4242",
              expMonth: pm.expMonth || "12",
              expYear: pm.expYear || "2028",
              name: pm.name || "Kathy Adams",
            };
            
            // Check if it matches existing card
            const matchIndex = INITIAL_CARDS.findIndex(c => c.last4 === pmCard.last4 && c.brand.toLowerCase() === pmCard.brand.toLowerCase());
            if (matchIndex >= 0) {
              setActiveCardIndex(matchIndex);
            } else {
              setCards([pmCard, ...INITIAL_CARDS]);
              setActiveCardIndex(0);
            }
          }
        }
      })
      .catch((err) => console.error("Failed to load org details:", err))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleSelectDefault = async (index: number) => {
    setActiveCardIndex(index);
    const card = cards[index];
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        payment_method: {
          brand: card.brand,
          last4: card.last4,
          expMonth: card.expMonth,
          expYear: card.expYear,
          name: card.name,
        },
      });
      toast.success("Default payment card updated", {
        description: `${card.brand} ending in ${card.last4} set as primary card.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save default card");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !nameOnCard) {
      toast.error("Please fill in card details.");
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, "");
    const last4 = cleanCard.slice(-4) || "4242";
    const brand = cleanCard.startsWith("3") ? "Amex" : cleanCard.startsWith("5") ? "Mastercard" : "Visa";
    const [month, year] = expiry.split("/");

    const newCard: CardInfo = {
      brand,
      last4,
      expMonth: month || "12",
      expYear: year ? `20${year}` : "2028",
      name: nameOnCard,
    };

    setSaving(true);
    try {
      const updatedCards = [newCard, ...cards];
      setCards(updatedCards);
      setActiveCardIndex(0);
      setShowAddForm(false);
      setCardNumber("");
      setExpiry("");
      setNameOnCard("");

      await updateDoc(doc(db, "organizations", orgId), {
        payment_method: {
          brand: newCard.brand,
          last4: newCard.last4,
          expMonth: newCard.expMonth,
          expYear: newCard.expYear,
          name: newCard.name,
        },
      });

      toast.success("Card added successfully", {
        description: `${newCard.brand} ending in ${newCard.last4} set as primary card.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add new payment method.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-800 font-inter flex flex-col">
      {/* Simulation Header */}
      <div className="bg-[#1F2937] text-white px-6 py-2 flex items-center justify-between text-[11.5px] font-geist select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-4.5 px-1.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20 font-bold uppercase tracking-wider text-[9px] flex items-center">
            Stripe Portal Sandbox
          </span>
          <span>Simulation Mode — Billing updates immediately save to the live database</span>
        </div>
        <button
          onClick={() => navigate("/settings/ai-usage")}
          className="text-white/70 hover:text-white font-medium flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to App
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
          <p className="text-[13px] font-medium font-geist">Loading billing profile...</p>
        </div>
      ) : (
        <div className="flex-1 p-6 md:p-12 max-w-4xl w-full mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-[13px] text-slate-400 font-semibold uppercase tracking-wider font-geist">Billing Portal</p>
              <h1 className="font-manrope font-extrabold text-[26px] text-slate-900 mt-1">
                {orgName}
              </h1>
            </div>
            <button
              onClick={() => navigate("/settings/ai-usage")}
              className="inline-flex items-center justify-center h-9 px-4 border border-slate-200 rounded-xl text-[12.5px] font-geist font-semibold bg-white hover:bg-slate-50 transition"
            >
              Close Portal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cards Management */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-manrope font-bold text-[15px] text-slate-900">
                      Payment Methods
                    </h3>
                    <p className="text-[11.5px] text-slate-400 font-geist mt-0.5">
                      Select or add cards for automatic package purchase.
                    </p>
                  </div>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white inline-flex items-center gap-1 text-[11.5px] font-geist font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" /> Add Card
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <form
                    onSubmit={handleAddCard}
                    className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-3 text-[12px] font-geist"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          required
                          value={nameOnCard}
                          onChange={(e) => setNameOnCard(e.target.value)}
                          placeholder="Kathy Adams"
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").substring(0, 16))}
                          placeholder="4242 4242 4242 4242"
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Expiry
                        </label>
                        <input
                          type="text"
                          required
                          value={expiry}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").substring(0, 4);
                            setExpiry(val.length >= 2 ? `${val.slice(0,2)}/${val.slice(2)}` : val);
                          }}
                          placeholder="MM/YY"
                          className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white font-mono text-center text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="h-8 px-3 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-1 shadow-md shadow-teal-500/10"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Card"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {cards.map((c, i) => {
                    const isDefault = activeCardIndex === i;
                    return (
                      <div
                        key={i}
                        onClick={() => !isDefault && !saving && handleSelectDefault(i)}
                        className={`border rounded-xl p-4 flex items-center justify-between transition cursor-pointer ${
                          isDefault
                            ? "border-teal-500 bg-teal-50/10 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-slate-900">
                                {c.brand} ending in {c.last4}
                              </span>
                              {isDefault && (
                                <span className="text-[9.5px] font-geist font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Expires {c.expMonth}/{c.expYear} · {c.name}
                            </p>
                          </div>
                        </div>
                        {!isDefault && (
                          <button
                            disabled={saving}
                            className="text-[11.5px] font-geist font-semibold text-slate-500 hover:text-slate-800 transition"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar Invoice Info */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-manrope font-bold text-[15px] text-slate-900 border-b border-slate-100 pb-3">
                  Billing Invoices
                </h3>

                <div className="space-y-3">
                  {INVOICES.map((inv) => (
                    <div key={inv.number} className="flex items-start justify-between gap-3 text-[12px] font-geist border-b border-slate-50 pb-2.5 last:border-b-0 last:pb-0">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {inv.number}
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          {inv.date} · {inv.pack}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{inv.amount}</div>
                        <button
                          onClick={() => toast.success(`Simulating invoice download for ${inv.number}`)}
                          className="text-[10.5px] text-teal-600 hover:underline block mt-0.5 font-medium"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-400 font-geist">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  PCI-DSS compliant connection. Payment details are handled by Stripe directly.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
