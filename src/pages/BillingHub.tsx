import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { CreditCard, ArrowRight } from "lucide-react";
import { demoToast } from "@/lib/demoToast";

const BillingHub = () => {
  const navigate = useNavigate();
  return (
    <ICMShell title="Billing" showAIPanel={false}>
      <div className="space-y-6">
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/dashboard")} className="hover:text-icm-text">
            Dashboard
          </button>
          <span className="text-icm-text-faint">›</span>
          <span className="text-icm-text font-medium">Billing</span>
        </nav>

        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            Billing
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            IDD Billing.AI integration
          </p>
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-8 max-w-3xl">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl ai-gradient flex items-center justify-center shrink-0 shadow-elevated">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-manrope font-bold text-[18px] text-icm-text tracking-tight">
                Billing powered by IDD Billing.AI
              </h2>
              <p className="text-[13px] text-icm-text-dim font-geist mt-2 leading-relaxed">
                Full revenue cycle management. Manage claims, authorizations, and payments
                from inside CaseManagement AI.
              </p>
              <button
                onClick={() => {
                  demoToast("IDD Billing.AI handoff");
                  navigate("/billing/revenue-cycle");
                }}
                className="mt-5 h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
              >
                Open IDD Billing.AI
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

export default BillingHub;
