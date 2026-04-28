import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { getPerson } from "@/data/people";

interface PersonModulePlaceholderProps {
  moduleName: string;
  icon: LucideIcon;
  description?: string;
}

export function PersonModulePlaceholder({
  moduleName,
  icon: Icon,
  description = "This module is coming soon.",
}: PersonModulePlaceholderProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const personLabel = person ? `${person.lastName}, ${person.firstName}` : "Person";

  return (
    <ICMShell title={moduleName} showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/people")} className="hover:text-icm-text">
            People
          </button>
          <span className="text-icm-text-faint">›</span>
          {person && (
            <>
              <button
                onClick={() => navigate(`/people/${person.id}/echart`)}
                className="hover:text-icm-text"
              >
                {personLabel}
              </button>
              <span className="text-icm-text-faint">›</span>
            </>
          )}
          <span className="text-icm-text font-medium">{moduleName}</span>
        </nav>

        {/* Back link */}
        {person && (
          <button
            onClick={() => navigate(`/people/${person.id}/echart`)}
            className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to eChart
          </button>
        )}

        {/* Centered placeholder */}
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border mx-auto flex items-center justify-center text-icm-text-faint">
            <Icon className="w-8 h-8" />
          </div>
          <h1 className="font-manrope font-bold text-[18px] text-icm-text mt-4 tracking-tight">
            {moduleName}
          </h1>
          <p className="text-[14px] text-icm-text-dim font-geist mt-2 max-w-md mx-auto leading-relaxed">
            {description}
          </p>
          {person && (
            <button
              onClick={() => navigate(`/people/${person.id}/echart`)}
              className="mt-6 h-9 px-4 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to eChart
            </button>
          )}
        </div>
      </div>
    </ICMShell>
  );
}
