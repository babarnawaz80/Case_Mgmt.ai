/**
 * DischargedBanner — amber banner shown on any individual profile page
 * when the individual's enrollment_status is "discharged".
 *
 * Usage:
 *   <DischargedBanner individual={individual} />
 */

import { AlertTriangle } from "lucide-react";
import type { Individual } from "@/hooks/useIndividuals";

interface Props {
  individual: Individual | null | undefined;
}

export function DischargedBanner({ individual }: Props) {
  if (!individual || individual.enrollment_status !== "discharged") return null;

  const dischargeDate = individual.discharge_date
    ? new Date(individual.discharge_date).toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-icm-amber/40 bg-icm-amber-soft px-4 py-3 flex items-start gap-3 mb-4">
      <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
      <p className="text-[12.5px] font-geist text-icm-text leading-snug">
        <span className="font-semibold text-icm-amber">
          Discharged{dischargeDate ? ` on ${dischargeDate}` : ""}
        </span>
        {" — "}
        Records are read-only. New notes, tasks, and plans cannot be created for discharged individuals.
      </p>
    </div>
  );
}
