import { Search, Sparkles, User } from "lucide-react";

interface TopbarProps {
  title?: string;
}

export function ICMTopbar({ title = "iCM Dashboard" }: TopbarProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-14 border-b border-icm-border bg-icm-panel flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 text-[13px] font-geist">
        <span className="font-tight font-semibold text-icm-text">{title}</span>
        <span className="text-icm-text-faint">·</span>
        <span className="text-icm-text-dim">{today}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
          <input
            placeholder="Search people, notes, modules…"
            className="w-[220px] h-8 pl-8 pr-12 rounded-lg bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-icm-text-faint border border-icm-border bg-icm-panel">
            ⌘K
          </kbd>
        </div>
        <button className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity">
          <Sparkles className="w-3.5 h-3.5" />
          Ask AI
        </button>
        <div className="w-8 h-8 rounded-full bg-icm-bg border border-icm-border flex items-center justify-center">
          <User className="w-4 h-4 text-icm-text-dim" />
        </div>
      </div>
    </header>
  );
}
