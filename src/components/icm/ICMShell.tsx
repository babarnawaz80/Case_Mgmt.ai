import { ICMTopbar } from "./Topbar";
import { AIPanel } from "./AIPanel";
import { AIPanelProvider, useAIPanel } from "@/contexts/AIPanelContext";
import { Sparkles, X } from "lucide-react";

interface ICMShellProps {
  children: React.ReactNode;
  title?: string;
  showAIPanel?: boolean;
  rightPanel?: React.ReactNode;
}

function ShellInner({ children, title, showAIPanel = true, rightPanel }: ICMShellProps) {
  const { open, toggle } = useAIPanel();
  const panel = open ? (rightPanel ?? <AIPanel />) : null;
  return (
    <div className="flex flex-col h-screen w-full bg-icm-bg font-geist text-icm-text relative">
      {/* Skip navigation — WCAG 2.4.1 Level A */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-purple-700 focus:border-2 focus:border-purple-600 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <ICMTopbar title={title} />
      <div className="flex-1 flex min-h-0">
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-3 sm:p-6 focus:outline-none">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
        {panel}
      </div>

      {showAIPanel && (
        <button
          onClick={toggle}
          title={open ? "Close Case Management AI" : "Open Case Management AI"}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full ai-gradient text-white flex items-center justify-center shadow-elevated hover:scale-105 active:scale-95 transition-all duration-200"
        >
          {open ? <X className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
        </button>
      )}
    </div>
  );
}

export function ICMShell(props: ICMShellProps) {
  return (
    <AIPanelProvider>
      <ShellInner {...props} />
    </AIPanelProvider>
  );
}
