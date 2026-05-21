import { Search, Sparkles, HelpCircle, ChevronDown, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import brandLogo from "@/assets/casemanagement-logo.png";
import { demoToast } from "@/lib/demoToast";
import { useRole } from "@/contexts/RoleContext";
import { useAIPanel } from "@/contexts/AIPanelContext";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";

interface TopbarProps {
  title?: string;
}

export function ICMTopbar({ title = "iCM Dashboard" }: TopbarProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { toggle: toggleAI, open: aiOpen } = useAIPanel();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-14 border-b border-icm-border bg-icm-panel flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      {/* Left: brand + title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <img
          src={brandLogo}
          alt="CaseManagement AI by iCareManager"
          className="h-7 w-auto object-contain shrink-0"
        />
        <span className="hidden sm:block w-px h-5 bg-icm-border" />
        <div className="hidden sm:flex items-center gap-2 text-[13px] font-geist min-w-0">
          <span className="font-tight font-semibold text-icm-text truncate">{title}</span>
          <span className="text-icm-text-faint hidden md:inline">·</span>
          <span className="text-icm-text-dim hidden md:inline">{today}</span>
        </div>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
          <input
            placeholder="Search people, notes, modules…"
            className="w-[200px] xl:w-[240px] h-9 pl-8 pr-12 rounded-xl bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 focus:bg-icm-panel transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-icm-text-faint border border-icm-border bg-icm-panel">
            ⌘K
          </kbd>
        </div>

        {/* Mobile-only search icon */}
        <button
          onClick={() => demoToast("Mobile search")}
          className="md:hidden h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors"
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* Gradient AI button (borrowed from IDDBilling) */}
        <button
          onClick={toggleAI}
          aria-pressed={aiOpen}
          className="h-9 px-2.5 sm:px-3.5 rounded-xl text-white text-[12px] font-manrope font-bold flex items-center gap-1.5 ai-gradient shadow-elevated hover:opacity-95 hover:-translate-y-px active:translate-y-0 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask AI</span>
          <ChevronDown className={`w-3 h-3 opacity-70 hidden sm:inline transition-transform ${aiOpen ? "rotate-180" : ""}`} />
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate("/platform")}
            title="Platform"
            className="hidden md:flex h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text-dim text-[12px] font-geist font-medium items-center gap-1.5 hover:text-icm-text hover:border-icm-border-strong transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Platform
          </button>
        )}

        <div className="hidden sm:block w-px h-5 bg-icm-border mx-1" />

        {/* Notifications dropdown (alerts + mentions) */}
        <NotificationsBell />
        <button
          onClick={() => demoToast("Help & documentation")}
          className="hidden sm:flex h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg items-center justify-center transition-colors"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-1.5 pl-1 pr-1 sm:pr-2 py-1 rounded-xl hover:bg-icm-bg transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-icm-accent-soft border border-icm-accent/20 flex items-center justify-center text-[10px] font-mono font-bold text-icm-accent">
            KA
          </div>
          <ChevronDown className="w-3 h-3 text-icm-text-faint hidden sm:inline" />
        </button>
      </div>
    </header>
  );
}
