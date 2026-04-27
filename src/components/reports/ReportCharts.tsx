// SVG-only chart primitives for the Reports module.
import { ChartPoint, StatTone } from "@/data/reports";

const TONE_HSL: Record<StatTone, string> = {
  green: "hsl(var(--icm-green))",
  amber: "hsl(var(--icm-amber))",
  red: "hsl(var(--icm-red))",
  blue: "hsl(var(--icm-accent))",
  neutral: "hsl(var(--icm-text-faint))",
};

function colorFor(tone?: StatTone) {
  return TONE_HSL[tone ?? "blue"];
}

export function BarChart({ data, height = 180 }: { data: ChartPoint[]; height?: number }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100 / data.length;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * 88;
        return (
          <g key={i}>
            <rect
              x={i * w + w * 0.15}
              y={100 - h - 8}
              width={w * 0.7}
              height={h}
              fill={colorFor(d.tone)}
              rx={1}
            />
          </g>
        );
      })}
      {data.map((d, i) => (
        <text
          key={`l-${i}`}
          x={i * w + w / 2}
          y={99}
          fontSize={3}
          textAnchor="middle"
          fill="hsl(var(--icm-text-faint))"
        >
          {d.label.length > 14 ? d.label.slice(0, 12) + "…" : d.label}
        </text>
      ))}
    </svg>
  );
}

export function HBarChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-[11.5px] font-geist text-icm-text-dim truncate">
              {d.label}
            </span>
            <div className="flex-1 h-5 rounded-md bg-icm-bg overflow-hidden">
              <div
                className="h-full rounded-md"
                style={{ width: `${pct}%`, backgroundColor: colorFor(d.tone) }}
              />
            </div>
            <span className="w-12 text-right text-[11.5px] font-mono text-icm-text">
              {d.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ data, size = 180 }: { data: ChartPoint[]; size?: number }) {
  if (!data.length) return <EmptyChart />;
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 200 200" width={size} height={size} className="-rotate-90">
        <circle cx={100} cy={100} r={r} fill="none" stroke="hsl(var(--icm-bg))" strokeWidth={20} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle
              key={i}
              cx={100}
              cy={100}
              r={r}
              fill="none"
              stroke={colorFor(d.tone)}
              strokeWidth={20}
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px] font-geist">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: colorFor(d.tone) }}
            />
            <span className="text-icm-text-dim">{d.label}</span>
            <span className="font-mono text-icm-text">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineChart({ data, height = 180 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 96 + 2;
      const y = 92 - ((d.value - min) / range) * 80;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
      <polyline
        fill="none"
        stroke="hsl(var(--icm-accent))"
        strokeWidth={1.2}
        points={points}
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * 96 + 2;
        const y = 92 - ((d.value - min) / range) * 80;
        return <circle key={i} cx={x} cy={y} r={1.2} fill="hsl(var(--icm-accent))" />;
      })}
      {data.map((d, i) => (
        <text
          key={`l-${i}`}
          x={(i / (data.length - 1 || 1)) * 96 + 2}
          y={99}
          fontSize={3}
          textAnchor="middle"
          fill="hsl(var(--icm-text-faint))"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}

function EmptyChart() {
  return (
    <div className="h-32 rounded-lg border border-dashed border-icm-border flex items-center justify-center text-[11.5px] font-geist text-icm-text-faint">
      No chart data
    </div>
  );
}
