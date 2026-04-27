import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export function AdminOnly() {
  const navigate = useNavigate();
  return (
    <ICMShell title="Agents Platform" showAIPanel={false}>
      <div className="max-w-[520px] mx-auto mt-16 rounded-xl border border-icm-border bg-icm-panel p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="font-manrope font-bold text-[18px] text-icm-text mt-4">
          Administrators only
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1.5">
          This area is for administrators only. Contact your supervisor for
          access.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-5 h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </button>
      </div>
    </ICMShell>
  );
}
