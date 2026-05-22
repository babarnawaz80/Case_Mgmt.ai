import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Save, FileSignature, Printer, FileText,
  Search, Check, ChevronDown,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { people } from "@/data/people";

/**
 * Universal "New Progress Note" entry shown when a user clicks Progress Note
 * from the global dashboard. Visually mirrors PersonProgressNoteDetail so the
 * flow feels continuous. As soon as the user picks an individual from the
 * Person Supported dropdown we navigate to the real person-scoped form.
 */
const ProgressNoteNew = () => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-US");

  return (
    <ICMShell title="Progress Note" showAIPanel={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1.5 text-[14px] font-geist font-bold text-icm-text hover:text-icm-accent mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Progress Notes
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text">
                {today}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 bg-icm-accent-soft text-icm-accent ring-icm-accent/20">
                Draft
              </span>
              <span className="text-[11px] text-icm-text-faint font-geist">
                Not started · Pick an individual to begin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button disabled className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim/60 inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed">
              <Save className="w-3.5 h-3.5" /> Save draft
            </button>
            <button disabled className="h-9 px-3 rounded-xl bg-icm-text/60 text-icm-panel text-[12px] font-medium inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed">
              <FileSignature className="w-3.5 h-3.5" /> Sign &amp; submit
            </button>
            <button disabled className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim/60 inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* AI banner */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-[12.5px] font-geist text-icm-text leading-snug">
            <span className="font-semibold">Ready when you are.</span>{" "}
            <span className="text-icm-text-dim">
              Select the individual this progress note is for. The full form will load with AI-suggested fields pre-filled from their recent ambient session.
            </span>
          </p>
        </div>

        {/* Note Details */}
        <section className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-icm-text-dim" />
            <h2 className="font-manrope font-bold text-[15px] text-icm-text tracking-tight">Note Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Person Supported" required>
              <PersonSearchSelect
                onSelect={(id) => navigate(`/people/${id}/progress-note/new`)}
              />
            </Field>
            <Field label="Activity Type" required>
              <DisabledPlaceholder>—</DisabledPlaceholder>
            </Field>
            <Field label="Progress Date" required>
              <DisabledPlaceholder>MM/DD/YYYY</DisabledPlaceholder>
            </Field>
            <Field label="Contact Type" required>
              <DisabledPlaceholder>—</DisabledPlaceholder>
            </Field>
            <Field label="Start Time" required>
              <DisabledPlaceholder>--:-- --</DisabledPlaceholder>
            </Field>
            <Field label="End Time" required>
              <DisabledPlaceholder>--:-- --</DisabledPlaceholder>
            </Field>
          </div>

          <p className="text-[11.5px] text-icm-text-faint font-geist">
            Other fields will populate after you pick an individual.
          </p>
        </section>
      </div>
    </ICMShell>
  );
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-1">
        {label}{required && <span className="text-icm-red">*</span>}
      </label>
      {children}
    </div>
  );
}

function DisabledPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-9 px-3 rounded-lg border border-dashed border-icm-border bg-icm-bg/40 text-[12.5px] text-icm-text-faint italic font-geist flex items-center">
      {children}
    </div>
  );
}

function PersonSearchSelect({ onSelect }: { onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pickedName, setPickedName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const options = people
    .map((p) => ({ id: p.id, name: `${p.lastName}, ${p.firstName}`, sub: p.county }))
    .filter((o) => !q || o.name.toLowerCase().includes(q));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist focus:outline-none focus:border-icm-accent flex items-center justify-between text-left"
      >
        <span className={pickedName ? "text-icm-text" : "text-icm-text-faint"}>
          {pickedName || "Select the individual this progress note is for…"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-icm-border bg-white shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 h-9 border-b border-icm-border">
            <Search className="w-3.5 h-3.5 text-icm-text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search person…"
              className="flex-1 bg-transparent text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-icm-text-faint">No matches.</div>
            ) : (
              options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setPickedName(o.name);
                    setOpen(false);
                    onSelect(o.id);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] font-geist text-icm-text hover:bg-icm-bg"
                >
                  <span className="truncate">
                    {o.name}
                    <span className="text-icm-text-faint"> · {o.sub}</span>
                  </span>
                  {pickedName === o.name && <Check className="w-3.5 h-3.5 text-icm-accent shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressNoteNew;
