import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ArrowRight } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { people, initials, riskAvatarClass, type Person } from "@/data/people";
import { cn } from "@/lib/utils";

type DocKind = "contact-note" | "progress-note" | "visit-summary" | "monitoring-form";

const META: Record<
  DocKind,
  { title: string; subtitle: string; backTo: string; backLabel: string; route: (id: string) => string }
> = {
  "contact-note": {
    title: "Contact Note",
    subtitle: "Document a contact or activity for an individual.",
    backTo: "/dashboard",
    backLabel: "Dashboard",
    route: (id) => `/people/${id}/contact-note`,
  },
  "progress-note": {
    title: "Progress Note",
    subtitle: "Document progress toward outcomes for an individual.",
    backTo: "/dashboard",
    backLabel: "Dashboard",
    route: (id) => `/people/${id}/progress-note/new`,
  },
  "visit-summary": {
    title: "Visit Summary",
    subtitle: "Summarize an in-person or virtual visit for an individual.",
    backTo: "/dashboard",
    backLabel: "Dashboard",
    route: (id) => `/people/${id}/visit-summary/new`,
  },
  "monitoring-form": {
    title: "Monitoring Form",
    subtitle: "Start a monitoring review form for an individual.",
    backTo: "/dashboard",
    backLabel: "Dashboard",
    route: (id) => `/people/${id}/monitoring-form/new`,
  },
};

export function DocumentationStart({ kind }: { kind: DocKind }) {
  const navigate = useNavigate();
  const meta = META[kind];
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<Person | null>(null);

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

  const handleContinue = () => {
    if (!selected) return;
    navigate(meta.route(selected.id));
  };

  return (
    <ICMShell title={meta.title} showAIPanel={false}>
      <div className="space-y-5 max-w-3xl">
        <button
          onClick={() => navigate(meta.backTo)}
          className="inline-flex items-center gap-1.5 text-[14px] font-geist font-bold text-icm-text hover:text-icm-accent"
        >
          <ChevronLeft className="w-4 h-4" /> {meta.backLabel}
        </button>

        <div>
          <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            New {meta.title}
          </h1>
          <p className="text-[13px] text-icm-text-dim font-geist mt-1">{meta.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-6">
          <h2 className="font-manrope font-bold text-[15px] text-icm-text mb-4">Visit Details</h2>

          {/* Person Supported searchable dropdown */}
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-icm-text-dim mb-1.5">
              Person Supported<span className="text-red-500 ml-0.5">*</span>
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 rounded-lg border border-icm-border bg-white px-3 h-11 text-left hover:border-icm-accent transition-colors"
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
                    <span className="text-[13px] text-icm-text font-medium">
                      {selected.lastName}, {selected.firstName}
                    </span>
                    <span className="ml-auto text-[11px] font-mono text-icm-text-faint">
                      {selected.id}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-icm-text-faint">
                    Select the individual this {meta.title.toLowerCase()} is for…
                  </span>
                )}
              </button>

              {open && (
                <div className="absolute z-20 mt-1 left-0 right-0 rounded-xl border border-icm-border bg-white shadow-xl overflow-hidden">
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
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-icm-border">
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
                          setSelected(p);
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

            <p className="text-[11.5px] text-icm-text-dim mt-2">
              Pick an individual to continue. The full {meta.title.toLowerCase()} form will open
              pre-filled with their information.
            </p>
          </label>

          <div className="flex items-center justify-end gap-2 mt-6 pt-5 border-t border-icm-border">
            <button
              onClick={() => navigate(meta.backTo)}
              className="h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] font-medium text-icm-text hover:bg-icm-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={!selected}
              className="h-9 px-4 rounded-lg bg-icm-text text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-icm-text/90 transition-colors"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </ICMShell>
  );
}

export default DocumentationStart;
