import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc, getDocs, updateDoc, collection,
  serverTimestamp, query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Building2, Plus, MoreHorizontal, AlertTriangle, Pencil, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  usePrograms,
  computeEnrollmentStatus,
  type Program,
} from "@/hooks/usePrograms";

// ─── State migrations (keep existing logic) ──────────────────────────────────

const STATE_MIGRATIONS: { nameMatch: string; state: string }[] = [
  { nameMatch: "Case MGMT",    state: "Indiana"     },
  { nameMatch: "Ohio",         state: "Ohio"         },
  { nameMatch: "NJ Case Mgmt", state: "New Jersey"   },
];

async function runMigrationIfNeeded(orgId: string) {
  try {
    const q = query(collection(db, "programs"), where("organizationId", "==", orgId));
    const snap = await getDocs(q);

    const updatePromises: Promise<void>[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const migration = STATE_MIGRATIONS.find(
        (m) => data.name && data.name.toLowerCase().includes(m.nameMatch.toLowerCase())
      );
      if (migration && data.state !== migration.state) {
        updatePromises.push(
          updateDoc(doc(db, "programs", d.id), {
            state: migration.state,
            updatedAt: serverTimestamp(),
          })
        );
      }
    });
    await Promise.all(updatePromises);

    const programsSnap = await getDocs(q);
    const defaultProgram = programsSnap.docs.find((d) => {
      const data = d.data();
      return (data.state === "Indiana" || STATE_MIGRATIONS[0].nameMatch === data.name) && data.active !== false;
    });
    if (!defaultProgram) return;

    const progData = defaultProgram.data();
    const defaultState = progData.state || "Indiana";
    const defaultName = progData.name || "Case MGMT";
    const defaultCode = progData.code || "";
    const defaultPayer = progData.payer || "Medicaid";

    const indsSnap = await getDocs(
      query(collection(db, "individuals"), where("organizationId", "==", orgId))
    );
    const indUpdatePromises: Promise<void>[] = [];
    indsSnap.docs.forEach((d) => {
      const data = d.data();
      if (!data.state && !data.address_state) {
        indUpdatePromises.push(
          updateDoc(doc(db, "individuals", d.id), {
            state: defaultState,
            program: defaultName,
            programId: defaultProgram.id,
            programName: defaultName,
            programCode: defaultCode,
            payer: defaultPayer,
          })
        );
      }
    });
    await Promise.all(indUpdatePromises);

    if (updatePromises.length > 0 || indUpdatePromises.length > 0) {
      console.log(
        `[Programs migration] Updated ${updatePromises.length} programs and ${indUpdatePromises.length} individuals.`
      );
    }
  } catch (err) {
    console.warn("[Programs migration] Failed (non-fatal):", err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enrollmentBadge(program: Program) {
  const es = computeEnrollmentStatus(program.providerEnrollment);
  const base = "px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ring-1";
  switch (es.status) {
    case "active":
      return <span className={cn(base, "bg-icm-green-soft text-icm-green ring-icm-green/20")}>{es.label}</span>;
    case "pending":
      return <span className={cn(base, "bg-amber-50 text-amber-700 ring-amber-200")}>⚠ {es.label}</span>;
    case "expired":
      return <span className={cn(base, "bg-red-50 text-red-600 ring-red-200")}>{es.label}</span>;
    case "expiring_soon":
      return <span className={cn(base, "bg-amber-50 text-amber-700 ring-amber-200")}>⚠ {es.label}</span>;
    default:
      return <span className={cn(base, "bg-icm-bg text-icm-text-dim ring-icm-border")}>{es.label}</span>;
  }
}

// ─── Program card ─────────────────────────────────────────────────────────────

function ProgramCard({ program, onDeactivate, onDelete }: {
  program: Program;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const isActive = program.status === "active" || program.active !== false;

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-manrope font-bold text-[14px] text-icm-text leading-tight">
                {program.name}
              </h3>
              {(program.abbreviation || program.code) && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
                  {program.abbreviation || program.code}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-icm-text-dim mt-0.5">
              {program.stateName || program.state}
              {(program.fundingType || program.payer) && (
                <> · <span className="capitalize">{
                  program.fundingType
                    ? program.fundingType.replace(/_/g, " ")
                    : program.payer
                }</span></>
              )}
            </p>
          </div>
        </div>

        {/* Right: status + enrollment badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1",
            isActive
              ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
              : "bg-icm-bg text-icm-text-dim ring-icm-border"
          )}>
            {isActive ? "Active" : "Inactive"}
          </span>
          {enrollmentBadge(program)}
          {/* TODO: Show payer + billing rule counts — requires N+1 queries per card (useProgramPayers/useProgramBillingRules). Render "—" for now. */}
          <span className="text-[10px] text-icm-text-faint font-mono">— payers · — rules</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-icm-border pt-3 flex items-center justify-between">
        <button
          onClick={() => navigate(`/settings/programs/${program.id}/configure`)}
          className="h-8 px-3 rounded-xl bg-teal-600 text-white font-semibold text-[12px] hover:bg-teal-700 inline-flex items-center gap-1"
        >
          Configure →
        </button>

        {/* ··· menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-lg border border-icm-border flex items-center justify-center hover:bg-icm-bg text-icm-text-dim"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 z-10 w-40 rounded-xl border border-icm-border bg-white shadow-lg py-1">
              <button
                onClick={() => { setMenuOpen(false); navigate(`/settings/programs/${program.id}/configure`); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-icm-text hover:bg-icm-bg"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDeactivate(program.id); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-icm-text hover:bg-icm-bg"
              >
                {isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(program.id); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

const SettingsPrograms = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [migrationDone, setMigrationDone] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Keep migration logic
  useEffect(() => {
    if (!orgId || migrationDone) return;
    setMigrationDone(true);
    runMigrationIfNeeded(orgId);
  }, [orgId, migrationDone]);

  const { data: programs, loading } = usePrograms(orgId);

  // Warning banner: programs expiring within 90 days
  const expiringPrograms = programs.filter((p) => {
    const es = computeEnrollmentStatus(p.providerEnrollment);
    return es.status === "expiring_soon";
  });

  const handleDeactivate = async (programId: string) => {
    const p = programs.find((x) => x.id === programId);
    if (!p) return;
    const isActive = p.status === "active" || p.active !== false;
    try {
      await updateDoc(doc(db, "programs", programId), {
        status: isActive ? "inactive" : "active",
        active: !isActive,
        updatedAt: serverTimestamp(),
      });
      toast.success("Program status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update program status");
    }
  };

  const handleDelete = async (programId: string) => {
    setDeleteConfirmId(programId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await updateDoc(doc(db, "programs", deleteConfirmId), {
        _deleted: true,
        updatedAt: serverTimestamp(),
      });
      toast.success("Program deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete program");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <ICMShell title="Programs & States">
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: "Admin Settings", to: "/settings" },
            { label: "Programs & States" },
          ]}
        />

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-manrope font-bold text-[26px] text-icm-text leading-tight">
              Programs & States
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Configure each program. Billing, enrollment, and compliance rules are set per program.
            </p>
          </div>
          <button
            onClick={() => navigate("/settings/programs/new")}
            className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel font-semibold text-[12px] hover:opacity-90 inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add program
          </button>
        </div>

        {/* Expiry warning banner */}
        {expiringPrograms.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-amber-800">
              <span className="font-semibold">Provider enrollment expiring soon:</span>{" "}
              {expiringPrograms.map((p) => p.name).join(", ")}.{" "}
              Renew before expiry to avoid billing disruption.
            </p>
          </div>
        )}

        {/* Program cards grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-4 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-5 h-40" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-icm-border bg-icm-panel p-10 text-center">
            <Building2 className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
            <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">
              No programs configured yet.
            </p>
            <button
              onClick={() => navigate("/settings/programs/new")}
              className="mt-3 text-[12.5px] text-teal-600 hover:underline font-semibold"
            >
              + Add your first program
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {programs.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl bg-icm-panel border border-icm-border shadow-lg w-full max-w-sm p-6">
            <h2 className="font-manrope font-bold text-[15px] text-icm-text mb-2">Delete program?</h2>
            <p className="text-[12.5px] text-icm-text-dim mb-4">
              This action cannot be undone. Billing rules and payers linked to this program will remain but become unlinkable.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="h-9 px-4 rounded-xl bg-red-600 text-white font-semibold text-[12px] hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

export default SettingsPrograms;
