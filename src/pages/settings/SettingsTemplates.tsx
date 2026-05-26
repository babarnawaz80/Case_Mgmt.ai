import { FileText, Plus, Sparkles } from "lucide-react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

/**
 * SettingsTemplates — Case Management Templates configuration.
 * Allows admins to create, edit, and manage case management workflow templates.
 */
export default function SettingsTemplates() {
  return (
    <SettingsLayout
      title="Case Management Templates"
      subtitle="Create and manage workflow templates applied to individuals' case management plans."
    >
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[13px] text-icm-text-dim font-geist">
              Templates define the set of tasks and milestones for each individual's care coordination workflow.
            </p>
          </div>
          <button className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New Template
          </button>
        </div>

        {/* AI banner */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">AI Template Suggestions.</span>{" "}
              <span className="text-icm-text-dim">
                The platform can suggest template tasks based on waiver type, level of care, and state guidelines.
              </span>
            </p>
          </div>
        </div>

        {/* Empty state */}
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-bg/40 px-6 py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-icm-accent-soft border border-icm-accent/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-5 h-5 text-icm-accent" />
          </div>
          <h3 className="font-manrope font-bold text-[15px] text-icm-text mb-1">
            No Templates Yet
          </h3>
          <p className="text-[13px] text-icm-text-dim font-geist max-w-sm mx-auto">
            Create your first case management template to standardize tasks and timelines across your caseload.
          </p>
          <button className="mt-5 h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 mx-auto">
            <Plus className="w-3.5 h-3.5" />
            Create First Template
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
