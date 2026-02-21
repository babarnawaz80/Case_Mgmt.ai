import { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  GitCompareArrows,
  History,
  Shield,
  AlertTriangle,
  FileText,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionControlProps {
  onBack: () => void;
  onFinish: () => void;
}

interface RulePackVersion {
  id: string;
  version: string;
  guidelineDate: string;
  uploadTimestamp: string;
  approvedBy: string;
  status: "current" | "pending" | "archived";
  changeCount?: { added: number; modified: number; removed: number };
}

interface RuleDiff {
  id: string;
  section: string;
  type: "added" | "modified" | "removed";
  oldValue?: string;
  newValue?: string;
}

const mockVersions: RulePackVersion[] = [
  { id: "v-3", version: "3.0", guidelineDate: "2026-02-15", uploadTimestamp: "2026-02-18T14:30:00Z", approvedBy: "Pending Approval", status: "pending", changeCount: { added: 3, modified: 5, removed: 1 } },
  { id: "v-2", version: "2.0", guidelineDate: "2025-11-01", uploadTimestamp: "2025-11-05T09:15:00Z", approvedBy: "Sarah Johnson, Compliance Director", status: "current" },
  { id: "v-1", version: "1.0", guidelineDate: "2025-06-15", uploadTimestamp: "2025-06-20T11:00:00Z", approvedBy: "Sarah Johnson, Compliance Director", status: "archived" },
];

const mockDiffs: RuleDiff[] = [
  { id: "d-1", section: "PCS Daily Cap", type: "modified", oldValue: "Maximum 8 hours per day", newValue: "Maximum 10 hours per day (effective 03/01/2026)" },
  { id: "d-2", section: "Respite Plan-Year Limit", type: "modified", oldValue: "Maximum 720 hours per plan year", newValue: "Maximum 840 hours per plan year" },
  { id: "d-3", section: "Telehealth Service Delivery", type: "added", newValue: "Telehealth modality now permitted for Day Habilitation check-ins (max 2 hours/week)" },
  { id: "d-4", section: "Community Integration Minimum", type: "added", newValue: "Day Hab must include minimum 40% community-based activities" },
  { id: "d-5", section: "Employment First Documentation", type: "added", newValue: "Employment exploration must be documented for all working-age participants quarterly" },
  { id: "d-6", section: "Concurrent PCS/Respite Exception", type: "modified", oldValue: "No concurrent billing allowed", newValue: "Exception allowed with prior authorization for crisis situations (max 48 hours)" },
  { id: "d-7", section: "Staff Certification — CPR", type: "modified", oldValue: "CPR certification required annually", newValue: "CPR certification required every 2 years (aligned with AHA guidelines)" },
  { id: "d-8", section: "Legacy Paper Form Requirement", type: "modified", oldValue: "Paper backup forms required for field staff", newValue: "Electronic documentation accepted as primary record" },
  { id: "d-9", section: "Quarterly Face-to-Face Requirement", type: "removed", oldValue: "Quarterly in-person meeting mandatory between case manager and participant" },
];

const diffIcons = { added: Plus, modified: RefreshCw, removed: Minus };
const diffColors = {
  added: { text: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
  modified: { text: "text-warning", bg: "bg-warning/5", border: "border-warning/20" },
  removed: { text: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/20" },
};

export function StepVersionControl({ onBack, onFinish }: VersionControlProps) {
  const [versions, setVersions] = useState<RulePackVersion[]>([]);
  const [diffs, setDiffs] = useState<RuleDiff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [approved, setApproved] = useState(false);

  const handleLoadVersions = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVersions(mockVersions);
      setIsLoading(false);
    }, 1500);
  };

  const handleCompare = () => {
    setShowDiff(true);
    setTimeout(() => setDiffs(mockDiffs), 800);
  };

  const handleApprove = () => {
    setApproved(true);
    setVersions((prev) =>
      prev.map((v) =>
        v.id === "v-3" ? { ...v, status: "current" as const, approvedBy: "Admin (You)" } :
        v.id === "v-2" ? { ...v, status: "archived" as const } : v
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Version Control</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track guideline versions, compare old vs new rules, highlight differences, and require admin approval before activating updated rule packs.
        </p>
      </div>

      {versions.length === 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadVersions}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Loading version history...</>
            ) : (
              <><History className="h-4 w-4" /> Load Version History</>
            )}
          </button>
        </div>
      )}

      {versions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Version timeline */}
          <div className="space-y-3">
            {versions.map((ver, i) => (
              <motion.div
                key={ver.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "rounded-xl border bg-card p-4",
                  ver.status === "pending" && "border-warning/30 bg-warning/5",
                  ver.status === "current" && "border-primary/30 bg-primary/5",
                  ver.status === "archived" && "border-border/60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      ver.status === "pending" ? "bg-warning/10" : ver.status === "current" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <FileText className={cn(
                        "h-5 w-5",
                        ver.status === "pending" ? "text-warning" : ver.status === "current" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">Version {ver.version}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                          ver.status === "pending" && "bg-warning/10 text-warning",
                          ver.status === "current" && "bg-primary/10 text-primary",
                          ver.status === "archived" && "bg-muted text-muted-foreground"
                        )}>
                          {ver.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Guideline: {ver.guidelineDate}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Uploaded: {new Date(ver.uploadTimestamp).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {ver.approvedBy}
                        </p>
                      </div>
                      {ver.changeCount && (
                        <div className="flex gap-3 mt-2">
                          <span className="text-[10px] font-medium text-primary">+{ver.changeCount.added} added</span>
                          <span className="text-[10px] font-medium text-warning">{ver.changeCount.modified} modified</span>
                          <span className="text-[10px] font-medium text-destructive">-{ver.changeCount.removed} removed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Compare button */}
          {!showDiff && versions.some((v) => v.status === "pending") && (
            <div className="flex justify-center">
              <button
                onClick={handleCompare}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all"
              >
                <GitCompareArrows className="h-4 w-4" />
                Compare v2.0 → v3.0
              </button>
            </div>
          )}

          {/* Diff view */}
          {showDiff && diffs.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Rule Differences (v2.0 → v3.0)</p>
                <div className="flex gap-3 text-[11px]">
                  <span className="text-primary font-medium">{diffs.filter((d) => d.type === "added").length} Added</span>
                  <span className="text-warning font-medium">{diffs.filter((d) => d.type === "modified").length} Modified</span>
                  <span className="text-destructive font-medium">{diffs.filter((d) => d.type === "removed").length} Removed</span>
                </div>
              </div>

              {diffs.map((diff, i) => {
                const DiffIcon = diffIcons[diff.type];
                const colors = diffColors[diff.type];
                return (
                  <motion.div
                    key={diff.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn("rounded-xl border p-4", colors.border, colors.bg)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <DiffIcon className={cn("h-3.5 w-3.5", colors.text)} />
                      <p className={cn("text-xs font-semibold uppercase", colors.text)}>{diff.type}</p>
                      <span className="text-xs font-medium text-foreground">— {diff.section}</span>
                    </div>
                    {diff.oldValue && (
                      <div className="mb-1.5 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        <p className="text-[11px] text-destructive/80 line-through">{diff.oldValue}</p>
                      </div>
                    )}
                    {diff.newValue && (
                      <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-[11px] text-primary/80">{diff.newValue}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Admin approval */}
              {!approved ? (
                <div className="p-4 rounded-xl border border-warning/30 bg-warning/5">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Admin Approval Required</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Review all {diffs.length} rule changes above. Once approved, v3.0 becomes the active rule pack and all compliance checks will use updated rules.
                      </p>
                      <button
                        onClick={handleApprove}
                        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-xs shadow hover:-translate-y-0.5 transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve & Activate v3.0
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl border border-primary/30 bg-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Version 3.0 Approved & Active</p>
                      <p className="text-xs text-muted-foreground">All compliance checks now use the updated rule pack.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={onFinish} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
              <CheckCircle2 className="h-4 w-4" /> Save & Deploy Agent
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
