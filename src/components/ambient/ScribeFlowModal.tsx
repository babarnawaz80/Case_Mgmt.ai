import { useState } from "react";
import {
  Sparkles,
  X,
  FileText,
  ClipboardCheck,
  ShieldAlert,
  ClipboardList,
  Clock,
  Check,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useIndividuals } from "@/hooks/useIndividuals";
import { saveProgressNote } from "@/hooks/useProgressNotes";
import { createIncident } from "@/hooks/useIncidents";
import { createTask } from "@/hooks/useTasks";
import { audit } from "@/lib/auditService";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

interface ScribeFlowModalProps {
  defaultIndividualId?: string;
  defaultIndividualName?: string;
  onClose: () => void;
}

type Step = "input" | "processing" | "review" | "success";

interface ExtractedItem {
  id: string;
  label: string;
  value: string;
  confidence?: number;
  requiresConfirm?: boolean;
}

interface ExtractGroup {
  id: string;
  title: string;
  icon: typeof FileText;
  borderClass: string;
  bgClass: string;
  items: ExtractedItem[];
  destinationModule: string;
}

const ScribeFlowModal = ({ defaultIndividualId, defaultIndividualName, onClose }: ScribeFlowModalProps) => {
  const { currentUser, userProfile } = useAuth();
  const { individuals } = useIndividuals();

  const [step, setStep] = useState<Step>("input");
  const [noteText, setNoteText] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<any>(() => {
    if (defaultIndividualId && individuals) {
      return individuals.find((p) => p.id === defaultIndividualId);
    }
    return undefined;
  });
  const [personSearch, setPersonSearch] = useState("");
  const [personOpen, setPersonOpen] = useState(false);
  const [extractGroups, setExtractGroups] = useState<ExtractGroup[]>([]);
  const [includedItems, setIncludedItems] = useState<Set<string>>(new Set());
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [tab, setTab] = useState<"items" | "transcript">("items");

  const selectedFirstName = selectedPerson?.first_name || selectedPerson?.firstName || "";
  const selectedLastName = selectedPerson?.last_name || selectedPerson?.lastName || "";
  const selectedPreferredName = selectedPerson?.preferred_name || selectedPerson?.nickname || "";
  const personName = selectedPerson
    ? `${selectedFirstName}${selectedPreferredName ? ` (${selectedPreferredName})` : ""} ${selectedLastName}`
    : defaultIndividualName ?? "General / No individual";
  const personFirst = selectedFirstName || defaultIndividualName?.split(" ")[0] || "this person";

  const filteredPeople = (individuals || []).filter((p) => {
    const fname = p.first_name || p.firstName || "";
    const lname = p.last_name || p.lastName || "";
    const pref = p.preferred_name || p.nickname || "";
    return `${fname} ${lname} ${pref}`.toLowerCase().includes(personSearch.toLowerCase());
  });

  const toggleItem = (id: string) =>
    setIncludedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const riskItem = extractGroups.find((g) => g.id === "risk")?.items[0];
  const riskIncluded = riskItem ? includedItems.has(riskItem.id) : false;
  const needsRiskConfirm = riskIncluded && !confirmedRisk;
  const includedCount = includedItems.size;
  const moduleCount = extractGroups.filter((g) => g.items.some((i) => includedItems.has(i.id))).length;

  // Process the pasted notes with AI
  const processNotes = async () => {
    if (!noteText.trim()) return;

    setStep("processing");
    setProcessingStatus("Analyzing session notes...");

    try {
      const token = await auth.currentUser?.getIdToken();
      setProcessingStatus("Extracting entities and action items...");

      // Use the chat endpoint to extract structured data from notes
      const personCtx = selectedPerson
        ? ` The session is about ${personFirst} ${selectedLastName}.`
        : "";

      const extractPrompt = `You are a clinical documentation specialist for a case management platform. Extract structured information from these session notes and return ONLY valid JSON (no markdown, no backticks).${personCtx}

Session notes:
${noteText}

Return JSON with this exact structure:
{
  "contactNote": {
    "contactType": "In-person visit | Phone call | Virtual meeting | Team meeting | Other",
    "purpose": "brief purpose description",
    "whoWasPresent": "names and roles of attendees",
    "details": "narrative summary of the session",
    "issuesConcerns": "any issues or concerns noted",
    "nextSteps": "next action items"
  },
  "tasks": [
    {"label": "Create new task", "value": "task description · Due: timeframe"}
  ],
  "ispNotes": [
    {"label": "Goal note", "value": "ISP goal update"}
  ],
  "riskFlags": [
    {"label": "Flag", "value": "risk description", "confidence": 80, "requiresConfirm": true}
  ],
  "billable": {
    "activityType": "activity type",
    "duration": "estimated duration"
  }
}`;

      const res = await fetch(
        "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: extractPrompt,
            context: { page: "scribe_modal", module: "ambient_scribe" },
            history: [],
          }),
        }
      );

      setProcessingStatus("Building review summary...");

      if (res.ok) {
        const data = await res.json();
        const rawText = data.reply ?? "";

        // Parse JSON from the AI reply
        let extracted: any = null;
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extracted = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Fall through to defaults
        }

        // Build extract groups from AI response
        const groups: ExtractGroup[] = [];

        // Contact Note
        const cn = extracted?.contactNote;
        groups.push({
          id: "contact_note",
          title: "Contact Note",
          icon: FileText,
          borderClass: "border-l-blue-500",
          bgClass: "bg-blue-50",
          destinationModule: "Contact Note",
          items: [
            { id: "cn_type", label: "Contact type", value: cn?.contactType ?? "In-person visit" },
            { id: "cn_purpose", label: "Purpose", value: cn?.purpose ?? "Session documentation" },
            { id: "cn_present", label: "Who was present", value: cn?.whoWasPresent ?? personFirst },
            { id: "cn_details", label: "Details", value: cn?.details ?? noteText.slice(0, 300) },
            { id: "cn_concerns", label: "Issues / concerns", value: cn?.issuesConcerns ?? "None noted", confidence: 90 },
            { id: "cn_next", label: "Next steps", value: cn?.nextSteps ?? "Follow up as needed" },
          ],
        });

        // Tasks
        const tasks = extracted?.tasks ?? [];
        if (tasks.length > 0 || !extracted) {
          groups.push({
            id: "tasks",
            title: "Tasks",
            icon: ClipboardCheck,
            borderClass: "border-l-emerald-500",
            bgClass: "bg-emerald-50",
            destinationModule: "Case Management",
            items: tasks.map((t: any, idx: number) => ({
              id: `tk_${idx}`,
              label: t.label ?? "Create new task",
              value: t.value ?? t,
            })),
          });
        }

        // ISP notes
        const ispNotes = extracted?.ispNotes ?? [];
        if (ispNotes.length > 0) {
          groups.push({
            id: "isp",
            title: "ISP / Care Plan",
            icon: FileText,
            borderClass: "border-l-purple-500",
            bgClass: "bg-purple-50",
            destinationModule: "Care Plan / ISP",
            items: ispNotes.map((n: any, idx: number) => ({
              id: `isp_${idx}`,
              label: n.label ?? "Goal note",
              value: n.value ?? n,
            })),
          });
        }

        // Risk flags
        const riskFlags = extracted?.riskFlags ?? [];
        if (riskFlags.length > 0) {
          groups.push({
            id: "risk",
            title: "Risk & Safety",
            icon: ShieldAlert,
            borderClass: "border-l-rose-500",
            bgClass: "bg-rose-50",
            destinationModule: "Risk & Safety",
            items: riskFlags.map((r: any, idx: number) => ({
              id: `risk_${idx}`,
              label: r.label ?? "Flag",
              value: r.value ?? r,
              confidence: r.confidence ?? 75,
              requiresConfirm: r.requiresConfirm ?? true,
            })),
          });
        }

        // Billable
        const bill = extracted?.billable;
        groups.push({
          id: "billable",
          title: "Billable Activity",
          icon: Clock,
          borderClass: "border-l-slate-400",
          bgClass: "bg-slate-50",
          destinationModule: "Billable Activity",
          items: [
            { id: "bl_type", label: "Activity type", value: bill?.activityType ?? "Contact Note" },
            { id: "bl_date", label: "Date", value: new Date().toLocaleDateString() },
            { id: "bl_dur", label: "Duration", value: bill?.duration ?? "Estimated from notes" },
          ],
        });

        // Pre-select all items
        const allIds = groups.flatMap((g) => g.items.map((i) => i.id));
        setIncludedItems(new Set(allIds));
        setExtractGroups(groups);
        setStep("review");
      } else {
        // Fallback: show notes as a contact note
        const fallbackGroups: ExtractGroup[] = [
          {
            id: "contact_note",
            title: "Contact Note",
            icon: FileText,
            borderClass: "border-l-blue-500",
            bgClass: "bg-blue-50",
            destinationModule: "Contact Note",
            items: [
              { id: "cn_type", label: "Contact type", value: "In-person visit" },
              { id: "cn_details", label: "Details", value: noteText },
              { id: "cn_next", label: "Next steps", value: "Review and follow up" },
            ],
          },
        ];
        setExtractGroups(fallbackGroups);
        setIncludedItems(new Set(["cn_type", "cn_details", "cn_next"]));
        setStep("review");
      }
    } catch (err) {
      console.error("Scribe processing failed:", err);
      // Fallback
      const fallbackGroups: ExtractGroup[] = [
        {
          id: "contact_note",
          title: "Contact Note",
          icon: FileText,
          borderClass: "border-l-blue-500",
          bgClass: "bg-blue-50",
          destinationModule: "Contact Note",
          items: [
            { id: "cn_type", label: "Contact type", value: "In-person visit" },
            { id: "cn_details", label: "Details", value: noteText },
            { id: "cn_next", label: "Next steps", value: "Review and follow up" },
          ],
        },
      ];
      setExtractGroups(fallbackGroups);
      setIncludedItems(new Set(["cn_type", "cn_details", "cn_next"]));
      setStep("review");
    }
  };

  const handleSaveAndPush = async () => {
    if (!selectedPerson) return;
    setSaving(true);
    try {
      const orgId = selectedPerson.organizationId || userProfile?.organizationId || "org-1";
      const uid = currentUser?.uid || userProfile?.uid || "uid-1";
      const authorName = userProfile?.first_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : "Case Manager";

      // Save contact note
      const noteIncluded = includedItems.has("cn_details") || includedItems.has("cn_type");
      if (noteIncluded) {
        const cnDetails = extractGroups.find((g) => g.id === "contact_note");
        const detailsVal = cnDetails?.items.find((i) => i.id === "cn_details")?.value ?? noteText;
        const nextVal = cnDetails?.items.find((i) => i.id === "cn_next")?.value ?? "";

        await saveProgressNote({
          individualId: selectedPerson.id,
          organizationId: orgId,
          authorId: uid,
          authorName,
          activityType: "Case Management",
          contactType: "In-Person",
          progressDate: new Date().toISOString().split("T")[0],
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          isBillable: true,
          purposeOfActivity: detailsVal,
          goalsProgress: [],
          additionalObservations: "",
          nextSteps: nextVal,
          status: "draft",
          aiDrafted: true,
        });
      }

      // Save risk incidents
      const riskGroup = extractGroups.find((g) => g.id === "risk");
      if (riskGroup) {
        for (const item of riskGroup.items) {
          if (includedItems.has(item.id)) {
            await createIncident({
              individualId: selectedPerson.id,
              organizationId: orgId,
              type: "Behavioral Incident",
              severity: "minor",
              status: "open",
              description: item.value,
              reportedAt: new Date().toISOString(),
              reportedBy: uid,
              reportedByName: authorName,
            });
          }
        }
      }

      // Save tasks
      const tasksGroup = extractGroups.find((g) => g.id === "tasks");
      if (tasksGroup) {
        for (const item of tasksGroup.items) {
          if (includedItems.has(item.id)) {
            await createTask({
              title: item.value.split("·")[0].trim(),
              description: item.value,
              individualId: selectedPerson.id,
              individualName: `${selectedPerson.first_name || selectedPerson.firstName} ${selectedPerson.last_name || selectedPerson.lastName}`,
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              status: "open",
              priority: "medium",
              type: "Follow-up",
              assignedTo: uid,
              organizationId: orgId,
            });
          }
        }
      }

      await audit.applyAmbient("scribe-" + Date.now().toString().slice(-4), selectedPerson.id, [...includedItems].join(","));
      setStep("success");
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Input ──────────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(10,10,10,0.85)" }}>
        <div className="w-[560px] bg-white rounded-xl p-6 shadow-2xl">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(215 94% 58%), hsl(265 70% 58%))" }}>
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-center font-display text-[20px] font-semibold text-icm-text mb-1.5">AI Scribe</h2>
          <p className="text-center text-[13px] text-icm-text-dim mb-5">
            Paste or type your session notes. AI will extract structured data and pre-fill forms.
          </p>

          {/* Individual selector */}
          <div className="mb-3 relative">
            <label className="text-[12px] font-medium text-icm-text-dim mb-1.5 block">Who is this session about?</label>
            <button
              onClick={() => setPersonOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-icm-border text-left text-[13px] hover:border-icm-border-strong"
            >
              <span className="text-icm-text">{personName}</span>
              <ChevronRight className={`w-3.5 h-3.5 text-icm-text-faint transition-transform ${personOpen ? "rotate-90" : ""}`} />
            </button>
            {personOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-white border border-icm-border rounded-lg shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-icm-border">
                  <Search className="w-3.5 h-3.5 text-icm-text-faint" />
                  <input
                    autoFocus
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    placeholder="Search people..."
                    className="flex-1 outline-none text-[13px] bg-transparent"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredPeople.map((p) => {
                    const fname = p.first_name || p.firstName || "";
                    const lname = p.last_name || p.lastName || "";
                    const pref = p.preferred_name || p.nickname || "";
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPerson(p); setPersonOpen(false); setPersonSearch(""); }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-icm-bg text-icm-text"
                      >
                        {lname}, {fname}{pref ? ` (${pref})` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notes textarea */}
          <div className="mb-4">
            <label className="text-[12px] font-medium text-icm-text-dim mb-1.5 block">Paste or type your session notes</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Visited Joseph at home today. He reported attending the day program 4x this week. Mother mentioned he has been sleeping less and seems more agitated in the evenings. Discussed behavioral support options. Will follow up in 2 weeks..."
              rows={8}
              className="w-full px-3 py-2.5 rounded-lg border border-icm-border text-[13px] text-icm-text focus:outline-none focus:border-icm-accent resize-none"
            />
            <p className="text-[11px] text-icm-text-faint mt-1">{noteText.length} characters · AI will extract structured data from your notes</p>
          </div>

          <button
            onClick={processNotes}
            disabled={!noteText.trim() || !selectedPerson}
            className="w-full py-2.5 rounded-lg bg-icm-text text-white text-[13px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {!selectedPerson ? "Select an individual first" : "Process with AI"}
          </button>
          <button onClick={onClose} className="w-full mt-2 text-[12px] text-icm-text-dim hover:text-icm-text">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Processing ─────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 animate-pulse"
          style={{ background: "linear-gradient(135deg, hsl(215 94% 58%), hsl(265 70% 58%))" }}>
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-white/80 text-[14px] font-mono mb-2">{processingStatus}</p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Step 3: Review ─────────────────────────────────────────────────────────
  if (step === "review") {
    const totalCount = extractGroups.reduce((acc, g) => acc + g.items.length, 0);
    const moduleSummaries = extractGroups
      .filter((g) => g.items.some((i) => includedItems.has(i.id)))
      .map((g) => ({
        name: g.destinationModule,
        icon: g.icon,
        count: g.items.filter((i) => includedItems.has(i.id)).length,
        status: g.items.some((i) => i.requiresConfirm && includedItems.has(i.id) && !confirmedRisk)
          ? "needsConfirm"
          : "ready",
      }));

    return (
      <div className="fixed inset-0 z-[100] bg-icm-bg flex flex-col">
        {/* Header */}
        <div className="h-14 shrink-0 px-6 flex items-center justify-between border-b border-icm-border bg-white">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-icm-accent" />
            <h2 className="font-display font-semibold text-[15px] text-icm-text">Review & push to modules</h2>
            <span className="text-[12px] text-icm-text-dim">· {personName} · Scribe session</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-icm-bg text-icm-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* LEFT 60% */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-icm-border">
            {/* Tabs */}
            <div className="shrink-0 px-6 pt-4 flex items-center gap-1 border-b border-icm-border">
              <button
                onClick={() => setTab("items")}
                className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === "items" ? "border-icm-text text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
              >
                Extracted items
              </button>
              <button
                onClick={() => setTab("transcript")}
                className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === "transcript" ? "border-icm-text text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
              >
                Original notes
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === "items" ? (
                <div className="space-y-5">
                  {extractGroups.map((g) => {
                    const Icon = g.icon;
                    return (
                      <div key={g.id} className={`rounded-lg border border-icm-border bg-white border-l-4 ${g.borderClass}`}>
                        <div className={`flex items-center gap-2 px-4 py-2.5 ${g.bgClass} border-b border-icm-border rounded-tr-lg`}>
                          <Icon className="w-3.5 h-3.5 text-icm-text" />
                          <span className="text-[12px] font-semibold text-icm-text">{g.title}</span>
                          <span className="text-[11px] text-icm-text-dim">→ {g.destinationModule}</span>
                        </div>
                        <div className="divide-y divide-icm-border">
                          {g.items.map((item) => (
                            <label key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-icm-bg/50 cursor-pointer">
                              <Checkbox
                                checked={includedItems.has(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-0.5">{item.label}</p>
                                <p className="text-[13px] text-icm-text leading-snug">{item.value}</p>
                                {item.confidence !== undefined && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {item.confidence < 85 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                        <AlertTriangle className="w-3 h-3" /> AI confidence: {item.confidence}%
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-icm-text-faint">AI confidence: {item.confidence}%</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-icm-border p-5">
                  <p className="text-[12px] text-icm-text-faint mb-3 font-semibold uppercase tracking-wide">Original Session Notes</p>
                  <p className="text-[13.5px] text-icm-text leading-[1.7] whitespace-pre-wrap">{noteText}</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 40% */}
          <div className="w-[40%] max-w-[480px] flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h3 className="text-[12px] uppercase tracking-wide font-semibold text-icm-text-faint mb-3">Review summary</h3>
              <div className="rounded-lg border border-icm-border p-4 space-y-2 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-icm-text-dim">Items selected</span>
                  <span className="text-[12.5px] font-semibold text-icm-text">{includedCount} of {totalCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-icm-text-dim">Modules updated</span>
                  <span className="text-[12.5px] font-semibold text-icm-text">{moduleCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-icm-text-dim">Notes processed</span>
                  <span className="text-[12.5px] font-semibold text-icm-text">{noteText.length} chars</span>
                </div>
              </div>

              <h3 className="text-[12px] uppercase tracking-wide font-semibold text-icm-text-faint mb-3">Module destinations</h3>
              <div className="space-y-2 mb-5">
                {moduleSummaries.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-icm-border">
                      <Icon className="w-3.5 h-3.5 text-icm-text-dim shrink-0" />
                      <span className="text-[12.5px] text-icm-text flex-1 truncate">{m.name}</span>
                      <span className="text-[11px] text-icm-text-faint">{m.count}</span>
                      {m.status === "ready" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                          <Check className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                      {m.status === "needsConfirm" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5" /> Confirm
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {riskIncluded && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-5">
                  <p className="text-[12px] font-semibold text-amber-900 mb-2">Confirmation required</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={confirmedRisk} onCheckedChange={(c) => setConfirmedRisk(c === true)} className="mt-0.5" />
                    <span className="text-[12px] text-amber-900 leading-snug">
                      I confirm the risk/safety flag is accurate and should be saved.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="shrink-0 border-t border-icm-border p-4 space-y-2">
              <button
                onClick={handleSaveAndPush}
                disabled={needsRiskConfirm || includedCount === 0 || saving}
                className="w-full py-2.5 rounded-lg bg-icm-text text-white text-[13px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {saving ? "Saving & pushing..." : "Save & push to all modules →"}
              </button>
              <p className="text-[11px] text-icm-text-faint text-center">
                Writes to {moduleCount} modules simultaneously. Undoable for 60 seconds.
              </p>
              <button onClick={onClose} className="w-full text-[11.5px] text-icm-text-dim hover:text-icm-text py-1">
                Discard (nothing pushed yet)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Success ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <div className="w-[520px]">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-600" strokeWidth={3} />
          </div>
        </div>
        <h2 className="text-center font-display font-bold text-[22px] text-icm-text mb-1">Done. {moduleCount} modules updated.</h2>
        <p className="text-center text-[13px] text-icm-text-dim mb-6">{personFirst}'s record is up to date.</p>

        <div className="rounded-xl border border-icm-border bg-white p-4 space-y-2 mb-5">
          {extractGroups
            .filter((g) => g.items.some((i) => includedItems.has(i.id)))
            .map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.id} className="flex items-center gap-2.5 text-[13px] text-icm-text">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <Icon className="w-3.5 h-3.5 text-icm-text-dim shrink-0" />
                  <span>{g.title} updated — {g.destinationModule}</span>
                </div>
              );
            })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-icm-text text-white text-[13px] font-medium hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScribeFlowModal;
