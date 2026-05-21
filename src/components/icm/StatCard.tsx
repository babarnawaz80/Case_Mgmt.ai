import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode } from "react";

export type StatTone = "neutral" | "red" | "amber" | "accent" | "green";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  icon?: ComponentType<{ className?: string }>;
  /** Small line under the value, e.g. "Apr 20 — May 20" or "Current Individuals". */
  subtext?: ReactNode;
  /** Top-right delta chip, e.g. "+3" or "+1.4%". */
  delta?: { value: string; direction?: "up" | "down" };
  /** Bottom link, e.g. "Open People". */
  link?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

const toneStyles: Record<
  StatTone,
  {
    gradient: string;
    iconText: string;
    valueText: string;
    linkText: string;
    decoration: string;
    deltaText: string;
  }
> = {
  neutral: {
    gradient: "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50/60",
    iconText: "text-icm-accent",
    valueText: "text-icm-text",
    linkText: "text-icm-accent",
    decoration: "bg-sky-200/40",
    deltaText: "text-icm-green",
  },
  accent: {
    gradient: "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50/60",
    iconText: "text-icm-accent",
    valueText: "text-icm-text",
    linkText: "text-icm-accent",
    decoration: "bg-sky-200/40",
    deltaText: "text-icm-green",
  },
  red: {
    gradient: "bg-gradient-to-br from-rose-50 via-red-50 to-orange-50/70",
    iconText: "text-icm-red",
    valueText: "text-icm-text",
    linkText: "text-icm-red",
    decoration: "bg-rose-200/40",
    deltaText: "text-icm-red",
  },
  amber: {
    gradient: "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50/70",
    iconText: "text-icm-amber",
    valueText: "text-icm-text",
    linkText: "text-icm-amber",
    decoration: "bg-amber-200/40",
    deltaText: "text-icm-amber",
  },
  green: {
    gradient: "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50/60",
    iconText: "text-icm-green",
    valueText: "text-icm-green",
    linkText: "text-icm-green",
    decoration: "bg-emerald-200/40",
    deltaText: "text-icm-green",
  },
};

export function StatCard({
  label,
  value,
  tone = "neutral",
  icon: Icon,
  subtext,
  delta,
  link,
  className,
}: StatCardProps) {
  const t = toneStyles[tone];
  const DeltaIcon = delta?.direction === "down" ? TrendingDown : TrendingUp;

  const handleLink = (e: React.MouseEvent) => {
    if (link?.onClick) {
      e.preventDefault();
      link.onClick();
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden p-6 rounded-[1.75rem] border border-white/60",
        "shadow-[0_15px_35px_-12px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.03)]",
        "transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(15,23,42,0.12)]",
        t.gradient,
        className,
      )}
    >
      {/* decorative circle */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-[2px]",
          t.decoration,
        )}
        aria-hidden
      />

      <div className="relative flex items-start justify-between">
        {Icon ? (
          <div
            className={cn(
              "w-11 h-11 rounded-2xl bg-white/90 flex items-center justify-center shadow-sm",
              t.iconText,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        ) : (
          <div />
        )}
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 shadow-sm",
              "text-[11px] font-bold",
              t.deltaText,
            )}
          >
            <DeltaIcon className="w-3 h-3" />
            {delta.value}
          </span>
        )}
      </div>

      <p className="relative mt-5 text-[10px] font-extrabold text-icm-text-faint uppercase tracking-widest">
        {label}
      </p>

      <div className="relative mt-1.5">
        <span
          className={cn(
            "font-manrope text-[44px] font-black leading-none tracking-tighter",
            t.valueText,
          )}
        >
          {value}
        </span>
      </div>

      {subtext && (
        <p className="relative mt-2 text-sm text-icm-text-dim">{subtext}</p>
      )}

      {link && (
        <a
          href={link.href ?? "#"}
          onClick={handleLink}
          className={cn(
            "relative mt-4 inline-flex items-center gap-1 text-sm font-bold",
            "hover:gap-1.5 transition-all",
            t.linkText,
          )}
        >
          {link.label}
          <ArrowUpRight className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

export default StatCard;
