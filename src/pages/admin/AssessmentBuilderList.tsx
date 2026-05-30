import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { useRole } from "@/contexts/RoleContext";
import { useAssessmentTemplates } from "@/hooks/useAssessmentTemplates";
import {
  ClipboardList,
  Plus,
  Search,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const typeColor: Record<string, string> = {
  Initial: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  Annual: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  Screening: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  Custom: "bg-icm-bg text-icm-text-dim ring-icm-border",
  "Significant Change": "bg-icm-red-soft text-icm-red ring-icm-red/20",
  Transition: "bg-icm-bg text-icm-text-dim ring-icm-border",
};

const statusColor: Record<string, string> = {
  published: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  draft: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  archived: "bg-icm-bg text-icm-text-faint ring-icm-border",
};

export default function AssessmentBuilderList() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { templates } = useAssessmentTemplates("all");

  if (!isAdmin) return <AdminOnly />;

  const sum = {
    total: templates.length,
    published: templates.filter((t) => t.status === "published").length,
    draft: templates.filter((t) => t.status === "draft").length,
    archived: templates.filter((t) => t.status === "archived").length,
  };
  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <ICMShell title="Assessment Builder" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        <button
          onClick={() => navigate("/agents")}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Platform
        </button>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Assessment Builder
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist max-w-[640px]">
              Create and manage assessment templates for your organization.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/assessment-builder/new")}
            className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" />
            New Assessment Template
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Chip label={`Total: ${sum.total}`} tone="neutral" />
          <Chip label={`Published: ${sum.published}`} tone="green" />
          <Chip label={`Draft: ${sum.draft}`} tone="amber" />
          <Chip label={`Archived: ${sum.archived}`} tone="gray" />
        </div>

        <div className="relative max-w-[400px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates…"
            className="h-9 w-full pl-8 pr-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((t) => {
            const qcount = t.sections.reduce(
              (acc, s) => acc + s.questions.length,
              0,
            );
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/admin/assessment-builder/${t.id}/edit`)}
                className="w-full text-left rounded-xl border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong hover:shadow-elevated transition-all flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-icm-accent-soft text-icm-accent flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-manrope font-bold text-[14px] text-icm-text">
                      {t.name}
                    </h3>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${typeColor[t.type]}`}>
                      {t.type}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 uppercase ${statusColor[t.status]}`}>
                      {t.status}
                    </span>
                    <span className="text-[10px] font-mono text-icm-text-faint">
                      {t.version}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-icm-text-dim font-geist mt-1">
                    {t.sections.length} sections · {qcount} questions · Updated {t.updatedAt}
                  </p>
                </div>
                <MoreHorizontal className="w-4 h-4 text-icm-text-faint" />
              </button>
            );
          })}
        </div>
      </div>
    </ICMShell>
  );
}

function Chip({ label, tone }: { label: string; tone: "green" | "amber" | "gray" | "neutral" }) {
  const cls =
    tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "amber"
        ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
        : tone === "gray"
          ? "bg-icm-bg text-icm-text-faint ring-icm-border"
          : "bg-icm-accent-soft text-icm-accent ring-icm-accent/20";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${cls}`}>
      {label}
    </span>
  );
}
