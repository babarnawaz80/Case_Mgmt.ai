import { ICMSidebar } from "./Sidebar";
import { ICMTopbar } from "./Topbar";
import { AIPanel } from "./AIPanel";

interface ICMShellProps {
  children: React.ReactNode;
  title?: string;
  showAIPanel?: boolean;
  rightPanel?: React.ReactNode;
}

export function ICMShell({ children, title, showAIPanel = true, rightPanel }: ICMShellProps) {
  // rightPanel takes precedence over the default AIPanel.
  const panel = rightPanel ?? (showAIPanel ? <AIPanel /> : null);
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
