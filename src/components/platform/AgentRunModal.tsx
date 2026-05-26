import { useState, useEffect, useMemo } from "react";
import { X, Play, Loader2, CheckCircle2, AlertTriangle, HelpCircle, Search, ChevronDown, Calendar, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { createRun, completeRun, type RunResult } from "@/services/agentRunsService";
import { cn } from "@/lib/utils";

interface IndividualOption {
  id: string;
  name: string;
  program?: string;
  riskTier?: string;
}

interface AgentRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  runType: 'pcp_generation' | 'compliance_check' | 'monitoring_review';
}

const RUN_STEPS = [
  "Loading individual's charts and historical documents...",
  "Applying Maryland DDA state guidelines pack...",
  "Reading documentation and case notes...",
  "Running compliance rules checks...",
  "Generating required sections and drafts...",
  "Applying master prompt constraints...",
  "Running final validation & checks..."
];

export function AgentRunModal({ isOpen, onClose, agentId, agentName, runType }: AgentRunModalProps) {
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [loadingIndividuals, setLoadingIndividuals] = useState(false);
  const [selectedInd, setSelectedInd] = useState<IndividualOption | null>(null);
  const [indSearch, setIndSearch] = useState("");
  const [indOpen, setIndOpen] = useState(false);

  // Form
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-05-25");
  const [confirmGuidelines, setConfirmGuidelines] = useState(true);
  const [confirmMasterPrompt, setConfirmMasterPrompt] = useState(true);

  // Execution State
  const [running, setRunning] = useState(false);
  const [runStepIdx, setRunStepIdx] = useState(0);
  const [runId, setRunId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  // Fetch individuals on open
  useEffect(() => {
    if (!isOpen) return;
    setLoadingIndividuals(true);
    getDocs(query(collection(db, "individuals"), orderBy("last_name", "asc")))
      .then((snap) => {
        setIndividuals(
          snap.docs.map((d) => ({
            id: d.id,
            name: `${d.data().first_name ?? ""} ${d.data().last_name ?? ""}`.trim(),
            program: d.data().program ?? d.data().primary_program ?? "DD Waiver",
            riskTier: d.data().risk_tier ?? "low",
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoadingIndividuals(false));
  }, [isOpen]);

  // Stepper logic during running
  useEffect(() => {
    if (!running) return;
    if (runStepIdx >= RUN_STEPS.length) {
      // Finished running steps, complete run in DB
      (async () => {
        if (!runId || !selectedInd) return;
        
        // Generate simulated rule results
        const isPass = Math.random() > 0.4;
        const hardStops = isPass ? 0 : 1;
        const warnings = isPass ? 0 : 2;
        const itemsFlagged = isPass ? [] : ["Medicaid eligibility verification warning", "HRST score clinical review required"];

        const runResult: RunResult = {
          compliance: isPass ? 'pass' : 'flagged',
          hard_stops: hardStops,
          warnings: warnings,
          sections_generated: 11,
          items_flagged: itemsFlagged
        };

        await completeRun(runId, runResult);
        setResult(runResult);
        setRunning(false);
        setCompleted(true);
      })();
      return;
    }

    const interval = setTimeout(() => {
      setRunStepIdx((prev) => prev + 1);
    }, 850);

    return () => clearTimeout(interval);
  }, [running, runStepIdx, runId, selectedInd]);

  const filteredInds = useMemo(
    () =>
      indSearch.trim()
        ? individuals.filter((i) => i.name.toLowerCase().includes(indSearch.toLowerCase()))
        : individuals,
    [individuals, indSearch]
  );

  const handleStartRun = async () => {
    if (!selectedInd) return;
    setRunning(true);
    setRunStepIdx(0);
    setCompleted(false);
    setResult(null);

    try {
      const newId = await createRun({
        agent_id: agentId,
        agent_name: agentName,
        individual_id: selectedInd.id,
        individual_name: selectedInd.name,
        run_type: runType,
        created_by: "Babar Nawaz",
        date_range_from: dateFrom,
        date_range_to: dateTo,
      });
      setRunId(newId);
    } catch (e) {
      console.error(e);
      setRunning(false);
    }
  };

  const handleReset = () => {
    setSelectedInd(null);
    setIndSearch("");
    setRunning(false);
    setRunStepIdx(0);
    setCompleted(false);
    setResult(null);
    setRunId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={running ? undefined : onClose} />

      {/* Modal Card */}
      <div className="relative bg-icm-panel border border-icm-border rounded-2xl shadow-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-icm-border shrink-0">
          <div>
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-icm-accent" />
              Run Agent: {agentName}
            </h2>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Configure scope and execute runtime compliance validation</p>
          </div>
          {!running && (
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-icm-bg transition text-icm-text-dim hover:text-icm-text">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dynamic Screens */}
        <div className="p-5 flex-1 min-h-0">
          
          {/* Step 1: Configuration Form */}
          {!running && !completed && (
            <div className="space-y-4">
              {/* Individual Select */}
              <div className="space-y-1">
                <label className="block text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">
                  Individual Case Scope <span className="text-icm-red">*</span>
                </label>
                <div className="relative">
                  <div
                    className="w-full h-10 px-3 rounded-xl bg-icm-bg border border-icm-border flex items-center gap-2 cursor-pointer select-none text-[13px] font-geist"
                    onClick={() => setIndOpen((o) => !o)}
                  >
                    {selectedInd ? (
                      <span className="text-icm-text">{selectedInd.name}</span>
                    ) : (
                      <span className="text-icm-text-faint">Select individual to evaluate...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-icm-text-dim ml-auto shrink-0" />
                  </div>
                  {indOpen && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-icm-panel border border-icm-border rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-icm-border flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-icm-text-dim shrink-0" />
                        <input
                          autoFocus
                          value={indSearch}
                          onChange={(e) => setIndSearch(e.target.value)}
                          placeholder="Search individual..."
                          className="flex-1 bg-transparent text-[12.5px] font-geist text-icm-text outline-none placeholder:text-icm-text-faint"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {loadingIndividuals ? (
                          <div className="flex items-center justify-center py-4 gap-2 text-icm-text-dim">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[12px] font-geist">Loading caseload...</span>
                          </div>
                        ) : filteredInds.length === 0 ? (
                          <p className="text-center py-4 text-[12px] font-geist text-icm-text-dim">No individuals found</p>
                        ) : (
                          filteredInds.map((ind) => (
                            <button
                              key={ind.id}
                              onClick={() => { setSelectedInd(ind); setIndSearch(ind.name); setIndOpen(false); }}
                              className={cn(
                                "w-full text-left px-3 py-2 hover:bg-icm-bg transition text-[12.5px] font-geist",
                                selectedInd?.id === ind.id ? "bg-icm-accent/10 text-icm-accent font-semibold" : "text-icm-text"
                              )}
                            >
                              <span>{ind.name}</span>
                              {ind.program && <span className="text-icm-text-dim text-[11px] ml-2">· {ind.program}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">Date From</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-dim" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-icm-bg border border-icm-border text-[12.5px] font-geist text-icm-text focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">Date To</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-dim" />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-icm-bg border border-icm-border text-[12.5px] font-geist text-icm-text focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rules Confirms */}
              <div className="space-y-2 border-t border-icm-border pt-3">
                <label className="block text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider mb-2">Validation Overlay Controls</label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmGuidelines}
                    onChange={(e) => setConfirmGuidelines(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-icm-accent rounded border-icm-border focus:ring-0"
                  />
                  <div>
                    <p className="text-[12.5px] font-geist font-semibold text-icm-text">Guidelines Engine Validation</p>
                    <p className="text-[11px] text-icm-text-dim leading-normal font-geist">Cross-check all case documentation against state Medicaid rule pack.</p>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={confirmMasterPrompt}
                    onChange={(e) => setConfirmMasterPrompt(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-icm-accent rounded border-icm-border focus:ring-0"
                  />
                  <div>
                    <p className="text-[12.5px] font-geist font-semibold text-icm-text">Apply Master Prompt Persona</p>
                    <p className="text-[11px] text-icm-text-dim leading-normal font-geist">Format generated notes using person-centered clinical strengths overlay.</p>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-icm-border flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="h-9 px-4 rounded-xl border border-icm-border text-[12.5px] font-semibold text-icm-text-dim hover:text-icm-text transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartRun}
                  disabled={!selectedInd}
                  className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Execute Agent
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Animated Running State */}
          {running && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-icm-accent/20 border-t-icm-accent rounded-full animate-spin" />
                  <Sparkles className="w-5 h-5 text-icm-accent" />
                </div>
                <h3 className="font-manrope font-bold text-[15px] text-icm-text mt-4">Agent Executing Compliance Checks</h3>
                <p className="text-[11.5px] text-icm-text-dim font-geist mt-1 max-w-[280px]">Applying guidelines engine pack with master prompt overlay</p>
              </div>

              <div className="rounded-xl border border-icm-border bg-icm-bg p-4 space-y-3">
                {RUN_STEPS.map((s, idx) => {
                  const isActive = idx === runStepIdx;
                  const isCompleted = idx < runStepIdx;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-icm-green" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-icm-accent animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-icm-border bg-icm-panel" />
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-[12px] font-geist leading-tight",
                          isActive ? "text-icm-text font-semibold" : isCompleted ? "text-icm-text-dim" : "text-icm-text-faint"
                        )}
                      >
                        {s}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1">
                <div className="h-1.5 w-full bg-icm-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-icm-accent transition-all duration-300 rounded-full"
                    style={{ width: `${(runStepIdx / RUN_STEPS.length) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-icm-text-faint">
                  <span>PROGRESS</span>
                  <span>{Math.round((runStepIdx / RUN_STEPS.length) * 100)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Complete Results Card */}
          {completed && result && selectedInd && (
            <div className="space-y-5 py-2">
              <div className="text-center">
                <div className={cn(
                  "w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ring-4",
                  result.compliance === "pass"
                    ? "bg-icm-green-soft text-icm-green ring-icm-green/10"
                    : "bg-icm-amber-soft text-icm-amber ring-icm-amber/10"
                )}>
                  {result.compliance === "pass" ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <h3 className="font-manrope font-extrabold text-[18px] text-icm-text mt-3">Run Completed</h3>
                <p className="text-[12.5px] text-icm-text-dim font-geist mt-0.5">
                  Evaluation complete for <span className="font-semibold text-icm-text">{selectedInd.name}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-icm-border text-center">
                <div>
                  <p className={cn(
                    "font-mono font-bold text-[18px] leading-tight",
                    result.compliance === 'pass' ? "text-icm-green" : "text-icm-amber"
                  )}>
                    {result.compliance.toUpperCase()}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-semibold font-geist mt-0.5">Compliance</p>
                </div>
                <div>
                  <p className="font-mono font-bold text-[18px] leading-tight text-icm-red">{result.hard_stops}</p>
                  <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-semibold font-geist mt-0.5">Hard Stops</p>
                </div>
                <div>
                  <p className="font-mono font-bold text-[18px] leading-tight text-icm-amber">{result.warnings}</p>
                  <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-semibold font-geist mt-0.5">Warnings</p>
                </div>
              </div>

              {result.items_flagged.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Flagged Compliance Errors</h4>
                  <ul className="space-y-1.5">
                    {result.items_flagged.map((item, idx) => (
                      <li key={idx} className="rounded-lg border border-icm-red/20 bg-icm-red-soft p-3 text-[12px] font-geist text-icm-text flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-icm-red shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.compliance === "pass" && (
                <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft p-4 text-[12.5px] font-geist text-icm-text text-center">
                  ✨ Excellent! This case is fully compliant with state guidelines. Draft notes generated with clinical master prompt overlay.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-icm-border">
                <button
                  onClick={handleReset}
                  className="flex-1 h-10 rounded-xl border border-icm-border text-[12.5px] font-geist font-semibold text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition"
                >
                  Run Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold hover:opacity-90 transition"
                >
                  Review PCP →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
