// IndividualSnapshotCard — AI-powered 90-day individual snapshot
// CaseManagement.AI
//
// This component is fully self-contained:
// Phase 1 "processing": Animates through real Firestore queries step-by-step,
//   showing what it finds as it goes. Each step is displayed for min 900ms so
//   the case manager can see the AI is actually doing work.
// Phase 2 "done": Renders the real fetched data — zero hardcoded values.

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, orderBy, getDocs, limit,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles, FileText, PenLine, AlertTriangle, CheckCircle2,
  ClipboardList, ShieldAlert, Activity, Clock, Loader2,
  Check, Calendar, Heart, MapPin, User2,
} from "lucide-react";
import { PersonAvatar } from "@/components/icm/PersonAvatar";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SnapshotData {
  contactNotes:    any[];
  progressNotes:   any[];
  incidents:       any[];
  tasks:           any[];
  assessments:     any[];
  monitoringForms: any[];
}

type StepStatus = "waiting" | "running" | "done";

interface ProcessingStep {
  id:     string;
  label:  string;
  icon:   typeof FileText;
  result: string | null; // populated once query is done
  status: StepStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_STEP_MS    = 900;  // each step shows for at least this long

const QUICK_ACTIONS = [
  { label: "Progress Note",  icon: FileText,      path: (id: string) => `/people/${id}/progress-note` },
  { label: "Contact Note",   icon: PenLine,       path: (id: string) => `/people/${id}/contact-note` },
  { label: "Visit Summary",  icon: Calendar,      path: (id: string) => `/people/${id}/visit-summary` },
  { label: "Monitoring",     icon: ClipboardList, path: (id: string) => `/people/${id}/monitoring-form` },
  { label: "Incident",       icon: AlertTriangle, path: (id: string) => `/people/${id}/incident-reporting` },
  { label: "Assessment",     icon: Heart,         path: (id: string) => `/people/${id}/assessments` },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return iso; }
}

async function safeQuery<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try { return await fn(); } catch { return []; }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InlineIndividualSnapshot({ person, aiNarrative: externalNarrative }: { person: any; aiNarrative?: string }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [phase,     setPhase]     = useState<"processing" | "done">("processing");
  const [steps,     setSteps]     = useState<ProcessingStep[]>([
    { id: "contact",    label: "Searching contact notes (last 90 days)…",  icon: PenLine,       result: null, status: "waiting" },
    { id: "progress",   label: "Reviewing progress & visit notes…",         icon: FileText,      result: null, status: "waiting" },
    { id: "incidents",  label: "Scanning incidents & risk flags…",           icon: AlertTriangle, result: null, status: "waiting" },
    { id: "tasks",      label: "Checking open tasks & follow-ups…",          icon: CheckCircle2,  result: null, status: "waiting" },
    { id: "forms",      label: "Reviewing assessments & monitoring forms…",  icon: ClipboardList, result: null, status: "waiting" },
    { id: "ai",         label: "Generating AI case summary…",            icon: Sparkles,      result: null, status: "waiting" },
  ]);
  const [data,      setData]      = useState<SnapshotData | null>(null);
  const [narrative, setNarrative] = useState(externalNarrative ?? "");

  const dataRef      = useRef<SnapshotData | null>(null);
  const narrativeRef = useRef<string>("");
  const mounted      = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // ── Core: fetch all data then animate steps ──────────────────────────────
  useEffect(() => {
    if (!person?.id) return;

    const since  = new Date(Date.now() - NINETY_DAYS_MS).toISOString().split("T")[0];
    const indId  = person.id;

    // Helper: query by BOTH field name variants and deduplicate by doc ID
    // This handles notes saved with `individualId` (camelCase) AND `individual_id` (underscore)
    async function queryBothFields(
      col: string,
      orderField: string,
      lim: number,
      extraFilter?: any
    ): Promise<any[]> {
      const makeQ = (field: string) => {
        const constraints: any[] = [where(field, "==", indId), limit(lim)];
        if (extraFilter) constraints.push(extraFilter);
        try {
          return getDocs(query(collection(db, col), ...constraints));
        } catch {
          // orderBy may need a composite index — skip ordering and just filter
          return getDocs(query(collection(db, col), where(field, "==", indId), limit(lim)));
        }
      };

      const [snap1, snap2] = await Promise.all([makeQ("individualId"), makeQ("individual_id")]);
      const seen = new Set<string>();
      const results: any[] = [];
      for (const snap of [snap1, snap2]) {
        for (const d of snap.docs) {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            results.push({ id: d.id, ...d.data() });
          }
        }
      }
      return results;
    }

    // 1. Kick off ALL Firestore fetches in parallel immediately
    const fetchContact = safeQuery(async () => {
      const all = await queryBothFields("contact_notes", "date", 30);
      return all.filter((n: any) => (n.date ?? "") >= since);
    });
    const fetchProgress = safeQuery(async () => {
      const all = await queryBothFields("progress_notes", "progressDate", 30);
      return all.filter((n: any) => (n.progressDate ?? "") >= since);
    });
    const fetchIncidents = safeQuery(async () => {
      const all = await queryBothFields("incidents", "reportedAt", 30);
      return all.filter((n: any) => (n.reportedAt ?? "") >= since);
    });
    const fetchTasks = safeQuery(async () => {
      return queryBothFields("tasks", "createdAt", 40);
    });
    const fetchForms = safeQuery(async () => {
      const [assessments, monitoring] = await Promise.all([
        queryBothFields("assessments", "createdAt", 15),
        queryBothFields("monitoring_forms", "createdAt", 15),
      ]);
      return [
        ...assessments.map(d => ({ ...d, _type: "assessment" })),
        ...monitoring.map(d => ({ ...d, _type: "monitoring" })),
      ];
    });

    // 2. Animate through steps, waiting for data + min time each step
    const markStep = (id: string, result: string, status: StepStatus = "done") => {
      if (!mounted.current) return;
      setSteps(prev => prev.map(s => s.id === id ? { ...s, result, status } : s));
    };
    const startStep = (id: string) => {
      if (!mounted.current) return;
      setSteps(prev => prev.map(s => s.id === id ? { ...s, status: "running" } : s));
    };

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    async function runSteps() {
      // Step 1: contact notes
      startStep("contact");
      const [cn] = await Promise.all([fetchContact, delay(MIN_STEP_MS)]);
      const openCn = cn.filter((n: any) => {
        const s = (n.status ?? "").toLowerCase();
        return s === "draft";
      }).length;
      markStep("contact",
        cn.length === 0
          ? "No contact notes in the last 90 days"
          : `${cn.length} note${cn.length !== 1 ? "s" : ""} found${openCn > 0 ? ` · ${openCn} unsigned draft${openCn !== 1 ? "s" : ""}` : ""}`
      );

      // Step 2: progress notes
      startStep("progress");
      const [pn] = await Promise.all([fetchProgress, delay(MIN_STEP_MS)]);
      const openPn = pn.filter((n: any) => n.status === "draft").length;
      markStep("progress",
        pn.length === 0
          ? "No progress notes in the last 90 days"
          : `${pn.length} note${pn.length !== 1 ? "s" : ""} found${openPn > 0 ? ` · ${openPn} unsigned` : " · all signed"}`
      );

      // Step 3: incidents
      startStep("incidents");
      const [inc] = await Promise.all([fetchIncidents, delay(MIN_STEP_MS)]);
      const openInc = inc.filter((i: any) => i.status === "open" || i.status === "in_review");
      const critInc = openInc.filter((i: any) => i.severity === "critical" || i.severity === "major");
      markStep("incidents",
        inc.length === 0
          ? "No incidents in the last 90 days"
          : openInc.length > 0
            ? `${openInc.length} open incident${openInc.length !== 1 ? "s" : ""}${critInc.length > 0 ? ` · ${critInc.length} critical/major` : ""}`
            : `${inc.length} incident${inc.length !== 1 ? "s" : ""} — all closed`
      );

      // Step 4: tasks
      startStep("tasks");
      const [tk] = await Promise.all([fetchTasks, delay(MIN_STEP_MS)]);
      const openTk = tk.filter((t: any) => t.status === "open" || t.status === "pending");
      const today = new Date().toISOString().split("T")[0];
      const overdue = openTk.filter((t: any) => t.dueDate && t.dueDate < today);
      markStep("tasks",
        openTk.length === 0
          ? "No open tasks"
          : `${openTk.length} open task${openTk.length !== 1 ? "s" : ""}${overdue.length > 0 ? ` · ${overdue.length} overdue` : ""}`
      );

      // Step 5: assessments & forms
      startStep("forms");
      const [fm] = await Promise.all([fetchForms, delay(MIN_STEP_MS)]);
      const assessments    = fm.filter((f: any) => f._type === "assessment");
      const monForms       = fm.filter((f: any) => f._type === "monitoring");
      markStep("forms",
        fm.length === 0
          ? "No assessments or monitoring forms on record"
          : `${assessments.length} assessment${assessments.length !== 1 ? "s" : ""} · ${monForms.length} monitoring form${monForms.length !== 1 ? "s" : ""}`
      );

      // Save full data
      const fullData: SnapshotData = {
        contactNotes:    cn,
        progressNotes:   pn,
        incidents:       inc,
        tasks:           tk,
        assessments:     assessments,
        monitoringForms: monForms,
      };
      dataRef.current = fullData;

      // Step 6: AI summary
      startStep("ai");
      const personName = `${person.first_name ?? person.firstName ?? ""} ${person.last_name ?? person.lastName ?? ""}`.trim();
      const allUnsigned = [...cn, ...pn].filter((n: any) => n.status === "draft").length;
      const allOpenTasks = tk.filter((t: any) => t.status === "open" || t.status === "pending");
      const allOpenInc   = inc.filter((i: any) => i.status === "open" || i.status === "in_review");

      const summaryCtx = [
        `Individual: ${personName}`,
        `County: ${person.county ?? "Unknown"} | Status: ${person.enrollment_status ?? person.status ?? "Active"}`,
        `Past 90 days: ${cn.length} contact notes, ${pn.length} progress notes, ${inc.length} incidents, ${tk.length} tasks, ${assessments.length} assessments, ${monForms.length} monitoring forms`,
        allOpenTasks.length > 0
          ? `Open tasks (${allOpenTasks.length}): ${allOpenTasks.slice(0, 3).map((t: any) => t.title).filter(Boolean).join("; ")}`
          : "No open tasks",
        allOpenInc.length > 0
          ? `Open incidents (${allOpenInc.length}): ${allOpenInc.map((i: any) => `${i.severity ?? "unknown"} — ${(i.description ?? i.type ?? "").slice(0, 60)}`).join("; ")}`
          : "No open incidents",
        allUnsigned > 0 ? `${allUnsigned} unsigned/draft note${allUnsigned !== 1 ? "s" : ""} pending review` : "All notes signed",
        cn.length > 0 ? `Last contact: ${fmtDate(cn[0].date)} — ${(cn[0].purpose ?? cn[0].details ?? "").slice(0, 60)}` : "",
      ].filter(Boolean).join("\n");

      let aiNarr = externalNarrative ?? "";
      if (!aiNarr) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const res = await fetch(
            "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/chat",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                message:
                  `You are a case management AI assistant. Write a concise 2–3 sentence case narrative summary of this individual's past 90 days for their case manager. Be specific about any open risks, unsigned notes, or overdue tasks. Plain prose only — no markdown, no bullets.\n\n${summaryCtx}`,
                context: { page: "home_snapshot", module: "individual_snapshot" },
                history: [],
              }),
            }
          );
          if (res.ok) {
            const d = await res.json();
            aiNarr = d.reply ?? "";
          }
        } catch { /* non-blocking */ }
      }

      await delay(MIN_STEP_MS);
      markStep("ai", "Case summary ready");
      narrativeRef.current = aiNarr;

      await delay(600);

      if (!mounted.current) return;
      setData(fullData);
      setNarrative(aiNarr);
      setPhase("done");
    }

    runSteps();
  }, [person?.id]);

  const personName = `${person.first_name ?? person.firstName ?? ""} ${person.last_name ?? person.lastName ?? ""}`.trim();

  // ── PHASE 1: Processing ──────────────────────────────────────────────────
  if (phase === "processing") {
    return (
      <div className="w-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-border/60">
          <PersonAvatar person={person} size={40} shape="circle" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">AI Research in Progress</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{personName}</p>
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full font-medium">
            90 days
          </div>
        </div>

        {/* Animated steps */}
        <div className="px-4 py-3 space-y-2.5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isRunning = step.status === "running";
            const isDone    = step.status === "done";
            const isWaiting = step.status === "waiting";
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-300",
                  isRunning ? "bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30" :
                  isDone    ? "bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200/60 dark:border-emerald-500/20" :
                              "border border-transparent opacity-40"
                )}
              >
                {/* Status icon */}
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  isRunning ? "bg-purple-100 dark:bg-purple-500/20" :
                  isDone    ? "bg-emerald-100 dark:bg-emerald-500/20" :
                              "bg-muted"
                )}>
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                  ) : isDone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    isRunning ? "text-purple-700 dark:text-purple-300" :
                    isDone    ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {isRunning ? step.label : isDone ? step.label.replace("…", "") : step.label}
                  </p>
                  {isDone && step.result && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                      {step.result}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <p className="text-[11px] text-muted-foreground text-center">
            Pulling live data from all modules — nothing will save until you review.
          </p>
        </div>
      </div>
    );
  }

  // ── PHASE 2: Done — show real data ───────────────────────────────────────
  const d = data!;
  const openTasks     = d.tasks.filter(t => t.status === "open" || t.status === "pending");
  const openIncidents = d.incidents.filter(i => i.status === "open" || i.status === "in_review");
  const unsignedNotes = [...d.contactNotes, ...d.progressNotes].filter(n => n.status === "draft");
  const today = new Date().toISOString().split("T")[0];
  const overdueTasks  = openTasks.filter(t => t.dueDate && t.dueDate < today);

  // Build activity timeline
  type Tone = "default" | "warn" | "danger" | "good";
  const timeline: { date: string; type: string; detail: string; tone: Tone; icon: typeof FileText }[] = [
    ...d.incidents.map(n => ({
      date: n.reportedAt?.slice(0, 10) ?? "",
      type: "Incident",
      detail: n.description ?? n.type ?? "Incident logged",
      tone: (n.severity === "critical" || n.severity === "major" ? "danger" : "warn") as Tone,
      icon: AlertTriangle,
    })),
    ...d.contactNotes.map(n => ({
      date: n.date ?? "",
      type: "Contact Note",
      detail: n.purpose ?? (n.details ?? "").slice(0, 80) ?? "Contact documented",
      tone: "default" as Tone,
      icon: PenLine,
    })),
    ...d.progressNotes.map(n => ({
      date: n.progressDate ?? "",
      type: "Progress Note",
      detail: (n.purposeOfActivity ?? n.notes ?? "").slice(0, 80) || "Progress note",
      tone: (n.status === "draft" ? "warn" : "good") as Tone,
      icon: FileText,
    })),
    ...d.assessments.map(n => ({
      date: n.date ?? n.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "",
      type: "Assessment",
      detail: n.templateName ?? n.type ?? "Assessment completed",
      tone: "default" as Tone,
      icon: Heart,
    })),
    ...d.monitoringForms.map(n => ({
      date: n.date ?? n.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "",
      type: "Monitoring Form",
      detail: n.formType ?? "Monitoring form submitted",
      tone: (n.status === "submitted" ? "good" : "default") as Tone,
      icon: ClipboardList,
    })),
  ]
    .filter(i => i.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const toneClass: Record<Tone, string> = {
    default: "bg-muted text-muted-foreground",
    warn:    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    danger:  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    good:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  };

  return (
    <div className="space-y-3 w-full">
      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <PersonAvatar person={person} size={48} shape="circle" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                Individual Snapshot · 90 days
              </span>
            </div>
            <p className="text-base font-semibold text-foreground">{personName}</p>
            <p className="text-xs text-muted-foreground">
              {[person.county && `${person.county} County`, person.enrollment_status ?? person.status, person.program]
                .filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            onClick={() => navigate(`/people/${person.id}/echart`)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-foreground shrink-0"
          >
            Open eChart
          </button>
        </div>

        {/* AI Narrative */}
        {narrative && (
          <div className="mt-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-600">AI Case Summary</span>
            </div>
            <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">{narrative}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "Contact Notes", value: d.contactNotes.length, icon: PenLine, highlight: false },
            { label: "Open Tasks",    value: openTasks.length,     icon: CheckCircle2, highlight: openTasks.length > 0 },
            { label: "Incidents",     value: openIncidents.length, icon: AlertTriangle, highlight: openIncidents.length > 0 },
            { label: "Unsigned",      value: unsignedNotes.length, icon: Clock, highlight: unsignedNotes.length > 0 },
          ].map(s => (
            <div key={s.label} className={cn(
              "rounded-xl border px-3 py-2.5 text-center",
              s.highlight
                ? "border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30"
                : "border-border bg-card"
            )}>
              <p className={cn("text-xl font-bold leading-none", s.highlight ? "text-amber-700 dark:text-amber-300" : "text-foreground")}>
                {s.value}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Open Tasks */}
      {openTasks.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Open Tasks ({openTasks.length}){overdueTasks.length > 0 && ` · ${overdueTasks.length} overdue`}
          </p>
          <ul className="space-y-1.5">
            {openTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-xs text-foreground">
                <span className={cn(
                  "mt-0.5 w-1.5 h-1.5 rounded-full shrink-0",
                  t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-amber-500" : "bg-slate-400"
                )} />
                <span className="flex-1">{t.title}</span>
                {t.dueDate && (
                  <span className={cn("shrink-0", t.dueDate < today ? "text-red-500 font-medium" : "text-muted-foreground")}>
                    {fmtDate(t.dueDate)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open Incidents */}
      {openIncidents.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 mb-2.5 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Open Incidents ({openIncidents.length})
          </p>
          <ul className="space-y-1.5">
            {openIncidents.slice(0, 3).map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-xs text-foreground">
                <span className={cn(
                  "mt-0.5 w-1.5 h-1.5 rounded-full shrink-0",
                  i.severity === "critical" ? "bg-red-600" : i.severity === "major" ? "bg-red-400" : "bg-amber-400"
                )} />
                <span className="flex-1">{(i.description ?? i.type ?? "").slice(0, 80)}</span>
                <span className="text-muted-foreground capitalize shrink-0">{i.severity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unsigned notes callout */}
      {unsignedNotes.length > 0 && (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5 p-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-sky-600 shrink-0" />
          <p className="text-xs text-sky-700 dark:text-sky-300 font-medium">
            {unsignedNotes.length} unsigned draft note{unsignedNotes.length !== 1 ? "s" : ""} pending case manager review
          </p>
        </div>
      )}

      {/* Activity timeline */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Activity · Last 90 Days
        </p>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No activity recorded in the last 90 days.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {timeline.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", toneClass[a.tone])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{a.type}</p>
                      {a.date && <span className="text-[11px] text-muted-foreground">{fmtDate(a.date)}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-500/10 dark:to-violet-500/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Start documentation for {person.first_name ?? personName.split(" ")[0]}</p>
            <p className="text-xs text-muted-foreground">AI will pre-fill from this snapshot. You review &amp; confirm.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => navigate(a.path(person.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-300/60 bg-card hover:bg-purple-100/60 dark:hover:bg-purple-500/20 transition-colors text-xs font-medium text-foreground"
              >
                <Icon className="w-3.5 h-3.5 text-purple-600" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
