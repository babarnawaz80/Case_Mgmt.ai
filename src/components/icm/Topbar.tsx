import { Search, Sparkles, Bell, HelpCircle, ChevronDown, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import brandLogo from "@/assets/casemanagement-ai-logo.jpg";
import { useRole } from "@/contexts/RoleContext";

interface TopbarProps {
  title?: string;
}

export function ICMTopbar({ title = "iCM Dashboard" }: TopbarProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-14 border-b border-icm-border bg-icm-panel flex items-center justify-between px-6 shrink-0">
      {/* Left: brand + title */}
      <div className="flex items-center gap-3">
        <img
          src={brandLogo}
          alt="CaseManagement AI by iCareManager"
          className="h-7 w-auto object-contain"
        />
        <span className="w-px h-5 bg-icm-border" />
        <div className="flex items-center gap-2 text-[13px] font-geist">
          <span className="font-tight font-semibold text-icm-text">{title}</span>
          <span className="text-icm-text-faint">·</span>
          <span className="text-icm-text-dim">{today}</span>
        </div>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
          <input
            placeholder="Search people, notes, modules…"
            className="w-[240px] h-9 pl-8 pr-12 rounded-xl bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 focus:bg-icm-panel transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-icm-text-faint border border-icm-border bg-icm-panel">
            ⌘K
          </kbd>
        </div>

        {/* Gradient AI button (borrowed from IDDBilling) */}
        <button className="h-9 px-3.5 rounded-xl text-white text-[12px] font-manrope font-bold flex items-center gap-1.5 ai-gradient shadow-elevated hover:opacity-95 hover:-translate-y-px active:translate-y-0 transition-all">
          <Sparkles className="w-3.5 h-3.5" />
          Ask AI
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate("/platform")}
            title="Agents Platform"
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text-dim text-[12px] font-geist font-medium flex items-center gap-1.5 hover:text-icm-text hover:border-icm-border-strong transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Platform
          </button>
        )}

        <div className="w-px h-5 bg-icm-border mx-1" />

        {/* Notification cluster */}
        <button className="relative h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1 right-1 h-[16px] min-w-[16px] px-1 flex items-center justify-center rounded-full bg-icm-red text-white text-[9px] font-mono font-bold">
            5
          </span>
        </button>
        <button className="h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors">
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>

        <button className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-icm-bg transition-colors">
          <div className="w-7 h-7 rounded-full bg-icm-accent-soft border border-icm-accent/20 flex items-center justify-center text-[10px] font-mono font-bold text-icm-accent">
            KA
          </div>
          <ChevronDown className="w-3 h-3 text-icm-text-faint" />
        </button>
      </div>
    </header>
  );
}
