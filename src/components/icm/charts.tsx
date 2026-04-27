interface DonutProps {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}

export function Donut({ value, size = 56, stroke = 6, color = "hsl(var(--icm-green))", trackColor = "hsl(var(--icm-border))" }: DonutProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

interface SparkProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}

export function Sparkline({ data, width = 120, height = 40, color = "hsl(var(--icm-accent))", fill = "hsl(var(--icm-accent-soft))" }: SparkProps) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
