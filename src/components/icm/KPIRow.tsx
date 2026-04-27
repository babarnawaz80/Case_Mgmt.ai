import { Donut, Sparkline } from "./charts";
import { NavLink } from "react-router-dom";

function KpiCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5 hover:border-icm-border-strong hover:shadow-elevated transition-all">
      {children}
    </div>
  );
}

function TrendChip({ value, positive = true }: { value: string; positive?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
        positive ? "bg-icm-green-soft text-icm-green" : "bg-icm-red-soft text-icm-red"
      }`}
    >
      {positive ? "▲" : "▼"} {value}
    </span>
  );
}

export function KPIRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {/* PCP Compliance */}
      <KpiCard>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist">PCP Compliance</p>
            <p className="font-tight text-[26px] font-semibold text-icm-text leading-tight mt-1 tracking-tight">84.2%</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-icm-text-dim">On track</span>
              <TrendChip value="+6.2%" positive />
            </div>
          </div>
          <div className="relative">
            <Donut value={84.2} />
          </div>
        </div>
      </KpiCard>

      {/* My Work */}
      <NavLink to="/my-work" className="rounded-xl border border-icm-border bg-icm-panel p-5 hover:border-icm-border-strong hover:shadow-elevated transition-all block">
        <p className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist">My Work</p>
        <p className="font-tight text-[26px] font-semibold text-icm-text leading-tight mt-1 tracking-tight">14</p>
        <p className="text-[11px] text-icm-text-dim mt-1">3 past due · open list →</p>
        <div className="flex items-center gap-3 mt-3 text-[11px] font-geist">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-icm-red" />Past due</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-icm-amber" />Due soon</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-icm-text-faint" />Open</span>
        </div>
      </NavLink>

      {/* Today's Visits */}
      <KpiCard>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist">Today's Visits</p>
            <p className="font-tight text-[26px] font-semibold text-icm-text leading-tight mt-1 tracking-tight">6</p>
            <p className="text-[11px] text-icm-text-dim mt-1">2 done · 1 in progress</p>
          </div>
          <Sparkline data={[3, 5, 4, 6, 5, 7, 6]} />
        </div>
      </KpiCard>

      {/* Caseload */}
      <KpiCard>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist">Caseload</p>
            <p className="font-tight text-[26px] font-semibold text-icm-text leading-tight mt-1 tracking-tight">48</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-icm-text-dim">2 high-risk · 3 review</span>
              <TrendChip value="+2%" positive />
            </div>
          </div>
          <div className="flex -space-x-2">
            {["KA", "TR", "MS", "JD"].map((init, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-icm-panel bg-icm-bg flex items-center justify-center text-[10px] font-mono font-medium text-icm-text-dim"
                style={{ zIndex: 4 - i }}
              >
                {init}
              </div>
            ))}
          </div>
        </div>
      </KpiCard>
    </div>
  );
}
