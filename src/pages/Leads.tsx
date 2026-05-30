import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Inbox,
  Phone,
  Mail,
  Calendar,
  Paperclip,
  ChevronRight,
  AlertTriangle,
  Link,
} from "lucide-react";
import {
  getLeads,
  leadStatusStyles,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/data/leads";
import { cn } from "@/lib/utils";
import { usePendingLeads } from "@/hooks/usePendingLeads";
import type { PendingLead } from "@/hooks/usePendingLeads";

export default function Leads() {
  const navigate = useNavigate();
  const [leads] = useState(() => getLeads());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeadStatus | "All" | "Pending Review">("All");
  const { pendingLeads, loading: pendingLoading } = usePendingLeads();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const matchQ =
        !q ||
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
        l.referralOrg.toLowerCase().includes(q) ||
        l.referrerName.toLowerCase().includes(q) ||
        l.county.toLowerCase().includes(q);
      const matchStatus = status === "All" || status === "Pending Review" || l.status === status;
      return matchQ && matchStatus;
    });
  }, [leads, query, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: leads.length, "Pending Review": pendingLeads.length };
    LEAD_STATUSES.forEach((s) => (c[s] = leads.filter((l) => l.status === s).length));
    return c;
  }, [leads, pendingLeads.length]);

  return (
    <ICMShell title="Leads" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Leads" }]}
        />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Leads
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Inbound referrals and prospective individuals. Capture full profile
              and supporting documents — convert to an active caseload member
              with <span className="font-semibold">Start Services</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/leads/intake-links")}
              variant="outline"
              className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400"
            >
              <Link className="w-4 h-4 mr-1.5" />
              Intake Links
            </Button>
            <Button
              onClick={() => navigate("/leads/new")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Lead
            </Button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {(["All", ...LEAD_STATUSES, "Pending Review"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s as LeadStatus | "All" | "Pending Review")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                status === s
                  ? s === "Pending Review"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-icm-text-dim border-icm-border hover:border-icm-border-strong"
              )}
            >
              {s}
              {s === "Pending Review" && pendingLeads.length > 0 && (
                <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold", status === s ? "bg-white/30" : "bg-orange-100 text-orange-700")}>
                  {pendingLeads.length}
                </span>
              )}
              {s !== "Pending Review" && <span className="opacity-70 ml-1">{counts[s] ?? 0}</span>}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, referrer, organization, county…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Select value={status === "Pending Review" ? "All" : status} onValueChange={(v) => setStatus(v as LeadStatus | "All")}>
            <SelectTrigger className="w-44 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leads list */}
        {status === "Pending Review" ? (
          pendingLoading ? (
            <div className="rounded-xl border border-icm-border bg-card p-12 text-center">
              <p className="text-sm text-icm-text-dim">Loading pending leads…</p>
            </div>
          ) : pendingLeads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-icm-border bg-card p-12 text-center">
              <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-icm-text-dim">No pending leads to review.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-icm-border bg-card overflow-hidden">
              {pendingLeads.map((l, i) => (
                <PendingLeadRow
                  key={l.id}
                  lead={l}
                  isLast={i === pendingLeads.length - 1}
                  onClick={() => navigate(`/leads/pending/${l.id}`)}
                />
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-icm-border bg-card p-12 text-center">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-icm-text-dim">No leads match your filters.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-icm-border bg-card overflow-hidden">
            {filtered.map((l, i) => {
              const name = `${l.firstName} ${l.lastName}`.trim() || "Unnamed lead";
              const age = l.dob ? calcAge(l.dob) : null;
              return (
                <button
                  key={l.id}
                  onClick={() => navigate(`/leads/${l.id}`)}
                  className={cn(
                    "w-full text-left grid grid-cols-12 gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors items-center",
                    i !== filtered.length - 1 && "border-b border-icm-border"
                  )}
                >
                  <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                      {(l.firstName[0] ?? "?") + (l.lastName[0] ?? "")}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-icm-text truncate">
                        {name}
                        {age !== null && (
                          <span className="text-muted-foreground font-normal ml-1.5">· {age}y</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.county ? `${l.county} County · ` : ""}
                        {l.primaryDiagnosis || "Diagnosis pending"}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-6 md:col-span-3 text-xs">
                    <div className="text-muted-foreground">Referred by</div>
                    <div className="text-icm-text truncate font-medium">
                      {l.referrerName || "—"}
                    </div>
                    <div className="text-muted-foreground truncate">{l.referralOrg}</div>
                  </div>

                  <div className="col-span-6 md:col-span-2 text-xs space-y-0.5">
                    {l.phone && (
                      <div className="flex items-center gap-1.5 text-icm-text-dim">
                        <Phone className="w-3 h-3" /> {l.phone}
                      </div>
                    )}
                    {l.email && (
                      <div className="flex items-center gap-1.5 text-icm-text-dim truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{l.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-6 md:col-span-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(l.referralDate || l.createdAt).toLocaleDateString()}
                    </div>
                    {l.documents.length > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                        <Paperclip className="w-3 h-3" /> {l.documents.length} document
                        {l.documents.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>

                  <div className="col-span-6 md:col-span-1 flex items-center justify-end gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap",
                        leadStatusStyles[l.status]
                      )}
                    >
                      {l.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ICMShell>
  );
}

function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function PendingLeadRow({
  lead,
  isLast,
  onClick,
}: {
  lead: PendingLead;
  isLast: boolean;
  onClick: () => void;
}) {
  const urgencyBadge = () => {
    if (lead.urgencyLevel === "crisis") return "bg-red-100 text-red-700 border-red-200";
    if (lead.urgencyLevel === "urgent") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const submittedDate = lead.submittedAt
    ? new Date(lead.submittedAt.seconds * 1000).toLocaleDateString()
    : "—";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left grid grid-cols-12 gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors items-center",
        !isLast && "border-b border-icm-border",
        lead.urgencyLevel === "crisis" && "bg-red-50/30"
      )}
    >
      <div className="col-span-12 md:col-span-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-semibold text-sm shrink-0">
          {(lead.firstName[0] ?? "?") + (lead.lastName[0] ?? "")}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-icm-text truncate">
            {lead.firstName} {lead.lastName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {lead.primaryDiagnosis || "Diagnosis pending"}
          </div>
        </div>
      </div>

      <div className="col-span-6 md:col-span-3 text-xs">
        <div className="text-muted-foreground">Referred by</div>
        <div className="text-icm-text truncate font-medium">{lead.referrerName || "—"}</div>
        <div className="text-muted-foreground truncate">{lead.referrerOrganization}</div>
      </div>

      <div className="col-span-6 md:col-span-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {submittedDate}
        </div>
        {lead.intakeLinkLabel && (
          <div className="text-icm-text-faint truncate mt-0.5">via {lead.intakeLinkLabel}</div>
        )}
      </div>

      <div className="col-span-6 md:col-span-2 flex flex-wrap gap-1.5 items-center">
        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase", urgencyBadge())}>
          {lead.urgencyLevel}
        </span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-600 border-orange-200 uppercase">
          Pending Review
        </span>
      </div>

      <div className="col-span-6 md:col-span-1 flex items-center justify-end gap-2">
        <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
      </div>
    </button>
  );
}
