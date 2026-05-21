import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Search,
  ArrowLeft,
  FileText,
  ClipboardList,
  AlertTriangle,
  Calendar,
  Heart,
  PenLine,
  ChevronRight,
  ShieldAlert,
  Activity,
  Pill,
  Phone,
  MapPin,
  User2,
  ClipboardCheck,
  Copy,
} from "lucide-react";
import { people, type Person } from "@/data/people";
import { PersonAvatar } from "@/components/icm/PersonAvatar";
import { cn } from "@/lib/utils";
import { demoToast } from "@/lib/demoToast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface SnapshotActivity {
  icon: typeof FileText;
  date: string;
  type: string;
  detail: string;
  tone: "default" | "warn" | "danger" | "good";
}

interface AlertItem {
  tone: "danger" | "warn" | "info";
  label: string;
}

function getAlertsFor(person: Person): AlertItem[] {
  const alerts: AlertItem[] = [];
  if (person.aiFlag?.tone === "urgent") alerts.push({ tone: "danger", label: person.aiFlag.label });
  if (person.aiFlag?.tone === "attention") alerts.push({ tone: "warn", label: person.aiFlag.label });
  alerts.push({ tone: "warn", label: "2 unsigned contact notes from last week" });
  alerts.push({ tone: "info", label: "Monitoring form due in 7 days" });
  if (person.allergies && person.allergies !== "None known")
    alerts.push({ tone: "warn", label: `Allergy on file: ${person.allergies}` });
  return alerts;
}

function getActivitiesFor(person: Person): SnapshotActivity[] {
  const base: SnapshotActivity[] = [
    { icon: FileText, date: "Apr 27", type: "Progress Note", detail: "Quarterly check-in at residence (AI pre-filled draft).", tone: "default" },
    { icon: Phone, date: "Apr 22", type: "Contact Note", detail: "Phone advocacy with provider re: satisfaction concern.", tone: "default" },
    { icon: Calendar, date: "Apr 18", type: "Visit Summary", detail: "In-person visit completed; mother reported behavioral changes.", tone: "warn" },
    { icon: ClipboardList, date: "Apr 14", type: "Monitoring Form", detail: "Monthly home safety monitoring submitted.", tone: "good" },
    { icon: AlertTriangle, date: "Apr 09", type: "Incident", detail: "Low-severity medication error logged; follow-up assigned.", tone: "danger" },
    { icon: Heart, date: "Apr 03", type: "Assessment", detail: "Annual health assessment — 12 days overdue.", tone: "warn" },
  ];
  if (person.aiFlag?.tone === "urgent") {
    base.unshift({
      icon: AlertTriangle,
      date: "Today",
      type: "AI Flag",
      detail: person.aiFlag.detail ?? person.aiFlag.label,
      tone: "danger",
    });
  }
  return base;
}

const QUICK_ACTIONS = [
  { label: "Progress Note", icon: FileText, path: (id: string) => `/people/${id}/progress-note` },
  { label: "Contact Note", icon: PenLine, path: (id: string) => `/people/${id}/contact-note` },
  { label: "Visit Summary", icon: Calendar, path: (id: string) => `/people/${id}/visit-summary` },
  { label: "Monitoring Form", icon: ClipboardList, path: (id: string) => `/people/${id}/monitoring-form` },
  { label: "Incident Report", icon: AlertTriangle, path: (id: string) => `/people/${id}/incident-reporting` },
  { label: "Assessment", icon: Heart, path: (id: string) => `/people/${id}/assessments` },
];

const toneClass: Record<SnapshotActivity["tone"], string> = {
  default: "bg-muted text-muted-foreground",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

const alertStyle: Record<AlertItem["tone"], { dot: string; ring: string; text: string }> = {
  danger: { dot: "bg-red-500", ring: "ring-red-200 dark:ring-red-500/30", text: "text-red-700 dark:text-red-300" },
  warn: { dot: "bg-amber-500", ring: "ring-amber-200 dark:ring-amber-500/30", text: "text-amber-700 dark:text-amber-300" },
  info: { dot: "bg-sky-500", ring: "ring-sky-200 dark:ring-sky-500/30", text: "text-sky-700 dark:text-sky-300" },
};

export function IndividualSnapshotDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.nickname ?? ""}`.toLowerCase().includes(q)
    );
  }, [query]);

  function reset() {
    setSelected(null);
    setQuery("");
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  const activities = selected ? getActivitiesFor(selected) : [];
  const alerts = selected ? getAlertsFor(selected) : [];

  const stats = selected
    ? [
        { label: "Notes (30d)", value: activities.length },
        { label: "Open flags", value: alerts.filter((a) => a.tone !== "info").length },
        { label: "Forms due", value: 2 },
        { label: "Risk", value: selected.riskScore ?? "—" },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
        {/* Purple header */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white">
          <div className="flex items-center gap-2">
            {selected && (
              <button
                onClick={reset}
                className="p-1 -ml-1 rounded hover:bg-white/15 transition-colors"
                aria-label="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Sparkles className="w-5 h-5" />
            <DialogTitle className="text-white text-base font-display">
              {selected ? `Individual Snapshot — ${selected.firstName} ${selected.lastName}` : "Individual Snapshot"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/80 text-xs">
            {selected
              ? "Last 30 days of case management activity. Create documentation right from here."
              : "Pick an individual to see a 30-day case management snapshot."}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        {!selected ? (
          <div className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search individuals…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="mt-3 max-h-[420px] overflow-y-auto divide-y divide-border rounded-lg border border-border">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                >
                  <PersonAvatar person={p} size={36} shape="circle" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.firstName} {p.lastName}
                      {p.nickname ? <span className="text-muted-foreground font-normal"> "{p.nickname}"</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.county} · {p.status} · Updated {p.updatedOn}
                    </p>
                  </div>
                  {p.aiFlag && (
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                      p.aiFlag.tone === "urgent" ? "bg-red-100 text-red-700" :
                      p.aiFlag.tone === "attention" ? "bg-amber-100 text-amber-700" :
                      "bg-sky-100 text-sky-700")}>
                      {p.aiFlag.label}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No individuals match "{query}".
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col max-h-[78vh] bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-900/40 dark:to-background">
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
              {/* User chat bubble */}
              <div className="flex justify-end">
                <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-medium px-4 py-2 rounded-2xl rounded-br-sm shadow-sm">
                  Individual Snapshot for {selected.firstName} {selected.lastName}
                </div>
              </div>

              {/* AI rich snapshot */}
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 space-y-3">
                  {/* Header card */}
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <PersonAvatar person={selected} size={52} shape="circle" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground font-display">
                          Snapshot — {selected.firstName} {selected.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selected.age} · {selected.gender === "M" ? "Male" : "Female"} · DOB {selected.dob} · Updated {selected.updatedOn}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/people/${selected.id}/echart`);
                        }}
                      >
                        Open eChart
                      </Button>
                    </div>

                    {/* Alerts */}
                    {alerts.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" /> Alerts & Flags
                        </p>
                        <div className="space-y-1.5">
                          {alerts.map((a, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg bg-card ring-1 px-3 py-2 text-sm",
                                alertStyle[a.tone].ring,
                                alertStyle[a.tone].text
                              )}
                            >
                              <span className={cn("w-2 h-2 rounded-full", alertStyle[a.tone].dot)} />
                              <span>{a.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stat tiles */}
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {stats.map((s) => (
                        <div
                          key={s.label}
                          className="rounded-xl border border-border bg-card px-3 py-2.5 text-center"
                        >
                          <p className="text-lg font-semibold font-display text-foreground leading-none">
                            {s.value}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1.5">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Demographics + Allergies */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                        <User2 className="w-3.5 h-3.5" /> Demographics
                      </p>
                      <dl className="text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">County</dt>
                          <dd className="text-foreground font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {selected.county}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Status</dt>
                          <dd className="text-foreground font-medium">{selected.status}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Admitted</dt>
                          <dd className="text-foreground font-medium">{selected.admittedOn}</dd>
                        </div>
                        {selected.serviceContact && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">CM</dt>
                            <dd className="text-foreground font-medium truncate ml-2">{selected.serviceContact}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className={cn(
                      "rounded-2xl border p-4",
                      selected.allergies && selected.allergies !== "None known"
                        ? "bg-red-50/60 dark:bg-red-500/5 border-red-200/60 dark:border-red-500/20"
                        : "bg-card border-border"
                    )}>
                      <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Allergies & Notes
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(selected.allergies ?? "None known").split(",").map((a) => (
                          <span key={a} className="text-[11px] px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 font-medium">
                            {a.trim()}
                          </span>
                        ))}
                      </div>
                      {selected.specialInstructions && (
                        <p className="text-xs text-muted-foreground italic">
                          {selected.specialInstructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Activity timeline */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Last 30 days
                    </p>
                    <ul className="space-y-1.5">
                      {activities.map((a, i) => {
                        const Icon = a.icon;
                        return (
                          <li
                            key={i}
                            className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                          >
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", toneClass[a.tone])}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{a.type}</p>
                                <span className="text-[11px] text-muted-foreground">{a.date}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{a.detail}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Convert to Note CTA */}
                  <div className="rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-500/10 dark:to-violet-500/5 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Convert snapshot into a Progress Note</p>
                      <p className="text-xs text-muted-foreground">AI will pre-fill from the last 30 days. You review & apply.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/people/${selected.id}/progress-note`);
                      }}
                      className="bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:opacity-95"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions footer */}
            <div className="px-6 py-3 border-t border-border bg-card/80 backdrop-blur">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mr-1">
                  Create
                </span>
                {QUICK_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.label}
                      onClick={() => {
                        onOpenChange(false);
                        navigate(a.path(selected.id));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors text-xs font-medium text-foreground"
                    >
                      <Icon className="w-3.5 h-3.5 text-purple-600" />
                      {a.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => demoToast("Snapshot copied to clipboard")}
                  className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
