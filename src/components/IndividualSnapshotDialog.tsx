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
  Stethoscope,
  PenLine,
  ChevronRight,
  User,
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

// Deterministic mock 30-day activity per person.
function getActivitiesFor(person: Person): SnapshotActivity[] {
  const base: SnapshotActivity[] = [
    { icon: FileText, date: "Apr 27", type: "Progress Note", detail: "Quarterly check-in at residence (AI pre-filled draft).", tone: "default" },
    { icon: Stethoscope, date: "Apr 22", type: "Contact Note", detail: "Phone advocacy with provider re: satisfaction concern.", tone: "default" },
    { icon: Calendar, date: "Apr 18", type: "Visit Summary", detail: "In-person visit completed; mother reported behavioral changes.", tone: "warn" },
    { icon: ClipboardList, date: "Apr 14", type: "Monitoring Form", detail: "Monthly home safety monitoring submitted.", tone: "good" },
    { icon: AlertTriangle, date: "Apr 09", type: "Incident", detail: "Low-severity medication error logged; follow-up assigned.", tone: "danger" },
    { icon: Heart, date: "Apr 03", type: "Assessment", detail: "Annual health assessment — 12 days overdue.", tone: "warn" },
  ];
  // Light personalization
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
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
              {selected ? `${selected.firstName} ${selected.lastName} — Snapshot` : "Individual Snapshot"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/80 text-xs">
            {selected
              ? "Last 30 days of case management activity. Create new documentation right from here."
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
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", toneClass[p.aiFlag.tone === "urgent" ? "danger" : p.aiFlag.tone === "attention" ? "warn" : "default"])}>
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
          <div className="flex flex-col max-h-[70vh]">
            {/* Person summary */}
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <PersonAvatar person={selected} size={48} shape="circle" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {selected.firstName} {selected.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.gender} · Age {selected.age} · {selected.county}
                  {selected.serviceContact ? ` · CM: ${selected.serviceContact}` : ""}
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

            {/* Chat-style AI intro */}
            <div className="px-6 pt-4">
              <div className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 px-4 py-3 text-sm text-foreground">
                  Here's <strong>{selected.firstName}</strong>'s case management snapshot for the
                  last 30 days. I count{" "}
                  <strong>{getActivitiesFor(selected).length} activities</strong>
                  {selected.aiFlag ? <> and <strong>1 active flag</strong>: {selected.aiFlag.label}.</> : "."} Use the quick actions below to
                  create any new documentation right from here.
                </div>
              </div>
            </div>

            {/* Activity timeline */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-2">
                Last 30 days
              </p>
              <ul className="space-y-2">
                {getActivitiesFor(selected).map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
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

            {/* Quick actions */}
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-2">
                Create new
              </p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.label}
                      onClick={() => {
                        onOpenChange(false);
                        navigate(a.path(selected.id));
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-foreground">{a.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => demoToast("Snapshot exported to clipboard")}
                  className="text-xs"
                >
                  <User className="w-3.5 h-3.5 mr-1" />
                  Copy snapshot
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
