import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ClipboardList,
  Shield,
  BarChart3,
  Home,
  Briefcase,
  Users,
  ChevronRight,
  Pencil,
  Info,
  CheckSquare,
  Square,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ApplyTarget {
  id: string;
  label: string;
  group: string;
  checked: boolean;
  draftOnly?: boolean;
  icon: React.ReactNode;
  preview: { label: string; value: string }[];
  destination: { module: string; mappings: { field: string; target: string }[] };
  confidence?: number;
  possibleDuplicate?: boolean;
  confirmed?: boolean;
}

interface ReviewApplyModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (appliedItems: string[]) => void;
  onEditDraft: () => void;
}

const initialTargets: ApplyTarget[] = [
  {
    id: "contact_note",
    label: "Contact Note",
    group: "Primary",
    checked: true,
    icon: <FileText className="w-4 h-4" />,
    preview: [
      { label: "Contact Type", value: "Family Call" },
      { label: "Participants", value: "Kathy (CM), Individual, Mother" },
      { label: "Reason for Contact", value: "Routine check-in, service review" },
      { label: "Summary", value: "Discussed PCS attendance, Day Hab transportation barriers, interest in Supported Employment, fall incident, LOC renewal timeline." },
      { label: "Action Items", value: "Schedule LOC renewal, draft PCP addendum for SE interest, flag transport barrier." },
      { label: "Next Steps", value: "Follow up in 2 weeks on transportation resolution and LOC scheduling." },
    ],
    destination: {
      module: "Contact Notes Module",
      mappings: [
        { field: "Contact Type", target: "contact_type" },
        { field: "Participants", target: "participants[]" },
        { field: "Reason for Contact", target: "reason" },
        { field: "Summary", target: "narrative_summary" },
        { field: "Next Steps", target: "next_steps" },
      ],
    },
  },
  {
    id: "progress_note",
    label: "Progress / Case Note",
    group: "Primary",
    checked: true,
    icon: <ClipboardList className="w-4 h-4" />,
    preview: [
      { label: "What Happened", value: "Individual reports satisfaction with PCS but frustration with Day Hab transportation." },
      { label: "Updates Since Last Contact", value: "Missed Day Hab 2x due to transportation no-shows. Expressed interest in Supported Employment." },
      { label: "Plan Changes Discussed", value: "Adding SE to plan, resolve transportation barrier, LOC renewal scheduling." },
    ],
    destination: {
      module: "Progress Notes Module",
      mappings: [
        { field: "What Happened", target: "narrative_body" },
        { field: "Updates", target: "updates_since_last" },
        { field: "Plan Changes", target: "plan_changes" },
      ],
    },
  },
  {
    id: "barriers",
    label: "Barriers / SDoH",
    group: "Clinical",
    checked: true,
    icon: <Home className="w-4 h-4" />,
    preview: [
      { label: "Barrier", value: "Transportation — van service unreliable" },
      { label: "Severity", value: "Moderate — impacting Day Hab attendance" },
      { label: "Barrier", value: "Missed Day Hab due to no-show transport" },
    ],
    destination: {
      module: "Barriers Module",
      mappings: [
        { field: "Barrier Type", target: "barrier_type" },
        { field: "Description", target: "description" },
        { field: "Severity", target: "severity_tag" },
      ],
    },
    confidence: 97,
  },
  {
    id: "risk_safety",
    label: "Risk & Safety",
    group: "Clinical",
    checked: true,
    icon: <Shield className="w-4 h-4" />,
    preview: [
      { label: "Incident", value: "Fall reported (no ER visit)" },
      { label: "Details", value: "Individual fell at home. Aide assisted. No injury reported." },
      { label: "Concern", value: "Supervision concern — aide present at time" },
    ],
    destination: {
      module: "Risk & Safety Module",
      mappings: [
        { field: "Incident Type", target: "incident_type" },
        { field: "Description", target: "incident_description" },
        { field: "Severity", target: "severity_level" },
      ],
    },
    confidence: 87,
  },
  {
    id: "pcp_updates",
    label: "PCP / ISP Updates",
    group: "Clinical",
    checked: true,
    icon: <ClipboardList className="w-4 h-4" />,
    preview: [
      { label: "Proposed Update", value: "Add Supported Employment interest language" },
      { label: "Proposed Update", value: "Update community integration goal (Day Hab barriers)" },
      { label: "Proposed Update", value: "Schedule change — Day Hab missed sessions" },
    ],
    destination: {
      module: "PCP / ISP Module",
      mappings: [
        { field: "Goal Update", target: "goals.update()" },
        { field: "New Service Interest", target: "services.propose()" },
        { field: "Schedule Changes", target: "schedule.update()" },
      ],
    },
    confidence: 88,
  },
  {
    id: "workflow_tasks",
    label: "Workflow Tasks",
    group: "Administrative",
    checked: true,
    icon: <CheckCircle2 className="w-4 h-4" />,
    preview: [
      { label: "Task", value: "LOC Renewal Needed" },
      { label: "Due Date", value: "Inferred: +14 days from today" },
      { label: "Assigned To", value: "Kathy (current case manager)" },
    ],
    destination: {
      module: "Workflow Manager",
      mappings: [
        { field: "Task", target: "tasks.create()" },
        { field: "Due Date", target: "due_date" },
        { field: "Assigned To", target: "assigned_to" },
      ],
    },
  },
  {
    id: "service_auth",
    label: "Service Authorization Draft",
    group: "Administrative",
    checked: false,
    draftOnly: true,
    icon: <Briefcase className="w-4 h-4" />,
    preview: [
      { label: "Service Requested", value: "Supported Employment (H2023)" },
      { label: "Rationale", value: "Individual expressed interest; aligns with community integration goal." },
      { label: "Effective Date", value: "TBD — pending ISP review" },
      { label: "Units Estimate", value: "Not yet determined" },
    ],
    destination: {
      module: "Service Authorization Module",
      mappings: [
        { field: "Service", target: "service_code" },
        { field: "Rationale", target: "rationale" },
        { field: "Effective Date", target: "effective_date" },
        { field: "Units", target: "units_estimate" },
      ],
    },
    confidence: 88,
  },
  {
    id: "utilization",
    label: "Utilization / Caps Update Draft",
    group: "Administrative",
    checked: false,
    draftOnly: true,
    icon: <BarChart3 className="w-4 h-4" />,
    preview: [
      { label: "Service", value: "PCS (H2015)" },
      { label: "Utilization", value: "85% — approaching 90% cap threshold" },
      { label: "Warning", value: "Cap threshold nearing. Review authorization." },
    ],
    destination: {
      module: "Utilization Module",
      mappings: [
        { field: "Service", target: "service_code" },
        { field: "Utilization %", target: "utilization_pct" },
        { field: "Warning", target: "cap_warning" },
      ],
    },
    confidence: 90,
  },
  {
    id: "assessments",
    label: "Assessments / LOC Renewal Item",
    group: "Administrative",
    checked: false,
    draftOnly: true,
    icon: <AlertTriangle className="w-4 h-4" />,
    preview: [
      { label: "Assessment", value: "LOC assessment expiring next month" },
      { label: "Action", value: "Create renewal reminder + optional workflow task" },
    ],
    destination: {
      module: "Assessments Module",
      mappings: [
        { field: "Assessment Type", target: "assessment_type" },
        { field: "Expiry", target: "expiry_date" },
        { field: "Reminder", target: "reminder.create()" },
      ],
    },
    confidence: 96,
    possibleDuplicate: true,
  },
];

const ReviewApplyModal = ({ open, onClose, onApply, onEditDraft }: ReviewApplyModalProps) => {
  const [targets, setTargets] = useState<ApplyTarget[]>(initialTargets);
  const [selectedId, setSelectedId] = useState<string>("contact_note");
  const [confirmedLowConfidence, setConfirmedLowConfidence] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState<Set<string>>(new Set());

  const toggleTarget = (id: string) => {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)));
  };

  const selectAll = () => setTargets((prev) => prev.map((t) => ({ ...t, checked: true })));
  const clearAll = () => setTargets((prev) => prev.map((t) => ({ ...t, checked: false })));

  const checkedCount = targets.filter((t) => t.checked).length;
  const selected = targets.find((t) => t.id === selectedId);

  const hasLowConfidenceUnchecked = targets.some(
    (t) => t.checked && t.confidence !== undefined && t.confidence < 85 && !confirmedLowConfidence.has(t.id)
  );

  const checkedItems = targets.filter((t) => t.checked);
  const draftOnlyItems = checkedItems.filter((t) => t.draftOnly);
  const allDraftOnly = checkedItems.length > 0 && draftOnlyItems.length === checkedItems.length;

  const handleApply = () => {
    if (checkedCount === 0) return;
    if (hasLowConfidenceUnchecked) return;
    const appliedIds = targets.filter((t) => t.checked && !skipDuplicates.has(t.id)).map((t) => t.id);
    onApply(appliedIds);
  };

  const groups = ["Primary", "Clinical", "Administrative"];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-[95vw] max-w-6xl h-[85vh] bg-background rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">Review & Apply to iCM</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select what to write into iCM modules. Nothing is written until you confirm.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Panel Body */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Apply Targets */}
          <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Apply Targets</span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] text-primary hover:underline font-medium">
                  Select All
                </button>
                <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:underline font-medium">
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {groups.map((group) => {
                const groupTargets = targets.filter((t) => t.group === group);
                if (groupTargets.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                      {group}
                    </p>
                    <div className="space-y-1">
                      {groupTargets.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedId(t.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            selectedId === t.id ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary border border-transparent"
                          }`}
                        >
                          <div onClick={(e) => { e.stopPropagation(); toggleTarget(t.id); }}>
                            <Checkbox checked={t.checked} className="pointer-events-none" />
                          </div>
                          <span className="text-foreground">{t.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">{t.label}</p>
                            {t.draftOnly && (
                              <span className="text-[9px] text-warning font-medium">DRAFT ONLY</span>
                            )}
                          </div>
                          {t.confidence !== undefined && t.confidence < 85 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                          )}
                          {t.possibleDuplicate && !skipDuplicates.has(t.id) && (
                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center: Preview */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Preview — What Will Be Written</span>
              {selected && (
                <button
                  onClick={onEditDraft}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Edit in Draft
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {selected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{selected.icon}</span>
                    <h3 className="text-sm font-bold text-foreground">{selected.label} (Preview)</h3>
                    {selected.draftOnly && (
                      <span className="text-[10px] bg-warning/15 text-warning px-2 py-0.5 rounded-md font-semibold border border-warning/20">
                        DRAFT — pending review/submit
                      </span>
                    )}
                  </div>

                  {/* Confidence warning */}
                  {selected.confidence !== undefined && selected.confidence < 85 && (
                    <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 p-3">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">
                          Low confidence ({selected.confidence}%)
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Some extracted entities have confidence below 85%. Please confirm accuracy.
                        </p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <Checkbox
                            checked={confirmedLowConfidence.has(selected.id)}
                            onCheckedChange={(checked) => {
                              setConfirmedLowConfidence((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(selected.id);
                                else next.delete(selected.id);
                                return next;
                              });
                            }}
                          />
                          <span className="text-xs text-foreground font-medium">
                            I confirm this item is correct
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Duplicate warning */}
                  {selected.possibleDuplicate && !skipDuplicates.has(selected.id) && (
                    <div className="flex items-start gap-2 rounded-lg bg-muted border border-border p-3">
                      <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">Possible Duplicate</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          A similar item was recorded within the last 14 days.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setSkipDuplicates((prev) => new Set([...prev, selected.id]))}
                            className="text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-secondary font-medium"
                          >
                            Skip
                          </button>
                          <button className="text-[10px] px-2 py-1 rounded-md border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 font-medium">
                            Merge
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview fields */}
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    {selected.preview.map((p, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium text-foreground">{p.label}</span>
                        <span className="text-foreground/80">: {p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select an item to preview
                </div>
              )}
            </div>
          </div>

          {/* Right: Destination */}
          <div className="w-[280px] shrink-0 flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Destination — iCM Module</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {selected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{selected.icon}</span>
                    <p className="text-sm font-bold text-foreground">{selected.destination.module}</p>
                  </div>
                  <div className="space-y-2">
                    {selected.destination.mappings.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-foreground font-medium min-w-[100px]">{m.field}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-primary font-mono text-[11px]">{m.target}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select an item to view mapping
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            {checkedCount === 0 ? (
              <span className="text-destructive font-medium">Select at least one item to apply.</span>
            ) : allDraftOnly ? (
              <span className="text-warning font-medium">Drafts saved — pending review.</span>
            ) : (
              <span>{checkedCount} item{checkedCount !== 1 ? "s" : ""} selected for apply</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={checkedCount === 0 || hasLowConfidenceUnchecked}
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {allDraftOnly ? `Save Drafts (${checkedCount})` : `Apply Selected (${checkedCount})`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReviewApplyModal;
