import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { CheckCircle2, Circle, Sparkles, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapItem {
  label: string;
  status: "done" | "planned" | "future";
}

const sections: { title: string; tone: "green" | "accent" | "gray"; items: RoadmapItem[] }[] = [
  {
    title: "Delivered",
    tone: "green",
    items: [
      { label: "AI Chat Assistant", status: "done" },
      { label: "Ambient Listening & Transcription", status: "done" },
      { label: "AI Document Processing & OCR", status: "done" },
      { label: "AI Form Pre-fill", status: "done" },
      { label: "Compliance Agent Auto-Monitor", status: "done" },
      { label: "AI Dashboard Suggestions", status: "done" },
      { label: "Document Search via AI Chat", status: "done" },
      { label: "Care Plan AI Drafting", status: "done" },
    ],
  },
  {
    title: "Q3 2026",
    tone: "accent",
    items: [
      { label: "Phone Call Ambient Listening", status: "planned" },
      { label: "Mobile Offline Capability", status: "planned" },
      { label: "HRST / Intellectability Integration", status: "planned" },
      { label: "EVV Module", status: "planned" },
      { label: "HL7 FHIR R4 Bulk Export", status: "planned" },
      { label: "AI-generated Assessment Summaries", status: "planned" },
    ],
  },
  {
    title: "Q4 2026",
    tone: "gray",
    items: [
      { label: "Predictive Compliance Risk Scoring", status: "future" },
      { label: "Natural Language Report Builder", status: "future" },
      { label: "Provider Portal (family/guardian access)", status: "future" },
      { label: "Multi-language AI Support", status: "future" },
      { label: "AI-powered Caseload Balancing", status: "future" },
    ],
  },
  {
    title: "2027",
    tone: "gray",
    items: [
      { label: "State System Direct Integration (LTSS)", status: "future" },
      { label: "Real-time MCO Data Exchange", status: "future" },
      { label: "Outcome Prediction Modeling", status: "future" },
      { label: "Voice-first Mobile Interface", status: "future" },
    ],
  },
];

const AIRoadmap = () => {
  const navigate = useNavigate();
  return (
    <ICMShell title="AI Roadmap" showAIPanel={false}>
      <div className="space-y-5 max-w-[900px]">
        <div>
          <button
            onClick={() => navigate("/settings/ai")}
            className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text transition-colors inline-flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            AI Settings
          </button>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            AI Roadmap
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist max-w-[640px]">
            Planned AI features and target delivery dates. Roadmap is subject to change.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((s) => (
            <Section key={s.title} title={s.title} tone={s.tone} items={s.items} />
          ))}
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-bg p-3 text-[11.5px] font-geist text-icm-text-dim">
          Roadmap is subject to change. Feature availability depends on licensing tier.
          Contact your account manager for details.
        </div>
      </div>
    </ICMShell>
  );
};

function Section({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "green" | "accent" | "gray";
  items: RoadmapItem[];
}) {
  const headerCls =
    tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "accent"
        ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
        : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <div
        className={cn(
          "px-3 py-2 ring-1 inline-flex items-center gap-1.5 rounded-tl-xl rounded-br-xl text-[11px] font-geist font-bold uppercase tracking-wider",
          headerCls
        )}
      >
        <Sparkles className="w-3 h-3" />
        {title}
      </div>
      <ul className="px-4 py-3 space-y-2">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center gap-2 text-[12.5px] font-geist text-icm-text"
          >
            {it.status === "done" ? (
              <CheckCircle2 className="w-4 h-4 text-icm-green shrink-0" />
            ) : it.status === "planned" ? (
              <Circle className="w-4 h-4 text-icm-accent shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-icm-text-faint shrink-0" />
            )}
            <span className={cn(it.status === "future" && "text-icm-text-dim")}>{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AIRoadmap;
