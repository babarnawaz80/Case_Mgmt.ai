import { useMemo, useState } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  Sparkles, Clock, CheckCircle2, AlertTriangle, Send,
  X, ArrowRight, Loader2, Download, RefreshCw, Filter,
  ChevronRight, ExternalLink, DatabaseZap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBillingRecords, createBillingRecord, updateBillingRecord, markRecordsSubmitted, type BillingRecord, type BillingStatus } from "@/hooks/useBillingRecords";
import { useBillingRecordsSummary } from "@/hooks/useBillingRecords";
import { submitToIddBilling, generate837P, type OrgBillingInfo } from "@/services/iddBillingService";
import { useAuth } from "@/contexts/AuthContext";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

type TabKey = "all" | "pending_scrub" | "scrub_passed" | "needs_attention" | "submitted" | "denied";

const BillingHub = () => {
  const [tab, setTab] = useState<TabKey>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerRecord, setDrawerRecord] = useState<BillingRecord | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [filterIndividual, setFilterIndividual] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { records, loading } = useBillingRecords();
  const { pending_scrub, scrub_passed, needs_attention, submitted_this_month, total_ready_amount } = useBillingRecordsSummary();
  const { userProfile } = useAuth();

  // Filtered records for current tab
  const filtered = useMemo(() => {
    let base = records;

    // Tab filter
    switch (tab) {
      case "pending_scrub": base = base.filter(r => r.billing_status === "pending_scrub"); break;
      case "scrub_passed": base = base.filter(r => r.billing_status === "scrub_passed" && !r.submitted_to_iddbilling); break;
      case "needs_attention": base = base.filter(r => r.billing_status === "needs_attention"); break;
      case "submitted": base = base.filter(r => r.submitted_to_iddbilling); break;
      case "denied": base = base.filter(r => r.billing_status === "denied"); break;
    }

    // Text filters — use broad matching so records with empty fields are never silently hidden
    if (filterIndividual) {
      const term = filterIndividual.toLowerCase();
      base = base.filter(r =>
        (r.individual_name || "").toLowerCase().includes(term) ||
        (r.individual_id  || "").toLowerCase().includes(term) ||
        (r.case_manager_name || "").toLowerCase().includes(term)
      );
    }
    if (filterCode) {
      const term = filterCode.toLowerCase();
      base = base.filter(r =>
        (r.service_code || "").toLowerCase().includes(term) ||
        (r.service_description || "").toLowerCase().includes(term)
      );
    }
    if (filterDateFrom) base = base.filter(r => (r.date_of_service || "") >= filterDateFrom);
    if (filterDateTo)   base = base.filter(r => (r.date_of_service || "") <= filterDateTo);

    return base;
  }, [records, tab, filterIndividual, filterCode, filterDateFrom, filterDateTo]);

  const selectedRecords = useMemo(() =>
    filtered.filter(r => selectedIds.has(r.id)),
    [filtered, selectedIds]
  );

  const readyToSubmit = selectedRecords.filter(r => r.billing_status === "scrub_passed");
  const totalReadyAmount = readyToSubmit.reduce((s, r) => s + (r.total_amount || 0), 0);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "All Claims", count: records.length },
    { key: "pending_scrub", label: "Pending Scrub", count: pending_scrub },
    { key: "scrub_passed", label: "Ready to Submit", count: scrub_passed },
    { key: "needs_attention", label: "Needs Attention", count: needs_attention },
    { key: "submitted", label: "Submitted", count: submitted_this_month },
    { key: "denied", label: "Denied", count: records.filter(r => r.billing_status === "denied").length },
  ];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllReady = () => {
    const readyIds = filtered.filter(r => r.billing_status === "scrub_passed").map(r => r.id);
    setSelectedIds(new Set(readyIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = (exportRecords: BillingRecord[]) => {
    if (exportRecords.length === 0) {
      toast.info("No records to export.");
      return;
    }
    const headers = [
      "Claim ID", "Individual Name", "Individual ID",
      "Date of Service", "Service Code", "Service Description",
      "Units", "Unit Type", "Rate Per Unit ($)", "Total Amount ($)",
      "Authorization Number", "Payer Name", "Payer ID",
      "Case Manager", "Note Type",
      "Billing Status", "Submitted", "Submission Date",
      "Start Time", "End Time",
    ];

    const escape = (val: string | number | boolean | null | undefined) => {
      const s = String(val ?? "");
      return (s.includes(",") || s.includes('"') || s.includes("\n"))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = exportRecords.map(r => {
      const submittedDate = r.submitted_at
        ? ((r.submitted_at as any)?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "")
        : "";
      return [
        r.id, r.individual_name, r.individual_id,
        r.date_of_service, r.service_code, r.service_description || "",
        r.units, r.billing_unit_type,
        (r.rate_per_unit || 0).toFixed(2), (r.total_amount || 0).toFixed(2),
        r.authorization_number || "", r.payer_name || "", r.payer_id || "",
        r.case_manager_name, r.source_note_type,
        r.billing_status, r.submitted_to_iddbilling ? "Yes" : "No", submittedDate,
        r.start_time || "", r.end_time || "",
      ].map(escape).join(",");
    });

    const csv = [headers.map(escape).join(","), ...rows].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing_claims_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportRecords.length} claim${exportRecords.length !== 1 ? "s" : ""} to CSV`);
  };

  // ── Sync existing signed billable notes into billing queue ────────────────
  const syncFromNotes = async () => {
    if (!userProfile?.organizationId) return;
    setSyncing(true);
    try {
      const orgId = userProfile.organizationId;

      // Fetch all progress notes for this org (filter billable+signed in JS to avoid composite index)
      const notesSnap = await getDocs(
        query(collection(db, "progress_notes"), where("organizationId", "==", orgId))
      );

      const signedBillable = notesSnap.docs.filter(d => {
        const data = d.data();
        return data.isBillable === true && data.status === "signed";
      });

      if (signedBillable.length === 0) {
        toast.info("No signed billable notes found for this organization.");
        setSyncing(false);
        return;
      }

      // Fetch existing billing records to detect duplicates
      const existingSnap = await getDocs(
        query(collection(db, "billing_records"), where("org_id", "==", orgId))
      );
      const existingNoteIds = new Set(
        existingSnap.docs.map(d => d.data().source_note_id).filter(Boolean)
      );

      let created = 0;
      let skipped = 0;

      for (const noteDoc of signedBillable) {
        const noteId = noteDoc.id;
        if (existingNoteIds.has(noteId)) { skipped++; continue; }

        const note = noteDoc.data();
        const svcCode: string = note.serviceCode ?? "";
        const startTime: string = note.startTime ?? "";
        const endTime: string = note.endTime ?? "";
        const authId: string = note.authorizationId ?? "";

        // Compute units from time range
        let units: number = note.units ?? note.billingUnits ?? 0;
        if (units === 0 && startTime && endTime) {
          const [sh, sm] = startTime.split(":").map(Number);
          const [eh, em] = endTime.split(":").map(Number);
          const mins = (eh * 60 + em) - (sh * 60 + sm);
          units = mins > 0 ? Math.floor(mins / 15) : 1;
        }
        if (units === 0) units = 1;

        // Resolve individual name — try note first, then Firestore, then fall back to ID so it's always searchable
        let individualName: string = (note.individualName ?? "").trim();
        if (!individualName && note.individualId) {
          try {
            const indSnap = await getDoc(doc(db, "individuals", note.individualId));
            if (indSnap.exists()) {
              const ind = indSnap.data();
              const last  = (ind.last_name  ?? ind.lastName  ?? "").trim();
              const first = (ind.first_name ?? ind.firstName ?? "").trim();
              if (last || first) individualName = [last, first].filter(Boolean).join(", ");
            }
          } catch { /* Firestore read failed — keep empty, handled below */ }
        }
        // Final fallback: use the individual ID so the record is always searchable
        if (!individualName) individualName = note.individualId ?? "";

        const rate = 28.5;
        const hasComplete = !!svcCode && units > 0 && !!authId;

        try {
          await createBillingRecord({
            org_id: orgId,
            individual_id: note.individualId ?? "",
            individual_name: individualName,
            case_manager_id: note.authorId ?? "",
            case_manager_name: note.authorName ?? "",
            source_note_id: noteId,
            source_note_type: "progress_note",
            source_note_url: `/people/${note.individualId}/progress-note/${noteId}`,
            service_code: svcCode,
            service_description: note.activityType ?? "",
            billing_unit_type: "15_min",
            units,
            rate_per_unit: rate,
            total_amount: units * rate,
            date_of_service: note.progressDate ?? note.date ?? "",
            start_time: startTime,
            end_time: endTime,
            duration_minutes: 0,
            authorization_id: authId,
            authorization_number: authId,
            funding_stream_id: "",
            payer_name: "",
            payer_id: "",
            validation_status: hasComplete ? "passed" : "pending",
            billing_status: hasComplete ? "pending_scrub" : "needs_attention",
            submitted_to_iddbilling: false,
            remittance_received: false,
            signed_by: note.authorId ?? "",
          });
          created++;
        } catch (createErr) {
          console.error(`[billing sync] failed for note ${noteId}:`, createErr);
        }
      }

      if (created > 0) {
        toast.success(
          `Synced ${created} note${created !== 1 ? "s" : ""} into billing queue` +
          (skipped > 0 ? ` · ${skipped} already existed` : "")
        );
      } else if (skipped > 0) {
        toast.info(`All ${skipped} signed billable notes are already in the billing queue.`);
      } else {
        toast.info("Nothing to sync.");
      }
    } catch (err) {
      toast.error("Sync error: " + (err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const runScrub = async () => {
    setScrubbing(true);
    // AI scrub — validates pending_scrub AND needs_attention records
    try {
      const toReview = records.filter(
        r => r.billing_status === "pending_scrub" || r.billing_status === "needs_attention"
      );
      if (toReview.length === 0) {
        toast.info("No claims pending review — all claims are already processed.");
        setScrubbing(false);
        return;
      }
      let passed = 0;
      let attention = 0;
      for (const r of toReview) {
        const hasServiceCode = !!r.service_code;
        const hasUnits = r.units > 0;
        const hasDate = !!r.date_of_service;
        const hasIndividual = !!r.individual_id;
        const newStatus: BillingStatus = (hasServiceCode && hasUnits && hasDate && hasIndividual)
          ? "scrub_passed"
          : "needs_attention";
        await updateBillingRecord(r.id, {
          billing_status: newStatus,
          validation_status: newStatus === "scrub_passed" ? "passed" : "failed",
        });
        if (newStatus === "scrub_passed") passed++;
        else attention++;
      }
      if (attention > 0) {
        toast.success(`Scrub complete — ${passed} passed, ${attention} need attention`);
      } else {
        toast.success(`Scrub complete — ${passed} claim${passed !== 1 ? "s" : ""} ready to submit`);
      }
    } catch (err) {
      toast.error("Scrub error: " + (err as Error).message);
    } finally {
      setScrubbing(false);
    }
  };

  const handleSubmit = async () => {
    if (!userProfile?.organizationId) return;
    setSubmitting(true);

    try {
      // Fetch org billing info
      const orgSnap = await getDoc(doc(db, "organizations", userProfile.organizationId));
      const orgData = orgSnap.data() || {};
      const billing = orgData.billing || {};

      const orgInfo: OrgBillingInfo = {
        npi: billing.npi || "",
        taxId: billing.taxId || "",
        name: orgData.name || "Organization",
        submitterId: billing.submitterId || "",
        isaSenderId: billing.isaSenderId || "",
        street: orgData.address?.street,
        city: orgData.address?.city,
        state: orgData.address?.state,
        zip: orgData.address?.zip,
      };

      const claimPayloads = readyToSubmit.map(r => ({
        claim_id: r.id,
        individual_id: r.individual_id,
        individual_name: r.individual_name,
        date_of_service: r.date_of_service,
        service_code: r.service_code,
        service_description: r.service_description || "",
        billing_unit_type: r.billing_unit_type,
        units: r.units,
        rate_per_unit: r.rate_per_unit,
        total_amount: r.total_amount,
        authorization_number: r.authorization_number,
        payer_id: r.payer_id || "",
        payer_name: r.payer_name || "",
        rendering_provider_npi: orgInfo.npi,
        billing_provider_npi: orgInfo.npi,
        place_of_service: "11",
        diagnosis_codes: [],
        case_manager_name: r.case_manager_name,
        note_type: r.source_note_type,
        source_note_id: r.source_note_id,
        validation_status: r.validation_status,
      }));

      // Try IDD Billing.AI submission
      const result = await submitToIddBilling(
        {
          batch_id: `BATCH-${Date.now()}`,
          submitted_by: userProfile.uid || "",
          submitted_at: new Date().toISOString(),
          org_id: userProfile.organizationId,
          org_name: orgInfo.name,
          claims: claimPayloads,
        },
        userProfile.organizationId,
      );

      if (result.success) {
        // Mark all records as submitted
        const claimMap: Record<string, { id: string; status: string }> = {};
        (result.claims || []).forEach(c => { claimMap[c.claim_id] = { id: c.id, status: c.status }; });
        await markRecordsSubmitted(readyToSubmit.map(r => r.id), result.batch_id || "", claimMap);
        toast.success(`${readyToSubmit.length} claims submitted to IDD Billing.AI`);
      } else {
        // API not configured or error — export 837P file as fallback
        const ediContent = generate837P(claimPayloads, orgInfo, `BATCH-${Date.now()}`);
        const blob = new Blob([ediContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `837P_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`837P file exported — ${readyToSubmit.length} claims`);

        // Still mark as submitted locally
        await markRecordsSubmitted(readyToSubmit.map(r => r.id), "", {});
      }

      clearSelection();
      setConfirmOpen(false);
    } catch (err) {
      toast.error("Submission error: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ICMShell title="Billing" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Billing" }]}
        />

        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            Billing
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            AI-scrubbed claims engine · IDD Billing.AI integration
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Clock} tone="gray" value={String(pending_scrub)} label="Pending Scrub" sub="Awaiting AI review" />
          <StatCard icon={CheckCircle2} tone="green" value={String(scrub_passed)} label="Scrub Passed" sub={`$${total_ready_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ready`} />
          <StatCard icon={AlertTriangle} tone="amber" value={String(needs_attention)} label="Needs Attention" sub="Action required" />
          <StatCard icon={Send} tone="blue" value={String(submitted_this_month)} label="Submitted" sub="This month" />
        </div>

        {/* AI Scrub Agent banner */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 border-l-4 border-l-teal-500">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <p className="font-manrope font-bold text-[13.5px] text-icm-text">AI Billing Agent — Active</p>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
                Reviewing completed notes. {pending_scrub > 0 ? `${pending_scrub} claims awaiting scrub.` : "All claims reviewed."} Click to run full scrub now.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={syncFromNotes}
                disabled={syncing}
                className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-[11.5px] font-geist font-semibold text-slate-600 inline-flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-60"
                title="Pull all existing signed billable notes into the billing queue"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseZap className="w-3.5 h-3.5" />}
                Sync from Notes
              </button>
              <button
                onClick={runScrub}
                disabled={scrubbing}
                className="h-8 px-3 rounded-lg border border-teal-600 bg-white text-[11.5px] font-geist font-semibold text-teal-600 inline-flex items-center gap-1.5 hover:bg-teal-50 disabled:opacity-60"
              >
                {scrubbing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Run full scrub
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-2 text-[12px] font-geist font-semibold -mb-px border-b-2 transition-colors",
                tab === t.key
                  ? "border-icm-accent text-icm-text"
                  : "border-transparent text-icm-text-dim hover:text-icm-text"
              )}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span className="ml-1.5 text-icm-text-dim">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
          <input
            value={filterIndividual}
            onChange={e => setFilterIndividual(e.target.value)}
            placeholder="Individual name…"
            className="h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none w-[160px]"
          />
          <input
            value={filterCode}
            onChange={e => setFilterCode(e.target.value)}
            placeholder="Service code…"
            className="h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[11.5px] font-mono text-icm-text placeholder:text-icm-text-faint focus:outline-none w-[120px]"
          />
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist text-icm-text focus:outline-none"
          />
          <span className="text-[11px] text-icm-text-faint">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist text-icm-text focus:outline-none"
          />
          {(filterIndividual || filterCode || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setFilterIndividual(""); setFilterCode(""); setFilterDateFrom(""); setFilterDateTo(""); }}
              className="h-8 px-2.5 rounded-lg border border-icm-border text-[11.5px] font-geist text-icm-text-dim hover:bg-icm-bg"
            >
              Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => exportCSV(selectedIds.size > 0 ? selectedRecords : filtered)}
              disabled={filtered.length === 0}
              className="h-8 px-3 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist font-semibold text-icm-text inline-flex items-center gap-1.5 hover:bg-icm-bg disabled:opacity-40"
              title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected claims` : `Export all ${filtered.length} claims in this view`}
            >
              <Download className="w-3.5 h-3.5" />
              {selectedIds.size > 0 ? `Export ${selectedIds.size} selected` : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Batch submit bar */}
        {selectedIds.size > 0 && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-geist text-icm-text">
                <span className="font-semibold">{selectedIds.size} claims selected</span>
                {readyToSubmit.length > 0 && (
                  <span className="text-icm-text-dim ml-1">
                    ({readyToSubmit.length} ready · ${totalReadyAmount.toFixed(2)})
                  </span>
                )}
              </span>
              <button
                onClick={clearSelection}
                className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text"
              >
                <X className="w-3.5 h-3.5 inline" /> Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllReady}
                className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold text-icm-text"
              >
                Select All Ready
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={readyToSubmit.length === 0}
                className="h-8 px-3 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700 disabled:opacity-40"
              >
                Submit to IDD Billing.AI <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Claims table */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-icm-text-dim">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[12px] font-geist">Loading claims…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] font-geist min-w-[900px]">
                <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onChange={e => e.target.checked ? setSelectedIds(new Set(filtered.map(r => r.id))) : clearSelection()}
                        className="accent-teal-600"
                      />
                    </th>
                    <Th>Individual</Th>
                    <Th>Date of Service</Th>
                    <Th>Service Code</Th>
                    <Th>Units</Th>
                    <Th>Amount</Th>
                    <Th>Authorization</Th>
                    <Th>Billing Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t border-icm-border hover:bg-icm-bg/40 cursor-pointer transition-colors",
                        selectedIds.has(r.id) && "bg-teal-50/30"
                      )}
                      onClick={() => setDrawerRecord(r)}
                    >
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="accent-teal-600"
                        />
                      </td>
                      <td className="px-3 py-2 text-icm-text font-semibold">{r.individual_name}</td>
                      <td className="px-3 py-2 text-icm-text-dim font-mono">{r.date_of_service || "—"}</td>
                      <td className="px-3 py-2 text-icm-text font-mono font-semibold">{r.service_code}</td>
                      <td className="px-3 py-2 text-icm-text-dim">{r.units} units</td>
                      <td className="px-3 py-2 text-icm-text font-mono font-semibold">
                        ${(r.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">
                        {r.authorization_number || "—"}
                      </td>
                      <td className="px-3 py-2"><BillingStatusBadge status={r.billing_status} /></td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {r.billing_status === "scrub_passed" && !r.submitted_to_iddbilling && (
                            <button
                              onClick={() => { setSelectedIds(new Set([r.id])); setConfirmOpen(true); }}
                              className="text-[11.5px] font-geist font-semibold text-teal-600 hover:underline"
                            >
                              Submit
                            </button>
                          )}
                          <button
                            onClick={() => setDrawerRecord(r)}
                            className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-12 text-center text-[12px]">
                        {loading ? (
                          <span className="text-icm-text-dim">Loading…</span>
                        ) : (filterIndividual || filterCode || filterDateFrom || filterDateTo) ? (
                          <div className="space-y-1">
                            <p className="text-icm-text font-semibold">No claims match your filters.</p>
                            <p className="text-icm-text-dim text-[11px]">
                              {records.length > 0
                                ? `${records.length} total claim${records.length !== 1 ? "s" : ""} — try adjusting the filters above.`
                                : "No claims found. Run ‘Sync from Notes’ to pull in signed billable notes."}
                            </p>
                            <button
                              onClick={() => { setFilterIndividual(""); setFilterCode(""); setFilterDateFrom(""); setFilterDateTo(""); }}
                              className="mt-2 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                            >
                              Clear all filters
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-icm-text-dim">No claims in this view.</p>
                            {records.length === 0 && (
                              <p className="text-[11px] text-icm-text-faint">
                                Click <strong>Sync from Notes</strong> above to pull signed billable notes into the queue.
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Integration footer */}
        <div className="rounded-xl border border-icm-border bg-icm-bg/40 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] font-geist text-icm-text-dim">
            Connected to IDD Billing.AI · {records.filter(r => r.submitted_to_iddbilling).length} claims submitted · Live Firestore
          </p>
          <button
            onClick={() => toast("Opening IDD Billing.AI dashboard")}
            className="text-[11px] font-geist text-icm-accent hover:underline inline-flex items-center gap-1"
          >
            Open IDD Billing.AI <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Confirm submit modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-md p-5"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-manrope font-bold text-[15px] text-icm-text">
              Submit {readyToSubmit.length} claim{readyToSubmit.length !== 1 ? "s" : ""} to IDD Billing.AI?
            </h3>
            <div className="mt-3 rounded-xl border border-icm-border bg-icm-bg/40 p-3 space-y-1">
              <div className="flex items-center justify-between text-[12px] font-geist">
                <span className="text-icm-text-dim">Claims ready</span>
                <span className="font-semibold text-icm-text">{readyToSubmit.length}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] font-geist">
                <span className="text-icm-text-dim">Total amount</span>
                <span className="font-mono font-semibold text-teal-700">${totalReadyAmount.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-3 leading-relaxed">
              Claims will be transmitted as an 837P file via IDD Billing.AI. If the API key is not configured, an 837P file will be exported for manual upload.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmOpen(false)}
                className="h-9 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || readyToSubmit.length === 0}
                className="h-9 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim detail drawer */}
      {drawerRecord && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDrawerRecord(null)}>
          <div
            className="absolute top-0 right-0 h-full w-full max-w-[420px] bg-icm-panel border-l border-icm-border shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
              <div>
                <p className="text-[10.5px] font-geist uppercase tracking-wider text-icm-text-dim">Claim Detail</p>
                <p className="font-manrope font-bold text-[14px] text-icm-text">
                  {drawerRecord.individual_name} · {drawerRecord.date_of_service}
                </p>
              </div>
              <button onClick={() => setDrawerRecord(null)} className="text-icm-text-dim hover:text-icm-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <BillingStatusBadge status={drawerRecord.billing_status} />
                {drawerRecord.submitted_to_iddbilling && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                    IDD Billing.AI submitted
                  </span>
                )}
              </div>

              {/* Service info */}
              <ClaimSection title="Service Details">
                <KV label="Service Code" value={drawerRecord.service_code} mono />
                <KV label="Description" value={drawerRecord.service_description || "—"} />
                <KV label="Units" value={`${drawerRecord.units} units`} />
                <KV label="Rate" value={`$${(drawerRecord.rate_per_unit || 0).toFixed(2)}/unit`} mono />
                <KV label="Total Amount" value={`$${(drawerRecord.total_amount || 0).toFixed(2)}`} mono />
                <KV label="Date of Service" value={drawerRecord.date_of_service} mono />
                <KV label="Time" value={drawerRecord.start_time && drawerRecord.end_time ? `${drawerRecord.start_time} – ${drawerRecord.end_time}` : "—"} />
              </ClaimSection>

              {/* Authorization */}
              <ClaimSection title="Authorization">
                <KV label="Auth Number" value={drawerRecord.authorization_number || "—"} mono />
                <KV label="Payer" value={drawerRecord.payer_name || "—"} />
              </ClaimSection>

              {/* Validation */}
              {drawerRecord.validation_checks && (
                <ClaimSection title="Validation Results">
                  {Object.entries(drawerRecord.validation_checks).map(([key, check]: [string, any]) => (
                    <div key={key} className="flex items-start gap-2">
                      {check?.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-icm-green shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-[11.5px] font-geist font-medium text-icm-text capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] font-geist text-icm-text-dim">{check?.message}</p>
                      </div>
                    </div>
                  ))}
                </ClaimSection>
              )}

              {/* Denial reason */}
              {drawerRecord.denial_reason && (
                <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                  <p className="text-[11.5px] font-geist font-semibold text-red-700 mb-1">Denial Reason</p>
                  <p className="text-[11.5px] font-geist text-red-700">{drawerRecord.denial_reason}</p>
                </div>
              )}

              {/* Source note link */}
              {drawerRecord.source_note_url && (
                <a
                  href={drawerRecord.source_note_url}
                  className="flex items-center gap-1.5 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                >
                  View source note <ChevronRight className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Actions */}
              {drawerRecord.billing_status === "scrub_passed" && !drawerRecord.submitted_to_iddbilling && (
                <button
                  onClick={() => {
                    setSelectedIds(new Set([drawerRecord.id]));
                    setDrawerRecord(null);
                    setConfirmOpen(true);
                  }}
                  className="w-full h-9 rounded-xl bg-teal-600 text-white text-[12.5px] font-geist font-semibold hover:bg-teal-700 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Submit to IDD Billing.AI
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-semibold">{children}</th>;
}

function StatCard({ icon: Icon, tone, value, label, sub }: {
  icon: typeof Clock; tone: "gray" | "green" | "amber" | "blue"; value: string; label: string; sub: string;
}) {
  const toneMap = {
    gray: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  } as const;
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", toneMap[tone])}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</p>
      </div>
      <p className="mt-2 font-manrope font-extrabold text-[24px] text-icm-text leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-geist text-icm-text-dim">{sub}</p>
    </div>
  );
}

function BillingStatusBadge({ status }: { status: BillingStatus }) {
  const map: Record<BillingStatus, string> = {
    pending_scrub: "bg-slate-100 text-slate-700 ring-slate-200",
    scrub_passed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    needs_attention: "bg-amber-50 text-amber-700 ring-amber-200",
    submitted: "bg-blue-50 text-blue-700 ring-blue-200",
    accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    denied: "bg-red-50 text-red-700 ring-red-200",
    adjusted: "bg-purple-50 text-purple-700 ring-purple-200",
    void: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const labels: Record<BillingStatus, string> = {
    pending_scrub: "Pending Scrub",
    scrub_passed: "Ready",
    needs_attention: "Needs Attention",
    submitted: "Submitted",
    accepted: "Accepted",
    denied: "Denied",
    adjusted: "Adjusted",
    void: "Void",
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded-full text-[10.5px] font-geist font-semibold ring-1 inline-flex items-center", map[status] || "bg-slate-100 text-slate-700")}>
      {labels[status] || status}
    </span>
  );
}

function ClaimSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] font-geist font-bold uppercase tracking-[0.1em] text-icm-text-dim mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] font-geist text-icm-text-dim">{label}</span>
      <span className={cn("text-[11.5px] font-geist text-icm-text", mono && "font-mono font-semibold")}>{value}</span>
    </div>
  );
}

export default BillingHub;
