import { ICMSidebar } from "./Sidebar";
import { ICMTopbar } from "./Topbar";
import { AIPanel } from "./AIPanel";
import { AIPanelProvider, useAIPanel } from "@/contexts/AIPanelContext";

interface ICMShellProps {
  children: React.ReactNode;
  title?: string;
  showAIPanel?: boolean;
  rightPanel?: React.ReactNode;
}

function ShellInner({ children, title, showAIPanel = true, rightPanel }: ICMShellProps) {
  const { open } = useAIPanel();
  // Ask AI button always opens a panel — falls back to the generic AIPanel when no page-specific one is provided.
  const panel = open ? (rightPanel ?? <AIPanel />) : null;
  return (
    <div className="flex h-screen w-full bg-icm-bg font-geist text-icm-text">
      <ICMSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ICMTopbar title={title} />
        <div className="flex-1 flex min-h-0">
          <main className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="max-w-[1200px] mx-auto">{children}</div>
          </main>
          {panel}
        </div>
      </div>
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
