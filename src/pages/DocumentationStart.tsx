import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, Save, Send, Printer, Sparkles, FileText, ChevronDown } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { people, initials, riskAvatarClass, type Person } from "@/data/people";
import { cn } from "@/lib/utils";

type DocKind = "contact-note" | "progress-note" | "visit-summary" | "monitoring-form";

const META: Record<
  DocKind,
  {
    shellTitle: string;
    /** Header back link label, matches the list page name. */
    backLabel: string;
    /** Where back arrow goes (we use dashboard since this is the dashboard entry). */
    backTo: string;
    /** Card title shown above the fields (matches the eChart form). */
    cardTitle: string;
    /** Primary submit button label. */
    submitLabel: string;
    /** Banner copy after person is picked. */
    bannerCopy: (firstName: string) => string;
    /** Destination route once a person is selected. */
    route: (id: string) => string;
  }
> = {
  "contact-note": {
    shellTitle: "Contact Note",
    backLabel: "Contact Notes",
    backTo: "/dashboard",
    cardTitle: "Note Details",
    submitLabel: "Sign & submit",
    bannerCopy: (n) =>
      `Pre-filled from ambient session 04/27/2026. Contact details drafted for ${n}. Review and edit before signing.`,
    route: (id) => `/people/${id}/contact-note`,
  },
  "progress-note": {
    shellTitle: "Progress Note",
    backLabel: "Progress Notes",
    backTo: "/dashboard",
    cardTitle: "Note Details",
    submitLabel: "Sign & submit",
    bannerCopy: (n) =>
      `Pre-filled from ambient session 04/27/2026. Progress observations drafted for ${n}'s active goals. Review and edit before signing.`,
    route: (id) => `/people/${id}/progress-note/new`,
  },
  "visit-summary": {
    shellTitle: "Visit Summary",
    backLabel: "Visit Summaries",
    backTo: "/dashboard",
    cardTitle: "Visit Details",
    submitLabel: "Submit",
    bannerCopy: (n) =>
      `Pre-filled from ambient session 04/27/2026. Visit summary drafted for ${n}. Review and edit before submitting.`,
    route: (id) => `/people/${id}/visit-summary/new`,
  },
  "monitoring-form": {
    shellTitle: "Monitoring Form",
    backLabel: "Monitoring Forms",
    backTo: "/dashboard",
    cardTitle: "Follow Up Form Information",
    submitLabel: "Submit",
    bannerCopy: (n) =>
      `Pre-filled from recent contact notes, visit summaries, and risk flags for ${n}. Review and edit before submitting.`,
    route: (id) => `/people/${id}/monitoring-form/new`,
  },
};

export function DocumentationStart({ kind }: { kind: DocKind }) {
  const navigate = useNavigate();
  const meta = META[kind];

  const [selected, setSelected] = useState<Person | null>(null);

  // Once a person is selected, navigate to the real form after a short beat
  // so the user sees their pick reflected in the field first.
  useEffect(() => {
    if (!selected) return;
    const t = window.setTimeout(() => navigate(meta.route(selected.id)), 280);
    return () => window.clearTimeout(t);
  }, [selected, meta, navigate]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <ICMShell title={meta.shellTitle} showAIPanel={false}>
      <div className="space-y-5">
        {/* Header — matches eChart form chrome */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button
              onClick={() => navigate(meta.backTo)}
              className="inline-flex items-center gap-1.5 text-[14px] font-geist font-bold text-icm-text hover:text-icm-accent mb-2"
            >
              <ChevronLeft className="w-4 h-4" /> {meta.backLabel}
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text">
                {today}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-icm-accent-soft text-icm-accent text-[11px] font-semibold">
                Draft
              </span>
              <span className="text-[11px] text-icm-text-faint font-geist">
                Not started · Pick an individual to begin
              </span>
            </div>
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] mt-2">
              {selected ? `${selected.lastName}, ${selected.firstName}` : "New " + meta.shellTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] font-medium text-icm-text-dim inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" /> Save draft
            </button>
            <button
              disabled
              className="h-9 px-3.5 rounded-lg bg-icm-text text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 opacity-40 cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" /> {meta.submitLabel}
            </button>
            <button
              disabled
              className="h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] font-medium text-icm-text-dim inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* AI banner */}
        <div className="rounded-xl border border-icm-accent/30 bg-icm-accent-soft/40 px-4 py-3 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-icm-accent to-purple-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-[12.5px] text-icm-text leading-relaxed">
            <span className="font-bold">Ready when you are.</span>{" "}
            {selected
              ? meta.bannerCopy(selected.firstName)
              : `Select the individual this ${meta.shellTitle.toLowerCase()} is for. The full form will load with AI-suggested fields pre-filled from their recent activity.`}
          </p>
        </div>

        {/* Form card — matches eChart layout */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-icm-text" />
            <h2 className="font-manrope font-bold text-[15px] text-icm-text">
              {meta.cardTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Person Supported — the active searchable dropdown */}
            <PersonSupportedDropdown selected={selected} onSelect={setSelected} kind={kind} />

            <DisabledField label="Activity Type" placeholder="—" />
            <DisabledField label="Progress Date" placeholder="MM/DD/YYYY" />
            <DisabledField label="Contact Type" placeholder="—" />
            <DisabledField label="Start Time" placeholder="--:-- --" />
            <DisabledField label="End Time" placeholder="--:-- --" />
          </div>

          <p className="text-[11.5px] text-icm-text-dim mt-5">
            Other fields will populate after you pick an individual.
          </p>
        </div>
      </div>
    </ICMShell>
  );
}

function PersonSupportedDropdown({
  selected,
  onSelect,
  kind,
}: {
  selected: Person | null;
  onSelect: (p: Person) => void;
  kind: DocKind;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => people.filter((p) => p.status === "Active"), []);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return active;
    return active.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
    );
  }, [active, q]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-icm-text-dim mb-1.5">
        Person Supported<span className="text-red-500 ml-0.5">*</span>
      </label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg border bg-white px-3 h-11 text-left transition-colors",
          selected ? "border-icm-accent/60" : "border-icm-border hover:border-icm-accent"
        )}
      >
        {selected ? (
          <>
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0",
                riskAvatarClass(selected.riskScore)
              )}
            >
              {initials(selected)}
            </div>
            <span className="text-[13px] text-icm-text font-medium truncate">
              {selected.lastName}, {selected.firstName}
            </span>
            <span className="ml-auto text-[11px] font-mono text-icm-text-faint">{selected.id}</span>
          </>
        ) : (
          <>
            <span className="text-[13px] text-icm-text-faint truncate">
              Select the individual this {kind.replace("-", " ")} is for…
            </span>
            <ChevronDown className="ml-auto w-4 h-4 text-icm-text-faint" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 left-0 right-0 rounded-xl border border-icm-border bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-icm-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-icm-text-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search individuals…"
                className="w-full h-9 pl-8 pr-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text outline-none focus:border-icm-accent"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto divide-y divide-icm-border">
            {list.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-icm-text-dim">
                No individuals found
              </div>
            )}
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                  setQ("");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-icm-bg transition-colors"
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0",
                    riskAvatarClass(p.riskScore)
                  )}
                >
                  {initials(p)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-icm-text truncate">
                    {p.firstName} {p.lastName}
                  </p>
                </div>
                <span className="text-[10.5px] font-mono text-icm-text-faint">{p.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DisabledField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-icm-text-dim mb-1.5">
        {label}
      </label>
      <div className="w-full h-11 rounded-lg border border-dashed border-icm-border bg-icm-bg/60 px-3 flex items-center text-[13px] text-icm-text-faint italic">
        {placeholder}
      </div>
    </div>
  );
}

export default DocumentationStart;
