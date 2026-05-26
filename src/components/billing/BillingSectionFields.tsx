/**
 * BillingSectionFields — Shared billing fields component used across all note types.
 * Shows: Service Code, Billable Units (live calc), Authorization, Rate display.
 * Only rendered when isBillable = true.
 */
import React, { useEffect, useMemo } from "react";
import { Sparkles, AlertTriangle, Info } from "lucide-react";
import { useAuthorizations, SERVICE_CODES_STATIC, getRateForCode } from "@/hooks/useAuthorizations";
import { calculateBillingUnits } from "@/services/billingValidation";

interface BillingSectionFieldsProps {
  individualId: string;
  serviceCode: string;
  onServiceCodeChange: (code: string) => void;
  units: number;
  onUnitsChange: (units: number) => void;
  authorizationId: string;
  authorizationNumber: string;
  onAuthorizationChange: (id: string, number: string) => void;
  startTime: string;
  endTime: string;
  // Layout
  className?: string;
}

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong";

const BillingSectionFields: React.FC<BillingSectionFieldsProps> = ({
  individualId,
  serviceCode,
  onServiceCodeChange,
  units,
  onUnitsChange,
  authorizationId,
  authorizationNumber,
  onAuthorizationChange,
  startTime,
  endTime,
  className = "",
}) => {
  const { forServiceCode, loading: authLoading } = useAuthorizations(individualId);

  // Get rate info for selected code
  const { rate, unitType } = useMemo(() => {
    if (!serviceCode) return { rate: 28.5, unitType: "15_min" };
    return getRateForCode(serviceCode);
  }, [serviceCode]);

  // Calculate units live from start/end time
  const unitCalc = useMemo(() => {
    return calculateBillingUnits(startTime, endTime, unitType as any, rate);
  }, [startTime, endTime, unitType, rate]);

  // Auto-update units when calculation changes
  useEffect(() => {
    if (unitCalc.units > 0 && unitCalc.units !== units) {
      onUnitsChange(unitCalc.units);
    }
  }, [unitCalc.units]);

  // Get authorizations for selected service code
  const matchingAuths = useMemo(() => {
    if (!serviceCode) return forServiceCode("all");
    return forServiceCode(serviceCode);
  }, [serviceCode, forServiceCode]);

  const selectedAuth = matchingAuths.find(a => a.id === authorizationId || a.authorization_number === authorizationNumber);
  const totalAmount = units * rate;

  return (
    <div className={`rounded-xl border border-icm-border bg-icm-bg/40 p-4 space-y-3 ${className}`}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-teal-600 flex items-center justify-center shrink-0">
          <span className="text-white text-[9px] font-bold">$</span>
        </div>
        <span className="text-[10.5px] font-geist font-bold uppercase tracking-[0.1em] text-icm-text-dim">
          Billing
        </span>
      </div>

      {/* Live unit calculation display */}
      {startTime && endTime && (
        <div className={`rounded-lg px-3 py-2 flex items-center gap-2 ${
          unitCalc.error
            ? "bg-amber-50 border border-amber-200"
            : "bg-teal-50 border border-teal-200"
        }`}>
          {unitCalc.error ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          )}
          <span className={`text-[11.5px] font-geist font-medium ${
            unitCalc.error ? "text-amber-700" : "text-teal-700"
          }`}>
            {unitCalc.displayText}
          </span>
        </div>
      )}

      {/* Row 1: Service Code + Units */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-1">
            Service / Procedure Code <span className="text-icm-red">*</span>
          </label>
          <div className="relative">
            <select
              value={serviceCode}
              onChange={e => onServiceCodeChange(e.target.value)}
              className={inputCls}
            >
              <option value="">Select service code…</option>
              {SERVICE_CODES_STATIC.map(sc => (
                <option key={sc.code} value={sc.code}>
                  {sc.code} — {sc.description}
                </option>
              ))}
            </select>
            {serviceCode && (
              <span className="absolute right-7 top-2 text-[9.5px] font-geist font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full pointer-events-none">
                AI suggested
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-1">
            Billable Units
          </label>
          <input
            type="number"
            min={0}
            value={units}
            onChange={e => onUnitsChange(Number(e.target.value))}
            className={inputCls}
            placeholder="Auto-calculated"
          />
          {units !== unitCalc.units && unitCalc.units > 0 && (
            <p className="text-[10px] text-amber-600 font-geist mt-0.5">
              Manual override — AI calculated {unitCalc.units}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Authorization */}
      <div>
        <label className="block text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-1">
          Service Authorization <span className="text-icm-red">*</span>
        </label>
        {authLoading ? (
          <div className={inputCls + " flex items-center text-icm-text-faint"}>
            Loading authorizations…
          </div>
        ) : matchingAuths.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-geist text-amber-700">
              No active authorization for {serviceCode || "this service code"}.
              Add authorization in profile → Authorizations tab.
            </p>
          </div>
        ) : (
          <select
            value={authorizationId}
            onChange={e => {
              const selected = matchingAuths.find(a => a.id === e.target.value);
              onAuthorizationChange(
                e.target.value,
                selected?.authorization_number || ""
              );
            }}
            className={inputCls}
          >
            <option value="">Select authorization…</option>
            {matchingAuths.map(auth => (
              <option key={auth.id} value={auth.id}>
                {auth.authorization_number} · {auth.remaining_units} of {auth.authorized_units} units remaining
              </option>
            ))}
          </select>
        )}

        {/* Cap warning */}
        {selectedAuth && selectedAuth.remaining_units / selectedAuth.authorized_units <= 0.15 && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-geist text-amber-600">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Approaching authorization cap — {selectedAuth.remaining_units} units remaining
          </div>
        )}
      </div>

      {/* Row 3: Rate display */}
      {serviceCode && units > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-icm-border/60">
          <Info className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
          <span className="text-[11px] font-geist text-icm-text-dim">
            Rate: <span className="font-mono font-semibold">${rate.toFixed(2)}/unit</span>
            {" · "}
            <span className="font-mono font-semibold">{units}</span> units
            {" · "}
            Total: <span className="font-mono font-semibold text-teal-700">${totalAmount.toFixed(2)}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default BillingSectionFields;
