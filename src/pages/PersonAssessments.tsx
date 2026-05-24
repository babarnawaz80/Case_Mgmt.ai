import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ChevronLeft,
  Plus,
  ClipboardList,
  Sparkles,
  Search,
  Activity,
  X,
  Loader2,
} from "lucide-react";
import { useIndividual } from "@/hooks/useIndividuals";
import {
  listAssessments,
  listInstruments,
  templates,
  getTemplate,
} from "@/data/assessments";

const tabs = ["assessments", "instruments"] as const;
type Tab = (typeof tabs)[number];

export default function PersonAssessments() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const [tab, setTab] = useState<Tab>("assessments");
  const [showSelector, setShowSelector] = useState(false);

  if (loading) {
    return (
      <ICMShell title="Assessments" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Assessments" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim">Person not found.</p>
      </ICMShell>
    );
  }

  const items = listAssessments(individual.id);
  const instruments = listInstruments(individual.id);

  return (
    <ICMShell title="Assessments" showAIPanel={false}>
      <div className="space-y-5">
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          eChart
        </button>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[22px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Assessments
            </h1>
            <p className="text-[12.5px] text-icm-text-dim mt-1 font-geist">
              {individual.first_name} {individual.last_name} · ID #{individual.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/assessment-builder")}
              className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
            >
              Manage templates →
            </button>
            <button
              onClick={() => setShowSelector(true)}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              Start Assessment
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-icm-border flex gap-4">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-[12.5px] font-geist font-semibold capitalize border-b-2 ${tab === t ? "border-icm-accent text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "assessments" && (
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
                <ClipboardList className="w-10 h-10 text-icm-text-faint mx-auto" />
                <h3 className="font-manrope font-bold text-[15px] text-icm-text mt-3">
                  No assessments yet
                </h3>
                <p className="text-[12.5px] text-icm-text-dim mt-1">
                  Complete {individual.first_name}'s first assessment to establish a
                  baseline for service planning and authorization.
                </p>
                <button
                  onClick={() => setShowSelector(true)}
                  className="mt-4 h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Start with AI pre-fill
                </button>
              </div>
            )}

            {items.map((a) => {
              const tpl = getTemplate(a.templateId);
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/people/${individual.id}/assessments/${a.id}`)}
                  className="w-full text-left rounded-xl border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong hover:shadow-elevated flex items-center gap-4"
                >
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
                    {a.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-manrope font-bold text-[14px] text-icm-text">
                      {tpl?.name}
                    </p>
                    <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                      {a.date} · {tpl?.type} · Completed by {a.completedBy}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-icm-text-faint">Score</p>
                    <p className="font-manrope font-bold text-[16px] text-icm-text">
                      {a.totalScore}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${a.loc === "Moderate" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" : "bg-icm-green-soft text-icm-green ring-icm-green/20"}`}
                  >
                    LOC: {a.loc}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 bg-icm-green-soft text-icm-green ring-icm-green/20">
                    {a.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "instruments" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-3 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
              <p className="text-[12px] font-geist text-icm-text">
                <span className="font-semibold">Intellectability integration available.</span>{" "}
                <span className="text-icm-text-dim">
                  HRST scores can be auto-imported when the integration is enabled.
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-icm-border flex items-center justify-between">
                <h3 className="font-manrope font-bold text-[14px] text-icm-text">
                  Standardized instrument scores
                </h3>
                <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">
                  + Add score
                </button>
              </div>
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg text-icm-text-dim text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Instrument</th>
                    <th className="text-left px-4 py-2 font-semibold">Score</th>
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-left px-4 py-2 font-semibold">Scored By</th>
                    <th className="text-left px-4 py-2 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {instruments.map((s) => (
                    <tr key={s.id} className="border-t border-icm-border">
                      <td className="px-4 py-2 font-semibold text-icm-text">
                        {s.instrument}
                      </td>
                      <td className="px-4 py-2 font-mono">{s.score}</td>
                      <td className="px-4 py-2 font-mono text-icm-text-dim">{s.date}</td>
                      <td className="px-4 py-2 text-icm-text-dim">{s.scoredBy}</td>
                      <td className="px-4 py-2 text-icm-text-dim">{s.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-icm-accent" />
                <h3 className="font-manrope font-bold text-[13px] text-icm-text">
                  Score history
                </h3>
              </div>
              <p className="text-[11.5px] text-icm-text-dim font-geist">
                {individual.first_name}'s HRST score: <span className="font-mono">2 (2022)</span> ·
                no recent score on file. Annual HRST update is overdue.
              </p>
            </div>
          </div>
        )}
      </div>

      {showSelector && (
        <TemplateSelector
          personId={individual.id}
          onClose={() => setShowSelector(false)}
          onSelect={(tplId, withPrefill) => {
            const newId = `A-${Date.now().toString().slice(-4)}`;
            navigate(
              `/people/${individual.id}/assessments/new?template=${tplId}&prefill=${withPrefill ? 1 : 0}&aid=${newId}`,
            );
          }}
        />
      )}
    </ICMShell>
  );
}

function TemplateSelector({
  personId,
  onClose,
  onSelect,
}: {
  personId: string;
  onClose: () => void;
  onSelect: (templateId: string, withPrefill: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const published = useMemo(
    () =>
      templates
        .filter((t) => t.status === "published")
        .filter((t) => t.name.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  const annual = templates.find((t) => t.id === "tpl-annual");

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-[640px] max-h-[85vh] flex flex-col rounded-xl bg-icm-panel border border-icm-border shadow-elevated">
        <div className="p-4 border-b border-icm-border flex items-center justify-between">
          <div>
            <h2 className="font-manrope font-bold text-[16px] text-icm-text">
              Select Assessment Template
            </h2>
            <p className="text-[11.5px] text-icm-text-dim mt-0.5">
              Pick a published template to begin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {annual && (
            <div className="rounded-xl bg-icm-accent-soft border border-icm-accent/20 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-geist text-icm-text">
                    <span className="font-semibold">AI recommends Annual Reassessment</span> —
                    last assessment was 09/01/2022 (3 years overdue).
                  </p>
                  <button
                    onClick={() => onSelect(annual.id, true)}
                    className="mt-2 h-8 px-3 rounded-lg bg-icm-accent text-white text-[11.5px] font-semibold hover:opacity-90"
                  >
                    Select & pre-fill
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates…"
              className="h-9 w-full pl-8 pr-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] focus:outline-none focus:border-icm-border-strong"
            />
          </div>

          {published.map((t) => {
            const qc = t.sections.reduce((a, s) => a + s.questions.length, 0);
            return (
              <div
                key={t.id}
                className="rounded-xl border border-icm-border bg-icm-bg p-3 flex items-center gap-3"
              >
                <ClipboardList className="w-5 h-5 text-icm-accent" />
                <div className="min-w-0 flex-1">
                  <p className="font-manrope font-bold text-[13px] text-icm-text">{t.name}</p>
                  <p className="text-[11px] text-icm-text-dim mt-0.5">
                    {t.type} · {t.sections.length} sections · {qc} questions ·{" "}
                    {t.estimatedMinutes} min · {t.version}
                  </p>
                </div>
                <button
                  onClick={() => onSelect(t.id, false)}
                  className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90"
                >
                  Select & begin
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
