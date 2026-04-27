import { useNavigate } from "react-router-dom";
import { CreditCard, ChevronRight } from "lucide-react";
import {
  eventsForIndividual,
  summaryForIndividual,
  type BillingStatus,
} from "@/data/billingIntegration";

const STATUS_LABEL: Record<BillingStatus, string> = {
  pending: "Pending",
  submitted: "Submitted",
  paid: "Paid",
  denied: "Denied",
  resubmission: "Resubmission",
};

const STATUS_TONE: Record<BillingStatus, string> = {
  pending: "bg-icm-bg text-icm-text-dim ring-icm-border",
  submitted: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  paid: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  denied: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  resubmission: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
};

export function BillingSummaryWidget({ individualId }: { individualId: string }) {
  const navigate = useNavigate();
  const events = eventsForIndividual(individualId);
  const sum = summaryForIndividual(individualId);
  const recent = events.slice(0, 5);
  const now = new Date();
  const monthLabel = now.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-icm-accent-soft text-icm-accent flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-tight font-bold text-[14px] text-icm-text">
              Billing Summary
            </h3>
            <p className="text-[11px] font-geist text-icm-text-dim">
              {monthLabel}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/billing")}
          className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline inline-flex items-center gap-1"
        >
          View full billing history
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
        <Chip label="Submitted" value={sum.submitted} tone="accent" />
        <Chip label="Paid" value={sum.paid} tone="green" />
        <Chip label="Pending" value={sum.pending} tone="muted" />
        <Chip
          label="Denied"
          value={sum.denied}
          tone="red"
          bold={sum.denied > 0}
        />
        <Chip
          label="Total Billed"
          value={`$${sum.totalBilled.toFixed(2)}`}
          tone="muted"
        />
        <Chip
          label="Total Paid"
          value={`$${sum.totalPaid.toFixed(2)}`}
          tone="green"
        />
      </div>

      {/* Recent claims table */}
      {recent.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-icm-border bg-icm-bg/40 p-6 text-center">
          <p className="text-[12.5px] text-icm-text-dim font-geist">
            No billing activity yet.
          </p>
          <p className="text-[11px] text-icm-text-faint font-geist mt-0.5">
            Billing events are created automatically when billable notes are
            signed.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-icm-border overflow-hidden">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg">
                <tr className="text-left text-icm-text-faint">
                  <th className="px-3 py-2 font-semibold uppercase text-[10px] tracking-wide">
                    Date
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase text-[10px] tracking-wide">
                    Service
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase text-[10px] tracking-wide">
                    Units
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase text-[10px] tracking-wide">
                    Status
                  </th>
                  <th className="px-3 py-2 font-semibold uppercase text-[10px] tracking-wide text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {recent.map((e) => (
                  <tr key={e.id} className="hover:bg-icm-bg/40">
                    <td className="px-3 py-2 font-mono text-icm-text">
                      {e.date_of_service}
                    </td>
                    <td className="px-3 py-2 text-icm-text">{e.service_code}</td>
                    <td className="px-3 py-2 font-mono text-icm-text-dim">
                      {e.units}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${
                          STATUS_TONE[e.billing_status]
                        }`}
                      >
                        {STATUS_LABEL[e.billing_status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-icm-text text-right">
                      {e.payment_amount
                        ? `$${e.payment_amount.toFixed(2)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-right">
            <button
              onClick={() => navigate("/billing")}
              className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
            >
              View all claims →
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function Chip({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string | number;
  tone: "accent" | "green" | "red" | "muted";
  bold?: boolean;
}) {
  const cls =
    tone === "accent"
      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
      : tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "red"
      ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
      : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <div
      className={`rounded-lg ring-1 px-2.5 py-2 flex flex-col items-start ${cls}`}
    >
      <span className="text-[9px] uppercase tracking-wide font-geist font-semibold opacity-80">
        {label}
      </span>
      <span
        className={`font-mono text-[14px] mt-0.5 ${
          bold ? "font-extrabold" : "font-bold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
