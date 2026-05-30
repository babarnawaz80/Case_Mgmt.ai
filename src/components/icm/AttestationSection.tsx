/**
 * AttestationSection — participant/guardian acknowledgement block.
 * Rendered at the bottom of Monitoring Form, Visit Summary, and Care Plan.
 *
 * Props:
 *   value    — current attestation state (controlled)
 *   onChange — callback when any field changes
 *   readOnly — disable all inputs (on submitted/approved forms)
 *
 * The parent is responsible for storing the value and logging the audit
 * event when the form is saved/submitted.
 */

export interface AttestationValue {
  attested: boolean;           // checkbox
  attested_by_name: string;    // who attested
  relationship: "Individual" | "Guardian" | "Authorized Representative" | "";
  method: "In-person" | "Phone" | "Portal" | "";
  date_time: string;           // ISO datetime auto-filled on first check
}

export const EMPTY_ATTESTATION: AttestationValue = {
  attested: false,
  attested_by_name: "",
  relationship: "",
  method: "",
  date_time: "",
};

interface Props {
  value: AttestationValue;
  onChange: (v: AttestationValue) => void;
  readOnly?: boolean;
}

export function AttestationSection({ value, onChange, readOnly = false }: Props) {
  function field<K extends keyof AttestationValue>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...value, [key]: e.target.value });
    };
  }

  function handleCheck(checked: boolean) {
    onChange({
      ...value,
      attested: checked,
      // Auto-populate date/time on first check
      date_time: checked && !value.date_time
        ? new Date().toISOString()
        : value.date_time,
    });
  }

  const displayDT = value.date_time
    ? new Date(value.date_time).toLocaleString(undefined, {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 mt-5">
      <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-icm-border">
        <h3 className="text-[11px] uppercase tracking-wider text-icm-text font-mono font-bold">
          Attestation
        </h3>
      </div>

      {/* Acknowledgement checkbox */}
      <label className="flex items-start gap-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={value.attested}
          disabled={readOnly}
          onChange={(e) => handleCheck(e.target.checked)}
          className="mt-0.5 rounded border-icm-border w-4 h-4 shrink-0"
        />
        <span className={`text-[13px] font-geist leading-snug ${value.attested ? "text-icm-text font-medium" : "text-icm-text-dim"}`}>
          Participant / Guardian has reviewed and acknowledged this document.
        </span>
      </label>

      {/* Detail fields — shown when attested */}
      {value.attested && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">
              Name (who attested)
            </span>
            <input
              type="text"
              disabled={readOnly}
              value={value.attested_by_name}
              onChange={field("attested_by_name")}
              placeholder="Full name"
              className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text disabled:bg-icm-bg disabled:text-icm-text-dim"
            />
          </label>

          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">
              Relationship
            </span>
            <select
              disabled={readOnly}
              value={value.relationship}
              onChange={field("relationship")}
              className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text disabled:bg-icm-bg disabled:text-icm-text-dim appearance-none"
            >
              <option value="">— Select —</option>
              <option value="Individual">Individual</option>
              <option value="Guardian">Guardian</option>
              <option value="Authorized Representative">Authorized Representative</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">
              Method
            </span>
            <select
              disabled={readOnly}
              value={value.method}
              onChange={field("method")}
              className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text disabled:bg-icm-bg disabled:text-icm-text-dim appearance-none"
            >
              <option value="">— Select —</option>
              <option value="In-person">In-person</option>
              <option value="Phone">Phone</option>
              <option value="Portal">Portal</option>
            </select>
          </label>

          <div>
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">
              Date & Time (auto-populated)
            </span>
            <div className="h-9 px-3 flex items-center rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-mono text-icm-text-dim">
              {displayDT}
            </div>
          </div>
        </div>
      )}

      {/* Read-only summary */}
      {readOnly && value.attested && (
        <p className="mt-2 text-[11.5px] text-icm-text-dim font-geist">
          Attested by <span className="font-semibold text-icm-text">{value.attested_by_name || "—"}</span>
          {value.relationship && ` (${value.relationship})`}
          {value.method && ` · ${value.method}`}
          {" · "}<span className="font-mono">{displayDT}</span>
        </p>
      )}
    </div>
  );
}
